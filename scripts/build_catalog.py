"""Author the original schematic wardrobe; no book scans or remote image copies."""

import json
from pathlib import Path

# id, Japanese name, English description, shape, material, material_en, tags, styles
rows = {
    "underwear": [
        ("white-tights", "白タイツ", "opaque white tights", "tights", "ストレッチニット", "stretch knit", ["white_tights", "opaque_tights"], ["casual", "classic", "girly"]),
        ("black-tights", "黒タイツ", "opaque black tights", "tights", "ストレッチニット", "stretch knit", ["black_tights", "opaque_tights"], ["casual", "classic", "girly"]),
        ("cotton-inner-shorts", "フィットショートパンツ", "fitted cotton athletic shorts", "inner-shorts", "コットン", "cotton jersey", ["fitted_shorts", "athletic_shorts"], ["casual", "classic", "girly"]),
        ("inner-spats", "インナースパッツ", "fitted inner cycling shorts", "inner-spats", "ストレッチコットン", "stretch cotton", ["inner_shorts", "cycling_shorts"], ["casual", "street"]),
    ],
    "socks": [
        ("ankle-socks", "アンクルソックス", "plain ankle socks", "ankle-socks", "コットン", "cotton", ["ankle_socks", "socks"], ["casual", "classic", "girly"]),
        ("crew-socks", "クルーソックス", "ribbed crew socks", "crew-socks", "リブコットン", "ribbed cotton", ["crew_socks", "ribbed_socks"], ["casual", "street", "classic"]),
        ("knee-socks", "ハイソックス", "plain knee-high socks", "knee-socks", "コットン", "cotton", ["knee_socks", "socks"], ["girly", "classic"]),
    ],
    "inner": [
        ("cotton-camisole", "コットンキャミソール", "plain cotton camisole", "camisole", "コットン", "soft cotton", ["camisole", "sleeveless", "shoulder_straps"], ["girly", "casual", "classic"]),
        ("rib-camisole", "リブキャミソール", "ribbed cotton camisole", "camisole", "リブコットン", "ribbed cotton", ["camisole", "ribbed_fabric", "shoulder_straps"], ["girly", "casual", "street"]),
        ("cotton-tank", "コットンタンクトップ", "plain cotton tank top", "tank", "コットン", "soft cotton", ["tank_top", "sleeveless"], ["casual", "classic", "street"]),
    ],
    "tops": [
        (
            "ribbon-blouse",
            "リボンタイブラウス",
            "ribbon-tie blouse",
            "blouse",
            "コットン",
            "cotton",
            ["blouse", "bow", "puffy_sleeves"],
            ["girly", "classic"],
        ),
        (
            "lace-blouse",
            "レースカラーブラウス",
            "lace-collar blouse",
            "lace",
            "レース",
            "lace",
            ["blouse", "lace", "frills"],
            ["girly", "classic"],
        ),
        (
            "rib-knit",
            "リブニット",
            "ribbed knit sweater",
            "knit",
            "リブニット",
            "ribbed knit",
            ["sweater", "turtleneck", "long_sleeves"],
            ["casual", "classic"],
        ),
        (
            "graphic-tee",
            "オーバーサイズTシャツ",
            "oversized graphic T-shirt",
            "tee",
            "コットンジャージー",
            "cotton jersey",
            ["t-shirt", "oversized_clothes", "short_sleeves"],
            ["street", "casual"],
        ),
        (
            "sailor-top",
            "セーラーカラートップス",
            "sailor-collar top",
            "sailor",
            "コットン",
            "cotton",
            ["sailor_collar", "shirt", "ribbon"],
            ["girly", "classic"],
        ),
        (
            "crop-knit",
            "クロップドカーディガン",
            "cropped button-front cardigan",
            "cardigan",
            "ウールニット",
            "wool knit",
            ["cardigan", "crop_top", "buttons"],
            ["girly", "street"],
        ),
        ("mens-shirt", "メンズ・オックスフォードシャツ", "men's oxford button-down shirt", "shirt", "オックスフォードコットン", "oxford cotton", ["shirt", "button_down", "long_sleeves"], ["classic", "casual"]),
    ],
    "outer": [
        ("mens-blazer", "メンズ・ブレザー", "men's single-breasted blazer", "blazer", "ウール", "tropical wool", ["blazer", "single_breasted", "notched_lapels"], ["classic", "casual"]),
        (
            "short-blouson",
            "ショートブルゾン",
            "cropped blouson jacket",
            "blouson",
            "コットンツイル",
            "cotton twill",
            ["jacket", "puffy_sleeves", "cropped_jacket"],
            ["girly", "casual"],
        ),
        (
            "trench",
            "ベルト付きトレンチコート",
            "belted double-breasted trench coat",
            "trench",
            "ギャバジン",
            "gabardine",
            ["trench_coat", "belt", "double-breasted"],
            ["classic", "casual"],
        ),
        (
            "piped-cardigan",
            "パイピングニットジャケット",
            "contrast-trim knit jacket",
            "cardigan",
            "ニット",
            "knitted fabric",
            ["cardigan", "jacket", "buttons"],
            ["girly", "classic"],
        ),
        (
            "checked-jacket",
            "チェックジャケット",
            "tailored checked jacket",
            "blazer",
            "チェック柄ツイード",
            "checked tweed",
            ["blazer", "plaid", "double-breasted"],
            ["classic", "girly"],
        ),
        (
            "zip-hoodie",
            "配色ジップパーカー",
            "color-block zip hoodie",
            "hoodie",
            "スウェット",
            "sweatshirt fleece",
            ["hoodie", "zipper", "long_sleeves"],
            ["street", "casual"],
        ),
        (
            "long-cape",
            "スタンドカラーマント",
            "stand-collar cape",
            "cape",
            "ウール",
            "wool",
            ["cape", "high_collar", "clasp"],
            ["fantasy", "classic"],
        ),
    ],
    "bottoms": [
        ("straight-slacks", "ストレートスラックス", "straight-leg pressed trousers", "pants", "ウール混", "wool blend", ["pants", "slacks", "pressed_crease"], ["classic", "casual"]),
        (
            "pleated-skirt",
            "プリーツミニスカート",
            "pleated mini skirt",
            "skirt",
            "ポリエステル",
            "polyester",
            ["pleated_skirt", "miniskirt"],
            ["girly", "classic"],
        ),
        (
            "tiered-skirt",
            "ティアードスカート",
            "tiered ruffle skirt",
            "tiered",
            "コットン",
            "cotton",
            ["tiered_skirt", "frilled_skirt", "skirt"],
            ["girly", "fantasy"],
        ),
        (
            "wide-jeans",
            "ワイドデニム",
            "wide-leg denim jeans",
            "pants",
            "デニム",
            "denim",
            ["jeans", "wide_pants", "denim"],
            ["casual", "street"],
        ),
        (
            "cargo-pants",
            "カーゴパンツ",
            "utility cargo trousers",
            "cargo",
            "ナイロン",
            "nylon",
            ["cargo_pants", "pants", "pockets"],
            ["street", "casual"],
        ),
        (
            "tailored-shorts",
            "ハイウエストショートパンツ",
            "high-waisted tailored shorts",
            "shorts",
            "ツイル",
            "twill",
            ["shorts", "high-waist_shorts"],
            ["classic", "casual"],
        ),
        (
            "long-skirt",
            "フレアロングスカート",
            "flowing A-line maxi skirt",
            "long-skirt",
            "シフォン",
            "chiffon",
            ["long_skirt", "skirt", "flowing_clothes"],
            ["girly", "fantasy"],
        ),
        ("dolphin-shorts", "ドルフィンパンツ", "curved-hem dolphin running shorts", "dolphin", "コットンジャージー", "cotton jersey", ["dolphin_shorts", "running_shorts", "contrast_piping"], ["casual", "street", "girly"]),
    ],
    "shoes": [
        (
            "mary-janes",
            "ストラップシューズ",
            "Mary Jane strap shoes",
            "maryjanes",
            "エナメル",
            "patent leather",
            ["mary_janes", "shoes"],
            ["girly", "classic"],
        ),
        (
            "sneakers",
            "ローカットスニーカー",
            "low-top lace-up sneakers",
            "sneakers",
            "キャンバス",
            "canvas",
            ["sneakers", "shoelaces"],
            ["casual", "street"],
        ),
        (
            "ankle-boots",
            "レースアップショートブーツ",
            "lace-up ankle boots",
            "boots",
            "レザー",
            "leather",
            ["ankle_boots", "lace-up_boots"],
            ["classic", "street", "fantasy"],
        ),
        (
            "loafers",
            "チャンキーローファー",
            "chunky-sole loafers",
            "loafers",
            "レザー",
            "leather",
            ["loafers", "platform_footwear"],
            ["classic", "girly"],
        ),
        (
            "sandals",
            "クロスストラップサンダル",
            "cross-strap platform sandals",
            "sandals",
            "レザー",
            "leather",
            ["sandals", "platform_footwear"],
            ["girly", "casual"],
        ),
        (
            "long-boots",
            "ロングブーツ",
            "knee-high riding boots",
            "long-boots",
            "レザー",
            "leather",
            ["knee_boots", "boots"],
            ["street", "fantasy"],
        ),
    ],
    "head": [
        (
            "ribbon-clip",
            "リボンバレッタ",
            "ribbon hair barrette",
            "ribbon",
            "サテン",
            "satin",
            ["hair_bow", "hair_ribbon"],
            ["girly", "classic"],
        ),
        (
            "bucket-hat",
            "バケットハット",
            "soft bucket hat",
            "bucket",
            "コットン",
            "cotton",
            ["bucket_hat", "hat"],
            ["casual", "street"],
        ),
        (
            "beret",
            "ウールベレー帽",
            "wool beret",
            "beret",
            "ウール",
            "wool",
            ["beret", "hat"],
            ["classic", "girly"],
        ),
        (
            "round-glasses",
            "ラウンドメガネ",
            "round tortoiseshell glasses",
            "glasses",
            "アセテート",
            "acetate",
            ["round_eyewear", "glasses"],
            ["classic", "casual"],
        ),
        (
            "flower-clip",
            "フラワーヘアクリップ",
            "flower hair clip",
            "flower",
            "樹脂",
            "resin",
            ["flower_hair_ornament", "hair_ornament"],
            ["girly", "fantasy"],
        ),
        (
            "headphones",
            "オーバーイヤーヘッドホン",
            "over-ear headphones",
            "headphones",
            "マット樹脂",
            "matte plastic",
            ["headphones"],
            ["street", "casual"],
        ),
    ],
    "bag": [
        (
            "handbag",
            "ラウンドハンドバッグ",
            "rounded top-handle handbag",
            "handbag",
            "レザー",
            "leather",
            ["handbag", "bag"],
            ["girly", "classic"],
        ),
        (
            "basket-bag",
            "バスケットバッグ",
            "woven basket shoulder bag",
            "basket",
            "ラタン",
            "woven rattan",
            ["basket", "shoulder_bag"],
            ["girly", "casual"],
        ),
        (
            "frill-tote",
            "フリルトートバッグ",
            "ruffle-trim tote bag",
            "tote",
            "コットン",
            "cotton",
            ["tote_bag", "frills"],
            ["girly", "casual"],
        ),
        (
            "crossbody",
            "ミニショルダーバッグ",
            "mini crossbody satchel",
            "crossbody",
            "レザー",
            "leather",
            ["shoulder_bag", "satchel"],
            ["classic", "street"],
        ),
        (
            "backpack",
            "ユーティリティリュック",
            "utility backpack",
            "backpack",
            "ナイロン",
            "nylon",
            ["backpack", "straps"],
            ["street", "casual"],
        ),
        (
            "drawstring",
            "巾着ポーチ",
            "drawstring pouch bag",
            "pouch",
            "ベルベット",
            "velvet",
            ["drawstring_bag", "pouch"],
            ["girly", "fantasy"],
        ),
        (
            "canvas-tote",
            "キャンバスバッグ",
            "soft canvas tote bag with long handles",
            "canvas-tote",
            "コットンキャンバス",
            "cotton canvas",
            ["tote_bag", "canvas_bag", "long_handles"],
            ["casual", "girly", "classic"],
        ),
    ],
    "jewelry": [
        (
            "pearl-necklace",
            "パールネックレス",
            "pearl necklace with a small charm",
            "necklace",
            "パール",
            "pearl",
            ["pearl_necklace", "necklace"],
            ["girly", "classic"],
        ),
        (
            "flower-earrings",
            "フラワーピアス",
            "flower-shaped pearl earrings",
            "earrings",
            "パール・ゴールド",
            "pearl and gold",
            ["earrings", "flower_earrings"],
            ["girly", "fantasy"],
        ),
        (
            "chain-bracelet",
            "チェーンブレスレット",
            "fine chain bracelet",
            "bracelet",
            "シルバー",
            "silver",
            ["bracelet", "chain"],
            ["classic", "street"],
        ),
        (
            "ribbon-choker",
            "リボンチョーカー",
            "ribbon choker with a charm",
            "choker",
            "ベルベット",
            "velvet",
            ["choker", "ribbon"],
            ["girly", "fantasy"],
        ),
        (
            "pendant",
            "オーバルペンダント",
            "oval gemstone pendant",
            "pendant",
            "ゴールド・宝石",
            "gold and gemstone",
            ["pendant", "necklace"],
            ["classic", "fantasy"],
        ),
        (
            "hoop-earrings",
            "フープイヤリング",
            "small hoop earrings",
            "hoops",
            "シルバー",
            "silver",
            ["hoop_earrings", "earrings"],
            ["street", "casual"],
        ),
    ],
}
colors = ["#D7E6ED", "#F4D9CF", "#F6EDDA", "#DAD5E7", "#D5DFD0", "#ECD0D7"]
new_colors = {"white-tights": "#F3F2F0", "black-tights": "#34343B", "canvas-tote": "#E8E5DC", "cotton-camisole": "#F1F0ED", "rib-camisole": "#BFC1C6", "cotton-tank": "#F1F0ED", "dolphin-shorts": "#A9ADB5", "mens-shirt": "#F1F0ED", "mens-blazer": "#5C616A", "straight-slacks": "#70747E", "cotton-inner-shorts": "#F1F0ED", "inner-spats": "#4D4C57", "ankle-socks": "#F1F0ED", "crew-socks": "#F1F0ED", "knee-socks": "#4D4C57"}
mens = {"mens-shirt", "mens-blazer", "straight-slacks", "checked-jacket"}
womens = {"cotton-camisole", "rib-camisole", "ribbon-blouse", "lace-blouse", "sailor-top", "crop-knit", "short-blouson", "piped-cardigan", "pleated-skirt", "tiered-skirt", "long-skirt", "mary-janes", "long-boots", "ribbon-clip", "flower-clip", "ribbon-choker"}
items = []
for category, entries in rows.items():
    for i, (id, name, en, kind, material, material_en, tags, styles) in enumerate(
        entries
    ):
        items.append(
            dict(
                id=id,
                name=name,
                name_en=en,
                category=category,
                audience="mens" if id in mens else "womens" if id in womens else "unisex",
                kind=kind,
                material=material,
                material_en=material_en,
                tags=tags,
                styles=styles,
                colors=[new_colors.get(id, colors[i % len(colors)]), "#FCFAF5", "#B6A6B7"],
                description=f"{material}の質感と、{name}のシルエットを組み合わせに。",
            )
        )
# Distinct practical drawing notes, written specifically for this app.
notes = {
    "ribbon-blouse": "襟元のリボンとふくらんだ袖がポイント。スカートにもパンツにも。",
    "trench": "肩のヨーク、ダブルの前合わせ、ウエストベルトで構造をつかむ。",
    "pleated-skirt": "腰から裾へ広がるプリーツで、立ち姿にも動きを。",
    "mary-janes": "足の甲を横切るストラップと、丸いつま先が特徴。",
    "handbag": "丸みのある本体と短い持ち手で、上品なアクセントを。",
    "canvas-tote": "長めの持ち手と、荷物の重みで少したわむ帆布のトート。縫い目と底の丸みをさりげなく。",
    "cotton-camisole": "細い肩ひもとゆるやかな胸元。シャツの下にも、一枚の着こなしにも。",
    "rib-camisole": "縦のリブと細い肩ひもで、すっきりとした重ね着に。",
    "dolphin-shorts": "丸く上がるサイドの裾と細いパイピング。腰と太ももに少しゆとりのある形。",
    "pearl-necklace": "小粒のパールを連ねて、首まわりに明るいリズムを。",
}
for item in items:
    item["description"] = notes.get(item["id"], item["description"])
Path("backend/data/catalog.json").write_text(
    json.dumps(items, ensure_ascii=False, indent=2) + "\n"
)


# Original SVG technical illustrations. A shared line treatment unifies the atlas.
# All silhouettes are authored here; the referenced book is not embedded or traced.
def art(item):
    c = item["colors"][0]
    trim = item["colors"][2]
    k = item["kind"]

    serial = 0
    active_layer = None
    def path(d, fill=None, extra=""):
        nonlocal serial
        result = f'<path d="{d}" fill="{fill or c}" {extra}/>'
        if fill is None:
            serial += 1
            # Cel shading stays clipped to the original editable clothing outline.
            clip = f"cel-{serial}"
            result += f'<defs><clipPath id="{clip}"><path d="{d}"/></clipPath></defs>'
            # Light comes from the upper left. Gradients, not hard-edged bands, keep the
            # form shading soft when the drawing is warped onto the body.
            result += (
                f'<g clip-path="url(#{clip})" stroke="none">'
                '<rect width="240" height="260" fill="url(#cel-fall)"/>'
                '<rect width="240" height="260" fill="url(#cel-side)"/>'
                '<rect width="240" height="260" fill="url(#cel-top)"/>'
                '<rect width="240" height="260" fill="url(#cel-left)"/>'
                f'<path d="{d}" fill="none" stroke="#4A4356" stroke-width="7" opacity=".07"/>'
                '<path d="M218 0H240V260H218Z" fill="#FFFFFF" opacity=".10"/>'
                '</g>'
            )
        return f'<g data-garment-layer="{active_layer}">{result}</g>' if active_layer else result

    shapes = ""
    def part(name, x, y, drawing):
        return f'<g data-garment-layer="{name}" data-anchor="{x} {y}">{drawing}</g>'

    def collars(left, fill, extra=""):
        return '<g data-garment-layer="collar-left">' + path(left, fill, extra) + '</g><g data-garment-layer="collar-right"><g transform="translate(240 0) scale(-1 1)">' + path(left, fill, extra) + '</g></g>'

    if k in ("camisole", "tank"):
        shapes += path("M90 78 106 79Q120 91 134 79L150 78 151 124 156 215Q120 224 84 215L89 124Z")
        active_layer = "straps"
        shapes += path("M90 78 99 43H112L108 79Zm42 1-4-36h13l9 35Z" if k == "tank" else "M90 78 99 43H107L106 79Zm44 1-1-36h8l9 35Z", c)
        active_layer = None
        shapes += path("M99 45h8m26 0h8M106 79Q120 91 134 79M90 82 88 119m62-37 2 37", "none", 'opacity=".55"')
        if item["id"] == "rib-camisole":
            for x in range(96, 149, 7):
                shapes += path(f"M{x} 103v96", "none", 'opacity=".2"')
        shapes += path("M88 205Q120 213 152 205m-57-57 5 12m45-12-5 12", "none", 'opacity=".4"')
    elif k == "dolphin":
        shapes += path("M83 38H157L169 142Q150.5 162 132 142L120 101 108 142Q89.5 162 71 142Z")
        active_layer = "waistband"
        shapes += path("M83 38H157V53H83Z", trim)
        active_layer = None
        shapes += path("M83 53 73 138Q89.5 156 106 138M157 53 167 138Q150.5 156 134 138", "none", 'stroke="#FCFAF5" stroke-width="4"')
        shapes += path("M116 54 111 79m13-25 5 25M85 57l-6 54m76-54 6 54", "none", 'opacity=".4"')
    elif k in (
        "blouse",
        "lace",
        "sailor",
        "tee",
        "knit",
        "cardigan",
        "blouson",
        "blazer",
        "hoodie",
        "shirt",
    ):
        if k == "tee":
            outline = "M75 57 100 46Q120 68 140 46L165 57 202 102 173 124 153 102 157 210H83L87 102 67 124 38 102Z"
        elif k in ("knit", "cardigan", "hoodie"):
            outline = "M76 57 99 45H141L164 57 184 110Q188 158 191 204L161 211 148 116Q146 167 155 219H85Q94 167 92 116L79 211 49 204Q52 157 56 110Z"
            if k == "hoodie": outline = outline.replace("99 45H141", "99 46Q120 64 141 46")
            elif item["id"] == "piped-cardigan": outline = outline.replace("99 45H141", "99 45Q120 65 141 45")
            elif k == "cardigan": outline = outline.replace("99 45H141", "99 45 120 65 141 45")
        else:
            outline = "M75 59 99 46 120 57 141 46 165 59 187 111Q192 145 188 173Q188 185 172 187H160L147 111Q146 155 151 187L154 210Q120 219 86 210L89 187Q94 155 93 111L80 187H68Q52 185 52 173Q48 142 53 111Z"
            if k in ("blazer", "blouson"):
                # A real open V reveals the shirt beneath the separate lapels.
                outline = outline.replace("99 46 120 57 141 46", "99 46 120 126 141 46")
            else: outline = outline.replace("99 46 120 57 141 46", "99 46 120 65 141 46")
        shapes += path(outline)
        if k in ("blouson", "blazer"):
            shapes += collars("M100 47 88 72 104 80 98 91 117 113Z", c if item["id"] == "mens-blazer" else "#FCFAF5")
        elif k == "hoodie":
            active_layer = "collar-front"
            shapes += path("M99 46Q120 64 141 46L138 59Q120 74 102 59Z", "#FCFAF5")
            active_layer = "collar-back"
            shapes = path("M84 61Q85 36 120 39Q155 36 156 61L145 78H95Z", "#FCFAF5") + shapes
            active_layer = "strings"
            shapes += path("M103 54 107 99M137 54 133 99", "none", 'stroke-width="1.4"')
        elif k == "knit":
            active_layer = "collar-front"
            shapes += path("M102 36H138V51Q120 61 102 51Z", c) + path(
                "M107 39v13m6-13v15m7-15v17m7-17v15m6-15v13", "none", 'opacity=".5"'
            )
        elif k == "tee":
            active_layer = "collar-front"
            shapes += path("M100 46Q120 68 140 46L137 54Q120 73 103 54Z", "#FCFAF5")
            active_layer = "print"
            shapes += path("M105 102H135V134H105Z", trim) + path("m110 125 10-15 10 15Z", "#FCFAF5")
        elif item["id"] == "piped-cardigan":
            active_layer = "collar-front"
            shapes += path("M99 45Q120 65 141 45L140 53Q120 73 100 53Z", trim)
        elif k != "sailor":
            shapes += collars("M100 47 119 65 110 81 92 60Z", "#FCFAF5")
            if k in ("blouse", "lace"):
                active_layer = "ribbon"
                shapes += path("M117 79Q106 70 96 69L100 87Q109 91 119 83Zm6 0q11-9 21-10l-4 18q-9 4-19-4Z", trim) + path("M117 83 107 110 120 103 133 110 123 83Z", trim) + path("M116 76Q120 74 124 76V84Q120 86 116 84Z", trim) + path("M103 75 116 80m21-5-13 5", "none", 'opacity=".35"')
        active_layer = None
        if k == "sailor":
            back = '<g data-garment-layer="collar-back">' + path("M70 55Q100 42 120 46Q140 42 170 55L167 64Q120 54 73 64Z", "#D4E2EC") + path("M74 57Q120 46 166 57", "none", 'opacity=".35"') + '</g>'
            shapes = back + shapes
            left = path("M70 54 99 46 117 65 113 96 75 76Z", "#D4E2EC") + path("M76 59 81 73 109 90", "none", f'stroke="{trim}" stroke-width="2"') + path("M80 60 85 71 110 85", "none", 'stroke="#FCFAF5" stroke-width="1.4"')
            shapes += '<g data-garment-layer="collar-left">' + left + '</g><g data-garment-layer="collar-right"><g transform="translate(240 0) scale(-1 1)">' + left + '</g></g>'
            shapes += '<g data-garment-layer="ribbon">' + path("M117 111Q106 100 97 103L101 119Q109 121 119 114Zm6 0q11-11 20-8l-4 16q-8 2-18-5Z", trim) + path("m117 114-8 27 11-7 11 7-8-27Z", trim) + path("M116 109Q120 107 124 109V116Q120 118 116 116Z", trim) + path("M103 108 116 112m21-4-13 4", "none", 'opacity=".35"') + '</g>'
        if k == "lace":
            shapes += collars("M94 51Q85 63 93 70Q87 82 99 83Q103 94 113 82L118 68 100 49Z", "#FCFAF5")
            active_layer = None
        if k in ("cardigan", "blazer", "blouson", "shirt"):
            shapes += path("M120 78V216", "none")
            for i,y in enumerate((137,163) if item["id"] == "mens-blazer" else (89,111,137,163,189) if k == "shirt" else (111,137,163,189)):
                shapes += part(f"button-{i}",124,y,f'<circle cx="124" cy="{y}" r="2" fill="{trim}"/>')
            if k == "shirt":
                shapes += part("pocket-left",101,115,path("M91 105H111V121L101 126 91 121Z", "none"))
            else:
                shapes += part("pocket-left",101,166,path("M91 155H111V178H91Z", "none"))
                shapes += part("pocket-right",139,166,path("M129 155h20v23h-20Z", "none"))
            if item["id"] == "piped-cardigan":
                shapes += path("M116 76V216m8-140v140M88 208Q120 216 152 208", "none", f'stroke="{trim}" stroke-width="3"')
        if k == "hoodie":
            shapes += path("M118 76V216m4-140v140M115 92h10v10h-10Z", "none", f'stroke="{trim}" stroke-width="1.2"')
            shapes += part("pocket-left",101,172,path("M91 151 111 164V190H87Z", "none", 'opacity=".65"')) + part("pocket-right",139,172,path("M149 151 129 164V190H153Z", "none", 'opacity=".65"'))
        if k == "knit":
            for x in range(94, 150, 6):
                shapes += path(f"M{x} 78v124", "none", 'opacity=".22"')
        if k == "blouson":
            shapes += path("M85 198Q120 204 155 198L154 213Q120 223 86 213Z", trim)
        shapes += path(
            "m58 175 20 2m84 0 20-2M91 202q28 7 57 0m-56-49 9 14m47-14-9 14",
            "none",
            'opacity=".45"',
        )
    elif k == "trench":
        shapes += path(
            "M77 45 100 35 120 114 140 35 163 45 184 103 189 172 167 176 149 102 172 224Q120 235 68 224L91 102 73 176 51 172 56 103Z"
        )
        shapes += collars("M100 35 90 62 107 74 98 87 117 108Z", "#F9F0DD")
        active_layer = "waistband"
        shapes += path("M80 129h80v10H80Z", trim)
        active_layer = None
        shapes += part("buckle",121.5,134.5,path("M114 128h15v13h-15Z", "#F9F0DD"))
        shapes += path("M118 92v132", "none")
        for x in (108, 137):
            for y in (100, 117, 156, 176):
                shapes += part(f"button-{int(x==137)*4+(100,117,156,176).index(y)}",x,y,f'<circle cx="{x}" cy="{y}" r="2" fill="#8F7D66"/>')
        shapes += path(
            "M87 167 102 157m36 0 15 10M77 217q42 10 85 0", "none", 'opacity=".5"'
        )
    elif k == "cape":
        shapes += path("M101 42H139L146 64Q164 116 194 205Q119 230 46 205Q75 118 94 64Z")
        active_layer = "collar-front"
        shapes += path("M101 42V27h38v15L120 58Z", "#FCFAF5")
        active_layer = None
        shapes += (
            path("M120 58v163", "none")
            + part("buckle",120,69.5,path("M109 66h22v7h-22Z", trim))
            + path("m91 91-27 107m85-107 27 107", "none", 'opacity=".5"')
        )
    elif k in ("skirt", "tiered", "long-skirt"):
        top = 54
        bottom = 224 if k == "long-skirt" else 200
        shapes += path(
            f"M85 {top}H155L184 {bottom}Q120 {bottom+20} 56 {bottom}Z"
        )
        active_layer = "waistband"
        shapes += path("M85 54H155V68H85Z", trim)
        active_layer = None
        if k == "tiered":
            for y, w in ((108, 49), (153, 58), (195, 66)):
                shapes += path(
                    f"M{120-w} {y}q{w} 20 {w*2} 0l4 12q-{w+4} 20 -{(w+4)*2} 0Z",
                    "#FCFAF5",
                )
        else:
            for x in (91, 105, 120, 135, 149):
                shapes += path(
                    f"M{x} 69 {120+(x-120)*1.9} {bottom+2}", "none", 'opacity=".55"'
                )
        shapes += path(f"M61 {bottom-10}q59 20 118 0", "none")
    elif k in ("pants", "cargo", "shorts", "inner-shorts", "inner-spats"):
        b = 126 if k == "inner-shorts" else 150 if k in ("shorts", "inner-spats") else 224
        shapes += (
            path(f"M83 38H157L169 {b}H132L120 101 108 {b}H71Z")
        )
        active_layer = "waistband"
        shapes += path("M83 38H157V52H83Z", trim)
        active_layer = None
        shapes += path("M120 52v49" if item["category"] == "underwear" else "M120 52v49M87 58q0 23 22 22m44-22q0 23-22 22", "none", 'opacity=".55"')
        if k == "cargo":
            shapes += part("pocket-left",92,120,path("M79 105H105V136H77Z", trim) + path("M80 112h23", "none"))
            shapes += part("pocket-right",148,120,path("M135 105h26v31h-26Z", trim) + path("M137 112h23", "none"))
        if item["id"] == "straight-slacks":
            shapes += path("M97 63 91 213M143 63 149 213", "none", 'opacity=".4"')
        shapes += path(f"M74 {b-9}h33m26 0h33", "none")
    elif item["category"] == "socks" or k == "tights":
        if k == "tights":
            shapes += path("M83 30H157L162 76 169 204Q184 215 173 228H135Q123 228 127 209L120 103 113 209Q117 228 105 228H67Q56 215 71 204L78 76Z")
            shapes += path("M84 39H156M120 43V103M74 218H108m24 0h34", "none", 'opacity=".35"')
        else:
            top = 42 if k == "knee-socks" else 98 if k == "crew-socks" else 153
            for dx in (0,100):
                shapes += f'<g transform="translate({dx} 0)">'
                shapes += path(f"M43 {top}Q62 {top-4} 81 {top}L78 180Q95 185 101 201Q103 216 85 220H40Q25 218 28 200L36 180Z")
                shapes += path(f"M44 {top+7}Q62 {top+4} 80 {top+7}M31 207Q61 216 97 209", "none", 'opacity=".35"')
                if k == "crew-socks":
                    for x in (49,57,65,73): shapes += path(f"M{x} {top+12}v56", "none", 'opacity=".22"')
                shapes += '</g>'
    elif k in ("maryjanes", "loafers", "sneakers", "sandals", "boots", "long-boots"):
        if k in ("boots", "long-boots"):
            t = 38 if k == "long-boots" else 95
            for dx in (0, 100):
                shapes += (
                    f'<g transform="translate({dx},0)">'
                    + path(f"M47 {t}H94L89 178Q95 182 108 196L108 215H30V198L42 179Z")
                    + path("M31 207H108V221H30Z", trim)
                    + path(f"M49 {t+10}H92", "none")
                )
                shapes += "</g>"
        else:
            for dx in (0, 100):
                low_open = k in ("maryjanes", "loafers", "sandals")
                shapes += (
                    f'<g transform="translate({dx},0)">'
                    + path(
                        "M43 148 88 147Q112 168 111 190L104 208H30L26 190Q27 166 43 148Z" if k in ("maryjanes","loafers") else "M48 101Q61 92 83 103L88 147Q112 168 111 190L104 208H30L26 190Q27 166 43 148Z",
                        "none" if k == "sandals" else None,
                    )
                    + path("M27 196Q69 207 110 195L105 214H29Z", trim)
                )
                if k in ("maryjanes", "loafers"):
                    shapes += path("M42 143H86V154H42Z", trim)
                elif k == "sneakers":
                    shapes += path("M45 112 40 167Q62 153 88 165L83 114Z", "#FCFAF5")
                else:
                    shapes += path("M47 113 87 162 77 173 39 126Z", "#FCFAF5") + path(
                        "M82 114 41 162 51 173 90 126Z", "#FCFAF5"
                    )
                shapes += (
                    path("M36 185Q64 172 102 184", "none", 'opacity=".45"') + "</g>"
                )
                if low_open:
                    reverse = path("M48 101Q61 92 83 103L88 147Q66 154 43 148Z") if k != "sandals" else path("M48 101Q61 92 83 103L88 147Q112 168 111 190L104 208H30L26 190Q27 166 43 148Z")
                    shapes = '<g data-garment-layer="lining-back"><g transform="translate(' + str(dx) + ' 0)">' + reverse + '</g></g>' + shapes
        if k in ("boots", "sneakers"):
            for i,dx in enumerate((0,100)):
                drawing = ""
                for y in range(113,180,13) if k == "boots" else range(120,163,12):
                    drawing += path(f"M56 {y}l25 10m-25 0 25-10" if k == "boots" else f"M48 {y}l30 9m-30 0 30-9", "none")
                name = "laces-left" if i == 0 else "laces-right"
                shapes += part(name,dx+(68.5 if k == "boots" else 63),146 if k == "boots" else 143,f'<g transform="translate({dx} 0)">{drawing}</g>')
    elif k == "ribbon":
        shapes += (
            path(
                "M120 110Q78 60 43 80L53 148Q86 164 120 126Q154 164 187 148L197 80Q162 60 120 110Z"
            )
            + path(
                "M109 119 76 194 102 180 117 192 125 126 143 193 160 178 186 193 132 118Z",
                trim,
            )
            + path("M109 108H131V131H109Z", trim)
            + path("M55 93q30 2 51 22m79-22q-30 2-51 22", "none")
        )
    elif k in ("beret", "bucket"):
        if k == "beret":
            shapes += (
                path("M42 136Q24 92 86 70Q160 43 196 97Q220 136 165 151L73 151Z")
                + path("M65 139Q118 125 177 137L171 156Q118 147 72 160Z", trim)
                + path("m124 64 3-13", "none", 'stroke-width="5"')
            )
        else:
            shapes += (
                path("M74 76Q120 61 166 76L177 145 205 168Q121 204 35 168L63 145Z")
                + path("M65 138Q118 154 175 138L179 153Q119 175 60 153Z", trim)
                + path("M78 85q43 10 84 0", "none", 'stroke-dasharray="3 3"')
            )
    elif k == "glasses":
        shapes += (
            path("M28 117 50 99H189L212 117M103 128q17-14 34 0", "none")
            + '<circle cx="73" cy="135" r="31" fill="#E3ECED" fill-opacity=".5" stroke-width="4"/><circle cx="167" cy="135" r="31" fill="#E3ECED" fill-opacity=".5" stroke-width="4"/>'
            + path(
                "m56 121 22-9m73 9 22-9", "none", 'stroke="#FFFFFF" stroke-width="3"'
            )
        )
    elif k == "flower":
        for a in range(0, 360, 60):
            shapes += f'<ellipse cx="120" cy="95" rx="17" ry="32" fill="{c}" transform="rotate({a} 120 128)"/>'
        shapes += (
            '<circle cx="120" cy="128" r="18" fill="#F6E8B8"/>'
            + path("M77 175H166L160 204H82Z", trim)
            + path("m91 179v17m15-17v17m15-17v17m15-17v17m15-17v17", "none")
        )
    elif k == "headphones":
        shapes += (
            path(
                "M57 154V111Q57 42 120 42Q183 42 183 111V154H165V111Q165 61 120 61Q75 61 75 111V154Z",
                trim,
            )
            + path("M52 125H79V184H52Zm109 0h27v59h-27Z")
            + path("M58 132h15v45H58Zm109 0h15v45h-15Z", "#FCFAF5")
        )
    elif k == "canvas-tote":
        shapes += path("M82 116V62Q82 30 120 30Q158 30 158 62V116H148V62Q148 40 120 40Q92 40 92 62V116Z", c)
        shapes += path("M60 103Q120 108 180 103L185 207Q186 220 173 223Q120 230 67 223Q54 220 55 207Z")
        shapes += path("M61 103Q120 109 179 103L179 114Q120 120 61 114Z", "#FCFAF5")
        shapes += path("M81 105 83 131H93L92 106Zm67 1-1 25h10l2-26Z", c)
        shapes += path("M99 146Q120 149 141 146V181Q120 187 99 181Z", "none", 'opacity=".48"')
        shapes += path("M68 120 62 207Q62 215 73 217Q120 224 167 217Q178 215 178 207L172 120", "none", 'stroke-width="1.1" stroke-dasharray="3 4" opacity=".45"')
        shapes += path("M73 190q-4 14 1 25m92-23q5 11 0 23M91 111v16m61-16v16", "none", 'opacity=".35"')
    elif k in ("handbag", "basket", "tote", "crossbody", "backpack", "pouch"):
        if k == "pouch":
            shapes += path(
                "M88 76H152L147 93Q177 133 177 190Q121 220 63 190Q63 133 93 93Z"
            ) + path("M87 92H153M102 88Q73 87 73 110m65-22q29-1 29 22", "none")
        elif k == "backpack":
            shapes += (
                path("M90 68V57Q120 37 150 57V68", "none", 'stroke-width="5"')
                + path("M63 103Q63 65 120 65Q177 65 177 103L182 210H58Z")
                + path("M77 142H163V194H77Z", trim)
                + path("M72 112H168M86 154H154", "none")
            )
        elif k == "crossbody":
            shapes += (
                path("M72 123Q42 45 109 42Q170 41 177 128", "none", 'stroke-width="7"')
                + path("M61 121H179V207H61Z")
                + path("M61 121H179L164 165H76Z", "#FCFAF5")
                + path("M114 159h12v17h-12Z", trim)
            )
        else:
            shapes += path(
                "M84 100V73Q84 36 120 36Q156 36 156 73V100", "none", 'stroke-width="7"'
            )
            shapes += path("M65 91H175L186 201Q119 222 54 201Z")
            if k == "tote":
                shapes += path(
                    "M67 93Q46 96 56 111Q43 120 55 131Q43 145 56 153Q42 167 56 179Q43 193 55 202M173 93Q194 96 184 111Q197 120 185 131Q197 145 184 153Q198 167 184 179Q197 193 185 202",
                    "#FCFAF5",
                ) + path("M82 91V207M158 91V207", "none")
            elif k == "basket":
                for y in range(105, 202, 9):
                    shapes += path(
                        f"M64 {y}Q120 {y+10} 177 {y}", "none", 'opacity=".35"'
                    )
                for x in range(72, 176, 10):
                    shapes += path(f"M{x} 97V204", "none", 'opacity=".22"')
            else:
                shapes += path("M83 91v18h9V91Zm65 0v18h9V91Z", trim) + path(
                    "M64 192Q120 209 176 192", "none", 'opacity=".4"'
                )
    else:
        if k in ("necklace", "pendant", "choker"):
            if k == "choker":
                shapes += path(
                    "M56 92Q120 127 184 92V111Q120 150 56 111Z", trim
                ) + path("m120 129-25 12 9 18 16-15 16 15 9-18Z", c)
            else:
                shapes += path(
                    "M57 68Q42 173 120 193Q198 173 183 68", "none", 'stroke-width="2.5"'
                )
                if k == "necklace":
                    import math

                    for n in range(19):
                        a = math.pi * n / 18
                        shapes += f'<circle cx="{120-66*math.cos(a):.1f}" cy="{78+111*math.sin(a):.1f}" r="4" fill="#F8F1DF"/>'
                else:
                    shapes += (
                        '<ellipse cx="120" cy="193" rx="17" ry="23" fill="'
                        + c
                        + '"/><ellipse cx="120" cy="193" rx="10" ry="16" fill="'
                        + trim
                        + '"/>'
                    )
            shapes += path("m120 190-8 9 8 11 8-11Z", trim)
        elif k == "bracelet":
            for n in range(14):
                import math

                a = math.pi * 2 * n / 14
                shapes += f'<ellipse cx="{120+65*math.cos(a):.1f}" cy="{130+42*math.sin(a):.1f}" rx="8" ry="5" fill="{c}" transform="rotate({n*25.7} {120+65*math.cos(a):.1f} {130+42*math.sin(a):.1f})"/>'
            shapes += path("m123 174-12 12 12 16 12-16Z", trim)
        else:
            for dx in (0, 90):
                shapes += f'<g transform="translate({dx},0)"><circle cx="75" cy="84" r="5" fill="{trim}"/>'
                if k == "hoops":
                    shapes += '<ellipse cx="75" cy="131" rx="27" ry="39" fill="none" stroke="#BFA67A" stroke-width="5"/>'
                else:
                    for a in range(0, 360, 72):
                        shapes += f'<ellipse cx="75" cy="113" rx="10" ry="17" fill="{c}" transform="rotate({a} 75 130)"/>'
                    shapes += '<circle cx="75" cy="130" r="8" fill="#F8F1DF"/>'
                shapes += "</g>"
    active_layer = None
    # Sewn reverse facings sit behind the skin and front panels in the rig.
    if item["category"] in ("inner", "tops", "outer", "bottoms", "underwear") and k != "tights":
        active_layer = "lining-back"
        if k in ("skirt", "tiered", "long-skirt"):
            b = 224 if k == "long-skirt" else 200
            lining_d = f"M56 {b}Q120 {b+20} 184 {b}L181 {b+6}Q120 {b+26} 59 {b+6}Z"
        elif k in ("pants", "cargo", "shorts", "dolphin", "inner-shorts", "inner-spats"):
            b = 126 if k == "inner-shorts" else 142 if k == "dolphin" else 150 if k in ("shorts", "inner-spats") else 224
            q = 20 if k == "dolphin" else 5
            lining_d = f"M71 {b}Q89.5 {b+q} 108 {b}L107 {b+4}Q89.5 {b+q+4} 72 {b+4}Zm61 0q18.5 {q} 37 0l-1 4q-18.5 {q+4}-35 0Z"
        else:
            b, left, curve = (224,68,11) if k == "trench" else (205,46,25) if k == "cape" else (215,84,9) if k in ("camisole","tank") else (219,85,0) if k in ("knit","cardigan","hoodie") else (210,83 if k == "tee" else 86,9)
            lining_d = f"M{left} {b}Q120 {b+curve} {240-left} {b}l-2 5Q120 {b+curve+5} {left+2} {b+5}Z"
        # An opaque reverse facing, darkened with a shadow wash. A half-transparent
        # facing read as a ghost under the hem once it was warped onto the body.
        lining = path(lining_d, trim)
        shade = path(lining_d, "#55506D", 'opacity=".30" stroke="none"')
        shapes = lining + shade + shapes
        active_layer = None
    if item["category"] in ("tops", "outer") and k not in ("sailor", "hoodie", "cape"):
        active_layer = "collar-back"
        y = 30 if k == "knit" else 35 if k == "trench" else 46
        shapes = path(f"M99 {y}Q120 {y-11} 141 {y}L140 {y+8}Q120 {y-1} 100 {y+8}Z", "#FCFAF5") + shapes
        active_layer = None
    if item["category"] in ("tops", "outer") and k != "cape":
        knit = k in ("knit", "cardigan", "hoodie")
        if k == "tee":
            cuff = path("M43 96 72 118 67 124 38 102Z", c) + path("M43 101 68 120", "none", 'opacity=".4"')
        elif k == "trench":
            cuff = path("M51 165 74 169 73 176H51Z", c) + path("M53 169 72 172", "none", 'opacity=".4"')
        elif knit:
            cuff = path("M50 194 80 201 79 211 49 204Z", c)
            for x in (55,61,67,73): cuff += path(f"M{x} {195+(x-50)*.23}l-1 9", "none", 'opacity=".3"')
        else:
            cuff = path("M53 173Q66 178 80 173V187H68Q52 185 53 173Z", "#FCFAF5") + path("M57 177 75 180", "none", 'opacity=".35"')
        shapes += '<g data-garment-layer="cuff-left">' + cuff + '</g><g data-garment-layer="cuff-right"><g transform="translate(240 0) scale(-1 1)">' + cuff + '</g></g>'
    pattern = ""
    if item["id"] == "checked-jacket":
        pattern = (
            '<pattern id="fabric" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="'
            + c
            + '"/><path d="M0 4H16M4 0V16" stroke="#FFFFFF" stroke-width="3" opacity=".65"/><path d="M0 12H16M12 0V16" stroke="#A3ACBA" stroke-width=".7"/></pattern>'
        )
        shapes = shapes.replace('fill="' + c + '"', 'fill="url(#fabric)"')
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260"><defs>'
        + pattern
        + '<linearGradient id="cel-fall" gradientUnits="userSpaceOnUse" x1="0" y1="70" x2="0" y2="222"><stop offset="0" stop-color="#55506D" stop-opacity="0"/><stop offset="1" stop-color="#55506D" stop-opacity=".2"/></linearGradient>'
        + '<linearGradient id="cel-side" gradientUnits="userSpaceOnUse" x1="104" y1="0" x2="196" y2="0"><stop offset="0" stop-color="#55506D" stop-opacity="0"/><stop offset="1" stop-color="#55506D" stop-opacity=".17"/></linearGradient>'
        + '<linearGradient id="cel-top" gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="108"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".28"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
        + '<linearGradient id="cel-left" gradientUnits="userSpaceOnUse" x1="36" y1="0" x2="112" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".18"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
        + '<filter id="soft-shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="1.4" flood-color="#55506D" flood-opacity=".08"/></filter>'
        + '</defs><g filter="url(#soft-shadow)" stroke="#625E77" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
        + shapes
        + "</g></svg>"
    )


out = Path("frontend/public/garments")
out.mkdir(parents=True, exist_ok=True)
for item in items:
    (out / (item["id"] + ".svg")).write_text(art(item) + "\n")

# The fitting renderer and cards consume this same authored artwork.
Path("frontend/data/garmentArtwork.json").write_text(
    json.dumps({item["id"]: art(item) for item in items}, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
)

# Keep the browser's offline catalogue in sync with the Python catalogue.
browser_catalog = Path("frontend/data/wardrobe.json")
if browser_catalog.exists():
    data = json.loads(browser_catalog.read_text())
    data["items"] = items
    data["categories"] = [
        {"id": id, "name": name, "en": en} for id, name, en in [
            ("inner", "インナー上", "INNER TOPS"), ("underwear", "インナー下", "INNER BOTTOMS"), ("tops", "トップス", "TOPS"),
            ("outer", "アウター", "OUTER"), ("bottoms", "ボトムス", "BOTTOMS"),
            ("socks", "靴下", "SOCKS"),
            ("shoes", "シューズ", "SHOES"), ("head", "帽子・ヘア小物", "ACCESSORIES"),
            ("bag", "バッグ", "BAGS"), ("jewelry", "ジュエリー", "JEWELRY"),
        ]
    ]
    browser_catalog.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
