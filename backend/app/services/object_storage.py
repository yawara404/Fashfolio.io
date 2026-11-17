"""Private R2 objects. Credentials and raw browser vault tokens never enter object keys."""
from functools import lru_cache
from hashlib import sha256
from pathlib import Path
import re
from fastapi import HTTPException
from app.core.config import settings

MODEL_SIZES = {
    "text": 681393168,
    "unet": 1733430199,
    "vae": 99094314,
    "encoder": 68430468,
}


def _validated_r2_client(connect_timeout: int = 3, read_timeout: int = 8, max_attempts: int = 1):
    if not settings.r2_configured:
        raise HTTPException(503, "Cloud storage is not configured")
    if not re.fullmatch(r"[a-f0-9]{32}", settings.r2_account_id) or not re.fullmatch(r"[a-z0-9][a-z0-9/-]{0,100}", settings.r2_prefix):
        raise HTTPException(503, "Cloud storage configuration is invalid")
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            connect_timeout=connect_timeout,
            read_timeout=read_timeout,
            retries={"max_attempts": max_attempts},
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
    )


@lru_cache(maxsize=1)
def r2_client():
    return _validated_r2_client()


@lru_cache(maxsize=1)
def r2_transfer_client():
    return _validated_r2_client(connect_timeout=10, read_timeout=60, max_attempts=3)


def private_key(vault: str | None, suffix: str, cache: bool = False) -> str:
    if not vault or not re.fullmatch(r"[a-f0-9]{64}", vault):
        raise HTTPException(401, "A valid browser vault is required")
    owner = sha256(vault.encode()).hexdigest()
    directory = "cache/poses" if cache else "private"
    return f"{settings.r2_prefix}/{directory}/{owner}/{suffix}"


def user_key(user_id: str, suffix: str, cache: bool = False) -> str:
    cleaned = str(user_id or "").strip()
    if not cleaned or len(cleaned) > 128:
        raise HTTPException(401, "A valid account is required")
    owner = sha256(f"reflens:{cleaned}".encode()).hexdigest()
    directory = "cache/poses" if cache else "users"
    return f"{settings.r2_prefix}/{directory}/{owner}/{suffix}"


def get_object(key: str):
    from botocore.exceptions import ClientError
    try:
        return r2_client().get_object(Bucket=settings.r2_bucket_name, Key=key)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in ("NoSuchKey", "NotFound", "404"):
            return None
        raise HTTPException(503, "Cloud storage is temporarily unavailable") from None


def head_object(key: str):
    from botocore.exceptions import ClientError
    try:
        return r2_client().head_object(Bucket=settings.r2_bucket_name, Key=key)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if code in ("NoSuchKey", "NotFound", "404") or status == 404:
            return None
        raise HTTPException(503, "Cloud storage is temporarily unavailable") from None


def model_object_key(revision: str, name: str) -> str:
    if not re.fullmatch(r"[a-f0-9]{40}", revision) or name not in MODEL_SIZES:
        raise HTTPException(404, "Unknown model")
    return f"{settings.r2_prefix}/models/{revision}/{name}.onnx"


def upload_model_file(revision: str, name: str, file_path: Path) -> dict:
    key = model_object_key(revision, name)
    expected_size = MODEL_SIZES[name]
    if not file_path.is_file() or file_path.stat().st_size != expected_size:
        raise HTTPException(422, "Invalid cached model size")
    existing = head_object(key)
    if existing and existing.get("ContentLength") == expected_size:
        return {"saved": True, "already_exists": True, "size": expected_size, "key": key}
    from boto3.s3.transfer import TransferConfig
    config = TransferConfig(
        multipart_threshold=16 * 1024 * 1024,
        multipart_chunksize=16 * 1024 * 1024,
        max_concurrency=3,
    )
    r2_transfer_client().upload_file(
        str(file_path),
        settings.r2_bucket_name,
        key,
        ExtraArgs={"ContentType": "application/octet-stream"},
        Config=config,
    )
    return {"saved": True, "already_exists": False, "size": expected_size, "key": key}


def model_url(revision: str, name: str) -> str:
    return r2_client().generate_presigned_url("get_object", Params={
        "Bucket": settings.r2_bucket_name,
        "Key": model_object_key(revision, name),
    }, ExpiresIn=900)
