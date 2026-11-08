from fastapi import APIRouter
from app.services.ollama_client import status
from app.core.config import settings

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "service": "fashfolio-python", "version": "2.0.0"}


@router.get("/integrations")
async def integrations():
    return {
        "ollama": await status(),
        "pinterest": {
            "configured": bool(settings.pinterest_token),
            "scope": "user_pins",
        },
        "danbooru": {
            "configured": True,
            "authenticated": bool(
                settings.danbooru_login and settings.danbooru_api_key
            ),
        },
    }
