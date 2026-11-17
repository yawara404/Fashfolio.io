from enum import StrEnum
from pydantic import BaseModel, Field, field_validator


class Category(StrEnum):
    inner = "inner"
    underwear = "underwear"
    socks = "socks"
    tops = "tops"
    outer = "outer"
    bottoms = "bottoms"
    shoes = "shoes"
    head = "head"
    bag = "bag"
    jewelry = "jewelry"


class Garment(BaseModel):
    id: str
    name: str
    name_en: str
    category: Category
    audience: str = Field(default="unisex", pattern="^(mens|womens|unisex)$")
    kind: str
    description: str
    material: str
    material_en: str
    tags: list[str]
    styles: list[str]
    colors: list[str]


class OutfitRequest(BaseModel):
    item_ids: list[str] = Field(default_factory=list, max_length=10)
    custom_items: list[Garment] = Field(default_factory=list, max_length=10)
    palette: list[str] = Field(default_factory=list, max_length=5)
    title: str = Field(default="My coordinate", max_length=100)
    notes: str = Field(default="", max_length=1000)
    style: str = Field(default="girly", max_length=40)
    use_ai: bool = False
    garment_colors: dict[str, list[str]] = Field(default_factory=dict, max_length=10)

    @field_validator("garment_colors")
    @classmethod
    def validate_garment_colors(cls, values: dict[str, list[str]]) -> dict[str, list[str]]:
        import re
        if any(len(colors) != 3 or any(not re.fullmatch(r"#[0-9A-Fa-f]{6}", color) for color in colors) for colors in values.values()):
            raise ValueError("Garment colors must contain three #RRGGBB colors")
        return {key: [color.upper() for color in colors] for key, colors in values.items()}

    @field_validator("palette")
    @classmethod
    def validate_palette(cls, values: list[str]) -> list[str]:
        import re

        if any(not re.fullmatch(r"#[0-9A-Fa-f]{6}", value) for value in values):
            raise ValueError("Colors must use #RRGGBB format")
        return [value.upper() for value in values]


class RecommendRequest(OutfitRequest):
    audience: str | None = Field(default=None, pattern="^(mens|womens|unisex)$")
    idea: str = Field(default="", max_length=600)
    locked_ids: list[str] = Field(default_factory=list, max_length=10)


class PromptText(BaseModel):
    brief_ja: str = Field(min_length=1, max_length=4000)
    positive: str = Field(min_length=1, max_length=4000)
    negative: str = Field(min_length=1, max_length=1500)


class AISelection(BaseModel):
    item_ids: list[str] = Field(min_length=1, max_length=10)
    reason: str = Field(min_length=1, max_length=1000)
