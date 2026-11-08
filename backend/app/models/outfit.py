from enum import StrEnum
from pydantic import BaseModel, Field, field_validator


class Category(StrEnum):
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
    kind: str
    description: str
    material: str
    material_en: str
    tags: list[str]
    styles: list[str]
    colors: list[str]


class OutfitRequest(BaseModel):
    item_ids: list[str] = Field(default_factory=list, max_length=7)
    custom_items: list[Garment] = Field(default_factory=list, max_length=7)
    palette: list[str] = Field(default_factory=list, max_length=5)
    title: str = Field(default="My coordinate", max_length=100)
    notes: str = Field(default="", max_length=1000)
    style: str = Field(default="girly", max_length=40)
    use_ai: bool = False

    @field_validator("palette")
    @classmethod
    def validate_palette(cls, values: list[str]) -> list[str]:
        import re

        if any(not re.fullmatch(r"#[0-9A-Fa-f]{6}", value) for value in values):
            raise ValueError("Colors must use #RRGGBB format")
        return [value.upper() for value in values]


class RecommendRequest(OutfitRequest):
    idea: str = Field(default="", max_length=600)
    locked_ids: list[str] = Field(default_factory=list, max_length=7)


class PromptText(BaseModel):
    brief_ja: str = Field(min_length=1, max_length=4000)
    positive: str = Field(min_length=1, max_length=4000)
    negative: str = Field(min_length=1, max_length=1500)


class AISelection(BaseModel):
    item_ids: list[str] = Field(min_length=1, max_length=7)
    reason: str = Field(min_length=1, max_length=1000)
