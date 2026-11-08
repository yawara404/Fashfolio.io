import asyncio
from typing import Literal
from fastapi import APIRouter, Query
from app.services.catalog import resolve_items
from app.services import danbooru_client, pinterest_client

router = APIRouter()


@router.get("/references")
async def references(
    item_id: str,
    source: Literal["all", "danbooru", "pinterest"] = "all",
    page: int = Query(1, ge=1, le=100),
):
    item = resolve_items([item_id])[0]
    jobs = []
    if source in ("all", "danbooru"):
        jobs.append(danbooru_client.search(item.tags[0], page))
    if source in ("all", "pinterest"):
        jobs.append(pinterest_client.search(item.name_en))
    return {"providers": await asyncio.gather(*jobs)}
