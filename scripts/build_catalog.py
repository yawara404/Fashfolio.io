"""Author the original schematic wardrobe; no book scans or remote image copies."""

import json
from pathlib import Path

# id, Japanese name, English description, shape, material, material_en, tags, styles
rows = {
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
    ],
    "outer": [
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
                kind=kind,
                material=material,
                material_en=material_en,
                tags=tags,
                styles=styles,
                colors=[colors[i], "#FCFAF5", "#B6A6B7"],
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
    def path(d, fill=None, extra=""):
        nonlocal serial
        result = f'<path d="{d}" fill="{fill or c}" {extra}/>'
        if fill is None:
            serial += 1
            # Cel shading stays clipped to the original editable clothing outline.
            clip = f"cel-{serial}"
            result += f'<defs><clipPath id="{clip}"><path d="{d}"/></clipPath></defs>'
            result += f'<g clip-path="url(#{clip})" stroke="none"><path d="M0 204Q85 188 240 202V260H0Z" fill="#55506D" opacity=".16"/><path d="M179 0H240V260H170Q204 140 179 0Z" fill="#55506D" opacity=".12"/><path d="M0 0H240V66Q116 43 0 95Z" fill="#FFFFFF" opacity=".34"/><path d="M0 0H42Q22 120 30 260H0Z" fill="#FFFFFF" opacity=".12"/><path d="{d}" fill="none" stroke="#4A4356" stroke-width="5" opacity=".09"/><path d="M214 0H240V260H214Z" fill="#FFFFFF" opacity=".15"/></g>'
        return result

    shapes = ""
    if k in (
        "blouse",
        "lace",
        "sailor",
        "tee",
        "knit",
        "cardigan",
        "blouson",
        "blazer",
        "hoodie",
    ):
        if k == "tee":
            outline = "M75 57 100 46Q120 62 140 46L165 57 202 102 173 124 153 102 157 210H83L87 102 67 124 38 102Z"
        elif k in ("knit", "cardigan", "hoodie"):
            outline = "M76 57 99 45H141L164 57 184 110 191 204 161 211 148 116 155 219H85L92 116 79 211 49 204 56 110Z"
        else:
            outline = "M75 59 99 46 120 57 141 46 165 59 187 111 188 173Q188 185 172 187H160L147 111 154 210Q120 219 86 210L93 111 80 187H68Q52 185 52 173L53 111Z"
        shapes += path(outline)
        if k in ("blouson", "blazer"):
            shapes += path(
                "M100 47 88 72 104 80 98 91 120 119 142 91 136 80 152 72 140 47 120 75Z",
                "#FCFAF5",
            )
        elif k == "hoodie":
            shapes += path(
                "M98 46Q94 20 120 21Q146 20 142 46L120 77Z", "#FCFAF5"
            ) + path("M103 48 107 99M137 48 133 99", "none")
        elif k == "knit":
            shapes += path("M102 30H138V55Q120 68 102 55Z", c) + path(
                "M107 34v20m6-20v23m7-23v25m7-25v23m6-23v20", "none", 'opacity=".5"'
            )
        elif k == "tee":
            shapes += (
                path("M100 46Q120 68 140 46L137 54Q120 73 103 54Z", "#FCFAF5")
                + path("M105 102H135V134H105Z", trim)
                + path("m110 125 10-15 10 15Z", "#FCFAF5")
            )
        else:
            shapes += path(
                "M100 47 120 65 140 47 148 60 130 81 120 65 110 81 92 60Z", "#FCFAF5"
            )
            if k in ("blouse", "sailor", "lace"):
                shapes += path("m120 76-23-8 4 22 19-10 19 10 4-22Z", trim) + path(
                    "m117 81-10 30 13-6 13 6-10-30Z", trim
                )
        if k == "sailor":
            shapes += (
                path(
                    "M87 55 82 79 120 113 158 79 153 55 140 47 120 65 100 47Z",
                    "#D4E2EC",
                )
                + path("m89 67 31 34 31-34", "none")
                + path("m120 101-18 23 18-7 18 7Z", trim)
            )
        if k == "lace":
            shapes += path(
                "M94 51Q85 63 93 70Q87 82 99 83Q103 94 113 82L120 67 127 82Q137 94 141 83Q153 82 147 70Q155 63 146 51L120 66Z",
                "#FCFAF5",
            )
        if k in ("cardigan", "blazer", "blouson", "hoodie"):
            shapes += path("M120 78V216", "none")
            for y in (111, 137, 163, 189):
                shapes += f'<circle cx="124" cy="{y}" r="2" fill="{trim}"/>'
            shapes += path("M91 155H111V178H91Zm38 0h20v23h-20Z", "none")
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
            "M77 45 100 35H140L163 45 184 103 189 172 167 176 149 102 172 224Q120 235 68 224L91 102 73 176 51 172 56 103Z"
        )
        shapes += (
            path(
                "M100 35 90 62 107 74 98 87 126 110 142 87 135 74 150 62 140 35 120 63Z",
                "#F9F0DD",
            )
            + path("M118 92v132M80 129h80v10H80Z", trim)
            + path("M114 128h15v13h-15Z", "#F9F0DD")
        )
        for x in (108, 137):
            for y in (100, 117, 156, 176):
                shapes += f'<circle cx="{x}" cy="{y}" r="2" fill="#8F7D66"/>'
        shapes += path(
            "M87 167 102 157m36 0 15 10M77 217q42 10 85 0", "none", 'opacity=".5"'
        )
    elif k == "cape":
        shapes += (
            path("M101 42H139L146 64Q164 116 194 205Q119 230 46 205Q75 118 94 64Z")
            + path("M101 42V27h38v15L120 58Z", "#FCFAF5")
            + path("M120 58v163", "none")
            + path("M109 66h22v7h-22Z", trim)
            + path("m91 91-27 107m85-107 27 107", "none", 'opacity=".5"')
        )
    elif k in ("skirt", "tiered", "long-skirt"):
        top = 54
        bottom = 224 if k == "long-skirt" else 200
        shapes += path(
            f"M85 {top}H155L184 {bottom}Q120 {bottom+20} 56 {bottom}Z"
        ) + path("M85 54H155V68H85Z", trim)
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
    elif k in ("pants", "cargo", "shorts"):
        b = 150 if k == "shorts" else 224
        shapes += (
            path(f"M83 38H157L169 {b}H132L120 101 108 {b}H71Z")
            + path("M83 38H157V52H83Z", trim)
            + path("M120 52v49M87 58q0 23 22 22m44-22q0 23-22 22", "none")
        )
        if k == "cargo":
            shapes += path("M79 105H105V136H77Zm56 0h26v31h-26Z", trim) + path(
                "M80 112h23m34 0h23", "none"
            )
        shapes += path(f"M74 {b-9}h33m26 0h33", "none")
    elif k in ("maryjanes", "loafers", "sneakers", "sandals", "boots", "long-boots"):
        if k in ("boots", "long-boots"):
            t = 38 if k == "long-boots" else 95
            for dx in (0, 87):
                shapes += (
                    f'<g transform="translate({dx},0)">'
                    + path(f"M47 {t}H94L89 178Q95 182 108 196L108 215H30V198L42 179Z")
                    + path("M31 207H108V221H30Z", trim)
                    + path(f"M49 {t+10}H92", "none")
                )
                if k == "boots":
                    for y in range(113, 180, 13):
                        shapes += path(f"M56 {y}l25 10m-25 0 25-10", "none")
                shapes += "</g>"
        else:
            for dx in (0, 85):
                shapes += (
                    f'<g transform="translate({dx},0)">'
                    + path(
                        "M48 101Q61 92 83 103L88 147Q112 168 111 190L104 208H30L26 190Q27 166 43 148Z"
                    )
                    + path("M27 196Q69 207 110 195L105 214H29Z", trim)
                )
                if k in ("maryjanes", "loafers"):
                    shapes += path(
                        "M46 106Q61 126 84 106L84 138Q66 150 43 137Z", "#FCFAF5"
                    ) + path("M42 143H86V154H42Z", trim)
                elif k == "sneakers":
                    shapes += path("M45 112 40 167Q62 153 88 165L83 114Z", "#FCFAF5")
                    for y in range(120, 163, 12):
                        shapes += path(f"M48 {y}l30 9m-30 0 30-9", "none")
                else:
                    shapes += path("M47 113 87 162 77 173 39 126Z", "#FCFAF5") + path(
                        "M82 114 41 162 51 173 90 126Z", "#FCFAF5"
                    )
                shapes += (
                    path("M36 185Q64 172 102 184", "none", 'opacity=".45"') + "</g>"
                )
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
        + '<filter id="soft-shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#55506D" flood-opacity=".14"/></filter>'
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
    json.dumps({item["id"]: art(item) for item in items}, ensure_ascii=False, indent=2) + "\n"
)

# Keep the browser's offline catalogue in sync with the Python catalogue.
browser_catalog = Path("frontend/data/wardrobe.json")
if browser_catalog.exists():
    data = json.loads(browser_catalog.read_text())
    data["items"] = items
    browser_catalog.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
