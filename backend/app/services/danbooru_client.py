import re
from urllib.parse import urljoin

import httpx

from app.core.config import settings

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
TAG_PATTERN = re.compile(r"[a-z0-9_-]{1,80}")
DEFAULT_LIMIT = 12


def _safe_tag(tag: str) -> str:
    """Return one garment tag; metatags such as rating:e are dropped."""
    for token in tag.lower().split():
        if TAG_PATTERN.fullmatch(token):
            return token
    return "blouse"


def _auth() -> tuple[str, str] | None:
    if settings.danbooru_login and settings.danbooru_api_key:
        return (settings.danbooru_login, settings.danbooru_api_key)
    return None


def _normalize(post: dict, token: str) -> dict | None:
    """Convert an upstream post into the small shape the browser needs."""
    if not isinstance(post, dict):
        return None
    if post.get("rating") != "g":
        return None
    if post.get("is_deleted") or post.get("is_banned"):
        return None

    extension = str(post.get("file_ext") or "").lower()
    if extension and extension not in ALLOWED_EXTENSIONS:
        return None

    preview = post.get("preview_file_url") or post.get("large_file_url")
    post_id = post.get("id")
    if not preview or not post_id:
        return None

    return {
        "id": f"danbooru-{post_id}",
        "source": "danbooru",
        "title": f"{token.replace('_', ' ')} #{post_id}",
        "url": f"{settings.danbooru_base_url}/posts/{post_id}",
        "thumbnail": urljoin(f"{settings.danbooru_base_url}/", preview),
        "credit": post.get("tag_string_artist") or "Danbooru",
        "tags": (
            post.get("tag_string_general") or post.get("tag_string") or ""
        ).split()[:20],
    }


async def search(
    tag: str,
    page: int = 1,
    client: httpx.AsyncClient | None = None,
    limit: int = DEFAULT_LIMIT,
) -> dict:
    # Accept one garment tag. Neither text input nor model output can override rating:g.
    token = _safe_tag(tag)
    page = max(1, min(page, 1000))
    limit = max(1, min(limit, 50))

    # Fetch one extra post so has_more reflects the raw upstream result,
    # not the filtered list.
    params = {
        "tags": f"{token} rating:g",
        "limit": limit + 1,
        "page": page,
    }
    headers = {
        "User-Agent": "Fashfolio/2.0 (costume reference tool)",
        "Accept": "application/json",
    }

    async def execute(http: httpx.AsyncClient) -> tuple[list[dict], bool]:
        response = await http.get(
            f"{settings.danbooru_base_url}/posts.json",
            params=params,
            auth=_auth(),
            headers=headers,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError("Invalid response")
        items = [
            item
            for post in payload
            if (item := _normalize(post, token)) is not None
        ]
        return items[:limit], len(payload) > limit

    try:
        if client is not None:
            items, has_more = await execute(client)
        else:
            async with httpx.AsyncClient(
                timeout=settings.danbooru_timeout,
                follow_redirects=True,
            ) as http:
                items, has_more = await execute(http)
        return {
            "source": "danbooru",
            "status": "connected",
            "items": items,
            "message": None,
            "page": page,
            "has_more": has_more,
        }
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        message = (
            "Danbooruへのアクセスが集中しています。少し待って再試行してください。"
            if status == 429
            else "Danbooruの認証情報またはアクセス権限を確認してください。"
            if status in (401, 403)
            else "Danbooru APIに接続できません。資料リンクから検索できます。"
        )
        return {
            "source": "danbooru",
            "status": "unavailable",
            "items": [],
            "message": message,
            "page": page,
            "has_more": False,
        }
    except (httpx.HTTPError, ValueError, TypeError, KeyError, AttributeError):
        return {
            "source": "danbooru",
            "status": "unavailable",
            "items": [],
            "message": "Danbooru APIに接続できません。資料リンクから検索できます。",
            "page": page,
            "has_more": False,
        }
