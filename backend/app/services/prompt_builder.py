from urllib.parse import urlencode
from app.models.outfit import Garment, OutfitRequest
from app.services.catalog import PALETTES, CATEGORIES, STYLES

COLOR_WORDS = {
    "#E8BFCB": "dusty pink",
    "#FAF7EF": "ivory",
    "#BECDE0": "powder blue",
    "#B7ADC8": "lavender",
    "#555164": "charcoal",
}
for palette in PALETTES:
    COLOR_WORDS.update(zip(palette["colors"], palette["names"]))


def color_name(hex: str) -> str:
    if hex in COLOR_WORDS:
        return COLOR_WORDS[hex]
    # Nearest named reference color is more useful in image prompts than a raw HEX code.
    rgb = tuple(int(hex[i : i + 2], 16) for i in (1, 3, 5))
    nearest = min(
        COLOR_WORDS,
        key=lambda h: sum(
            (rgb[n] - int(h[i : i + 2], 16)) ** 2 for n, i in enumerate((1, 3, 5))
        ),
    )
    return COLOR_WORDS[nearest]


def reference_links(items: list[Garment]) -> list[dict]:
    return [
        {
            "item_id": item.id,
            "label": item.name,
            "danbooru": "https://danbooru.donmai.us/posts?"
            + urlencode({"tags": f"{item.tags[0]} rating:g"}),
            "pinterest": "https://www.pinterest.com/search/pins/?"
            + urlencode({"q": item.name_en + " outfit reference"}),
        }
        for item in items
    ]


def build_prompt(req: OutfitRequest, items: list[Garment]) -> dict:
    colors = req.palette or PALETTES[0]["colors"]
    style = next(
        (s for s in STYLES if s["id"] == req.style),
        {"name": req.style, "en": req.style},
    )
    labels = {c["id"]: c["name"] for c in CATEGORIES}
    tags = list(dict.fromkeys(tag for item in items for tag in item.tags))
    descriptions = [f"{item.name_en}, {item.material_en} texture" for item in items]
    positive = ", ".join(
        [
            style["en"].lower() + " fashion",
            "full body outfit reference",
            *descriptions,
            *[tag.replace("_", " ") for tag in tags],
            "color palette: " + ", ".join(color_name(c) for c in colors),
            "clear garment construction",
        ]
    )
    lines = [
        f'{req.title}｜{style["name"]}の衣装設定',
        *[
            f"・{labels[item.category]}：{item.name}（{item.material}）。{item.description}"
            for item in items
        ],
        "配色：" + " / ".join(colors) + "。ベース・主役・差し色の面積差をつける。",
    ]
    if req.notes.strip():
        lines.append("作画メモ：" + req.notes.strip())
    return {
        "brief_ja": "\n".join(lines),
        "positive": positive,
        "negative": "blurry clothing details, inconsistent garment construction, missing accessories, distorted buttons, text, watermark",
        "tags": tags,
        "references": reference_links(items),
        "palette": colors,
        "engine": "template",
        "model": None,
        "notice": None,
    }
