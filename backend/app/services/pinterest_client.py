import httpx
from app.core.config import settings


async def search(
    query: str, client: httpx.AsyncClient | None = None, token: str | None = None
) -> dict:
    access_token = settings.pinterest_token if token is None else token
    if not access_token:
        return {
            "source": "pinterest",
            "status": "not_configured",
            "items": [],
            "message": "Pinterest APIは未接続です。Web検索リンクはそのまま使えます。",
        }

    async def execute(http):
        response = await http.get(
            "https://api.pinterest.com/v5/search/pins",
            params={"query": query},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        data = response.json()
        items = []
        for pin in data.get("items", [])[:20]:
            images = (pin.get("media") or {}).get("images") or {}
            image = (
                images.get("400x300")
                or images.get("600x")
                or next(iter(images.values()), {})
            )
            items.append(
                {
                    "id": f'pinterest-{pin["id"]}',
                    "source": "pinterest",
                    "title": pin.get("title") or query,
                    "url": f'https://www.pinterest.com/pin/{pin["id"]}/',
                    "thumbnail": image.get("url"),
                    "credit": "Pinterest",
                    "tags": [],
                }
            )
        return items

    try:
        if client is not None:
            items = await execute(client)
        else:
            async with httpx.AsyncClient(timeout=8, follow_redirects=False) as http:
                items = await execute(http)
        return {
            "source": "pinterest",
            "status": "connected",
            "items": items,
            "message": "連携アカウントのPinを検索しています。",
        }
    except httpx.HTTPStatusError as exc:
        message = (
            "PinterestのトークンまたはAPI利用権限を確認してください。"
            if exc.response.status_code in (401, 403)
            else "Pinterest APIが応答しません。Web検索リンクをご利用ください。"
        )
        return {
            "source": "pinterest",
            "status": "unavailable",
            "items": [],
            "message": message,
        }
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        return {
            "source": "pinterest",
            "status": "unavailable",
            "items": [],
            "message": "Pinterest APIに接続できません。Web検索リンクをご利用ください。",
        }
