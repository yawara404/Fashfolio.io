import asyncio
from collections import OrderedDict
import json
import math
import re
import struct
import time
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from starlette.concurrency import run_in_threadpool
from app.core.config import settings
from app.services.object_storage import r2_client, private_key, get_object, model_url

router = APIRouter(prefix="/storage")
IMAGE_LIMIT = 8 * 1024 * 1024
DOCUMENT_LIMIT = 512 * 1024
_upload_bytes = 0
_upload_day = 0
_requests: OrderedDict[str, list[float]] = OrderedDict()
_gate = asyncio.Lock()


def enabled():
    if not settings.r2_configured:
        raise HTTPException(503, "Cloud storage is not configured")


def key_for(request: Request, suffix: str, cache: bool = False):
    enabled()
    return private_key(request.headers.get("x-fashfolio-vault"), suffix, cache)


def rate_limit(request: Request):
    now = time.monotonic()
    # A hard per-process write ceiling also limits anonymous public-demo uploads.
    address = request.client.host if request.client else "unknown"
    recent = [stamp for stamp in _requests.get(address, []) if now - stamp < 60]
    if len(recent) >= 60:
        raise HTTPException(429, "Too many cloud uploads; retry later", headers={"Retry-After": "60"})
    recent.append(now)
    _requests[address] = recent
    _requests.move_to_end(address)
    while len(_requests) > 1000:
        _requests.popitem(last=False)


async def limited_body(request: Request, limit: int):
    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > limit:
            raise HTTPException(413, "Cloud object exceeds the size limit")
        chunks.append(chunk)
    return b"".join(chunks)


async def put(key: str, body: bytes, content_type: str, metadata=None):
    global _upload_bytes, _upload_day
    async with _gate:
        day = int(time.time() // 86400)
        if day != _upload_day:
            _upload_day, _upload_bytes = day, 0
        if _upload_bytes + len(body) > max(1, settings.r2_daily_upload_mb) * 1024 * 1024:
            raise HTTPException(429, "Daily cloud upload limit reached")
        _upload_bytes += len(body)
    try:
        await run_in_threadpool(lambda: r2_client().put_object(Bucket=settings.r2_bucket_name, Key=key,
            Body=body, ContentType=content_type, CacheControl="private, max-age=86400" if content_type == "image/png" else "no-store", Metadata=metadata or {}))
    except Exception:
        raise HTTPException(503, "Cloud save failed; the local copy is unchanged") from None


@router.get("/status")
async def status(check: bool = False):
    result = {"configured": settings.r2_configured, "provider": "r2" if settings.r2_configured else "local", "connected": None}
    if check and settings.r2_configured:
        try:
            await run_in_threadpool(lambda: r2_client().head_bucket(Bucket=settings.r2_bucket_name))
            result["connected"] = True
        except Exception:
            result["connected"] = False
    return result


@router.get("/workspace")
async def read_workspace(request: Request):
    key = key_for(request, "workspace.json")
    try:
        record = await run_in_threadpool(get_object, key)
        if record is None:
            return Response(status_code=404, headers={"Cache-Control": "no-store"})
        def read():
            try:
                return record["Body"].read(DOCUMENT_LIMIT + 1)
            finally:
                record["Body"].close()
        body = await run_in_threadpool(read)
        if len(body) > DOCUMENT_LIMIT:
            raise ValueError("oversized document")
        return Response(body, media_type="application/json", headers={"Cache-Control": "no-store"})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "Cloud workspace is temporarily unavailable") from None


@router.put("/workspace")
async def write_workspace(request: Request):
    key = key_for(request, "workspace.json")
    rate_limit(request)
    body = await limited_body(request, DOCUMENT_LIMIT)
    try:
        data = json.loads(body)
        if not isinstance(data, dict) or data.get("version") != 1 or not isinstance(data.get("garments", []), list) or len(data.get("garments", [])) > 100:
            raise ValueError()
    except (ValueError, UnicodeError):
        raise HTTPException(422, "Invalid workspace document") from None
    await put(key, body, "application/json")
    return {"saved": True}


def asset_key(request: Request, digest: str, cache: bool = False):
    if not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise HTTPException(404, "Unknown asset")
    return key_for(request, f"assets/{digest}.png", cache)


@router.put("/assets/{digest}")
async def write_asset(digest: str, request: Request, cache: bool = False):
    key = asset_key(request, digest, cache)
    rate_limit(request)
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "image/png":
        raise HTTPException(415, "Only PNG images can be cached")
    body = await limited_body(request, IMAGE_LIMIT)
    if len(body) < 24 or body[:8] != b"\x89PNG\r\n\x1a\n" or body[12:16] != b"IHDR":
        raise HTTPException(422, "Invalid PNG image")
    width, height = struct.unpack(">II", body[16:24])
    if not (0 < width <= 4096 and 0 < height <= 4096):
        raise HTTPException(422, "Image dimensions are out of range")
    metadata = {}
    raw_bounds = request.headers.get("x-fashfolio-bounds")
    if raw_bounds:
        try:
            bounds = json.loads(raw_bounds)
            if len(raw_bounds) > 200 or not isinstance(bounds, dict) or set(bounds) != {"x", "y", "width", "height"} or not all(type(n) in (int, float) and math.isfinite(n) and abs(n) < 10000 for n in bounds.values()) or bounds["width"] <= 0 or bounds["height"] <= 0:
                raise ValueError()
            metadata["bounds"] = json.dumps(bounds, separators=(",", ":"))
        except (ValueError, TypeError):
            raise HTTPException(422, "Invalid pose bounds") from None
    await put(key, body, "image/png", metadata)
    return {"saved": True}


@router.get("/assets/{digest}")
async def read_asset(digest: str, request: Request, cache: bool = False):
    key = asset_key(request, digest, cache)
    try:
        record = await run_in_threadpool(get_object, key)
        if record is None:
            return Response(status_code=404)
        def read():
            try:
                return record["Body"].read(IMAGE_LIMIT + 1)
            finally:
                record["Body"].close()
        body = await run_in_threadpool(read)
        if len(body) > IMAGE_LIMIT:
            raise ValueError("oversized image")
        headers = {"Cache-Control": "private, max-age=86400", "Vary": "X-Fashfolio-Vault", "X-Content-Type-Options": "nosniff"}
        if record.get("Metadata", {}).get("bounds"):
            headers["X-Fashfolio-Bounds"] = record["Metadata"]["bounds"]
        return Response(body, media_type="image/png", headers=headers)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "Cloud image is temporarily unavailable") from None


@router.delete("/assets/{digest}")
async def delete_asset(digest: str, request: Request, cache: bool = False):
    key = asset_key(request, digest, cache)
    rate_limit(request)
    try:
        await run_in_threadpool(lambda: r2_client().delete_object(Bucket=settings.r2_bucket_name, Key=key))
        return {"deleted": True}
    except Exception:
        raise HTTPException(503, "Cloud deletion failed") from None


@router.get("/models/{revision}/{name}")
def model(revision: str, name: str):
    enabled()
    # The Nuxt model proxy follows this on the server; the private bucket stays private.
    return RedirectResponse(model_url(revision, name), status_code=307, headers={"Cache-Control": "no-store"})
