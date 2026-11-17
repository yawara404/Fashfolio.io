"""Private R2 objects. Credentials and raw browser vault tokens never enter object keys."""
from functools import lru_cache
from hashlib import sha256
import re
from fastapi import HTTPException
from app.core.config import settings


@lru_cache(maxsize=1)
def r2_client():
    if not settings.r2_configured:
        raise HTTPException(503, "Cloud storage is not configured")
    if not re.fullmatch(r"[a-f0-9]{32}", settings.r2_account_id) or not re.fullmatch(r"[a-z0-9][a-z0-9/-]{0,100}", settings.r2_prefix):
        raise HTTPException(503, "Cloud storage configuration is invalid")
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3", endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id, aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto", config=Config(signature_version="s3v4", connect_timeout=3, read_timeout=8,
            retries={"max_attempts": 1}, request_checksum_calculation="when_required", response_checksum_validation="when_required"),
    )


def private_key(vault: str | None, suffix: str, cache: bool = False) -> str:
    if not vault or not re.fullmatch(r"[a-f0-9]{64}", vault):
        raise HTTPException(401, "A valid browser vault is required")
    owner = sha256(vault.encode()).hexdigest()
    directory = "cache/poses" if cache else "private"
    return f"{settings.r2_prefix}/{directory}/{owner}/{suffix}"


def get_object(key: str):
    from botocore.exceptions import ClientError
    try:
        return r2_client().get_object(Bucket=settings.r2_bucket_name, Key=key)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in ("NoSuchKey", "NotFound", "404"):
            return None
        raise HTTPException(503, "Cloud storage is temporarily unavailable") from None


def model_url(revision: str, name: str) -> str:
    if not re.fullmatch(r"[a-f0-9]{40}", revision) or name not in ("text", "unet", "vae", "encoder"):
        raise HTTPException(404, "Unknown model")
    return r2_client().generate_presigned_url("get_object", Params={
        "Bucket": settings.r2_bucket_name,
        "Key": f"{settings.r2_prefix}/models/{revision}/{name}.onnx",
    }, ExpiresIn=900)
