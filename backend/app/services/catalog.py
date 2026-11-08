import json
from functools import lru_cache
from fastapi import HTTPException
from app.core.config import BACKEND_DIR
from app.models.outfit import Garment

CATEGORIES = [
    {"id": "tops", "name": "トップス", "en": "TOPS"},
    {"id": "outer", "name": "アウター", "en": "OUTER"},
    {"id": "bottoms", "name": "ボトムス", "en": "BOTTOMS"},
    {"id": "shoes", "name": "シューズ", "en": "SHOES"},
    {"id": "head", "name": "帽子・ヘア小物", "en": "ACCESSORIES"},
    {"id": "bag", "name": "バッグ", "en": "BAGS"},
    {"id": "jewelry", "name": "ジュエリー", "en": "JEWELRY"},
]
STYLES = [
    {"id": "girly", "name": "ガーリー", "en": "Girly"},
    {"id": "casual", "name": "カジュアル", "en": "Casual"},
    {"id": "classic", "name": "クラシック", "en": "Classic"},
    {"id": "street", "name": "ストリート", "en": "Street"},
    {"id": "fantasy", "name": "ファンタジー", "en": "Fantasy"},
]
PALETTES = [
    {
        "id": "petal",
        "name": "Petal & mist",
        "colors": ["#E8BFCB", "#FAF7EF", "#BECDE0", "#B7ADC8", "#555164"],
        "names": ["dusty pink", "ivory", "powder blue", "lavender", "charcoal"],
    },
    {
        "id": "sage",
        "name": "Sage morning",
        "colors": ["#B9C9B3", "#F5F0E4", "#D2BBA2", "#DDD9CF", "#5C6357"],
        "names": ["sage green", "ivory", "sand beige", "light gray", "olive gray"],
    },
    {
        "id": "classic",
        "name": "Library afternoon",
        "colors": ["#68474F", "#F6EDD9", "#B3A092", "#A0B0C0", "#303746"],
        "names": ["burgundy", "cream", "taupe", "dusty blue", "navy"],
    },
    {
        "id": "mono",
        "name": "Midnight ink",
        "colors": ["#30333C", "#EBEBE8", "#AAB1BE", "#747B8F", "#B2A2C8"],
        "names": ["charcoal", "off white", "silver gray", "slate", "muted violet"],
    },
    {
        "id": "sky",
        "name": "Blue lemonade",
        "colors": ["#A9CFE1", "#FFF1AF", "#F9F8F3", "#C3D8CA", "#6B7E91"],
        "names": ["sky blue", "pale yellow", "white", "mint green", "steel blue"],
    },
]


@lru_cache
def garments() -> list[Garment]:
    return [
        Garment.model_validate(item)
        for item in json.loads((BACKEND_DIR / "data/catalog.json").read_text())
    ]


def resolve_items(ids: list[str], allow_empty: bool = False, custom_items: list[Garment] | None = None) -> list[Garment]:
    catalog = {item.id: item for item in garments()}
    for item in custom_items or []:
        if not item.id.startswith("local-") or item.id in catalog:
            raise HTTPException(422, "Custom garments must have unique local IDs")
        catalog[item.id] = item
    if any(id not in catalog for id in ids):
        raise HTTPException(422, "Unknown garment ID")
    selected = [catalog[id] for id in dict.fromkeys(ids)]
    if not selected and not allow_empty:
        raise HTTPException(422, "衣装パーツを1つ以上選んでください。")
    if len({item.category for item in selected}) != len(selected):
        raise HTTPException(422, "各部位から選べるアイテムは1つです。")
    return selected
