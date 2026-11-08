from fastapi import APIRouter
from app.services.catalog import garments, CATEGORIES, STYLES, PALETTES

router = APIRouter()


@router.get("/catalog")
def catalog():
    return {
        "items": garments(),
        "categories": CATEGORIES,
        "styles": STYLES,
        "palettes": PALETTES,
    }
