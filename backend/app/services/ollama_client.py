import asyncio
import json
import httpx
from pydantic import BaseModel
from app.core.config import settings

_gate = asyncio.Semaphore(1)


class OllamaUnavailable(Exception):
    pass


async def structured(system: str, data: dict, schema: type[BaseModel]) -> BaseModel:
    try:
        async with _gate:
            async with httpx.AsyncClient(
                timeout=settings.ollama_timeout, trust_env=False
            ) as client:
                response = await client.post(
                    settings.ollama_base_url + "/api/chat",
                    json={
                        "model": settings.ollama_model,
                        "stream": False,
                        "think": False,
                        "format": schema.model_json_schema(),
                        "messages": [
                            {
                                "role": "system",
                                "content": system
                                + " Return only JSON matching: "
                                + json.dumps(schema.model_json_schema()),
                            },
                            {
                                "role": "user",
                                "content": json.dumps(data, ensure_ascii=False),
                            },
                        ],
                        "options": {"temperature": 0.25, "num_predict": 1000},
                    },
                )
                response.raise_for_status()
                return schema.model_validate_json(response.json()["message"]["content"])
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        raise OllamaUnavailable(
            "Ollamaに接続できないか、応答を読み取れませんでした。"
        ) from exc


async def status() -> dict:
    try:
        async with httpx.AsyncClient(timeout=2, trust_env=False) as client:
            response = await client.get(settings.ollama_base_url + "/api/tags")
            response.raise_for_status()
            models = [m["name"] for m in response.json().get("models", [])]
            return {
                "connected": True,
                "ready": settings.ollama_model in models,
                "model": settings.ollama_model,
                "models": models,
            }
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return {
            "connected": False,
            "ready": False,
            "model": settings.ollama_model,
            "models": [],
        }
