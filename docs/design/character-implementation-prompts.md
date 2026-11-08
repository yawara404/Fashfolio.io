# 試着キャラクター素材の生成記録

方式: 組み込み image_gen（画像生成スキル）。CLI は使用していない。

## サイトで使用する透過PNG

- [少女の顔・髪](../../frontend/public/avatars/jito-girl-v1.png): [採用した元画像](character-jito-generated-v1.png) と同じ内容。元画像から顔と髪だけをSVGの表示領域で取り出す。
- [少年の顔・髪](../../frontend/public/avatars/jito-boy-v1.png): 同じ画風・表情のショートヘア。
- [身体のベース](../../frontend/public/avatars/jito-base-v1.png): 白いTシャツ・ショートパンツ・レギンス。頭部を除く身体部分を表示する。少年と少女で共有。

顔は等比で拡大し、身体と衣装は共通の骨格に沿って5・6・7頭身へ変換する。標準衣装42点はカタログと同じSVG素材。画像生成は開発時に行い、閲覧者のアバター表示に推論APIは必要ない。

## 少女

[初回生成・頭身調整のプロンプト](character-jito-generated-v1.prompt.md)

## 少年のプロンプト

Edit the attached original character image for the matching BOY avatar in the same dress-up app.
Preserve the EXACT same hand-drawn slightly wavering pencil linework, soft pale-gray palette, face shape, sleepy half-lidded horizontal JITO-ME eyes, solid dark irises with NO highlights, NO glints and NO reflective dots, tiny gentle neutral mouth, cheek hatches, front-facing relaxed pose and body-to-head proportions.
Change only the hairstyle and clothes: a cute androgynous anime boy with fluffy tousled SHORT pale-gray hair, soft uneven bangs, tidy short nape, one small stray tuft. Simple white long-sleeve collared shirt with no tie, charcoal-gray straight shorts, opaque light-gray leggings and rounded dark flat shoes. Keep modest full coverage. No accessories.
Use the same centered figure placement as the input, the same head height and face size relative to canvas. One whole character with hands and both shoes fully visible. Genuinely transparent alpha background with no scenery, no halo, no vignette, no text, no cast shadow. Original early-2000s moe hand-drawn character, not a vector drawing or a 3D mannequin.

## 身体ベースのプロンプト

Prepare a neutral fully clothed base layer of this exact hand-drawn character for a layered dress-up website.
Keep the original centered front-facing stance, head, face, sleepy horizontal jito eyes without highlights, hair, hands and body proportions in exactly the same positions as the reference. Preserve the delicate pencil-and-ink shading and pale gray/white palette.
Replace ALL the sailor clothing, skirt, ribbons, tights and shoes with a very simple opaque WHITE close-fitting crew-neck short-sleeve T-shirt, opaque WHITE close-fitting mid-thigh cycling shorts, opaque WHITE leggings and plain white socks. The white shorts and leggings fully cover the lower body. This is a modest neutral sports outfit for fitting clothes over, not underwear. The torso is fully covered and there is no skin exposure apart from forearms, hands, neck and face. No anatomical details on the torso. Clothing should closely follow the body's normal silhouette so other clothing can be layered over it.
Pose: both arms hang down a little away from the torso, hands open and relaxed, feet pointing forward and slightly apart, complete body and both sock-covered feet visible. Same framing and face size as reference. White body outline must be drawn in subtle grey pencil, with very light cool-gray shading.
No extra decorations, no text, no props. Genuinely transparent alpha background, no backdrop, no halo, no floor, no cast shadow. One isolated whole character.

