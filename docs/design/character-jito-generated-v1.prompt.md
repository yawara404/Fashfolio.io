# ジト目・手描き風キャラクターの生成記録

- 方式: 組み込み image_gen（画像生成スキル、CLI は未使用）
- 用途: Fashfolio 試着アバター用のビジュアル案
- 特徴: 平成の萌え絵、ジト目、瞳のハイライトなし、手描きの線、白・薄灰の配色
- 納品画像: character-jito-generated-v1.png
- このPNGの顔と髪を `frontend/public/avatars/jito-girl-v1.png` として試着画面で使用している。元の固定衣装は表示範囲から除き、別の白い服姿の身体素材と、一覧と共通のSVG衣装を合成する。

## 生成プロンプト

Use case: stylized-concept.
Asset type: original full-body character illustration for the Fashfolio anime dress-up web app.
Primary request: ジト目の、平成時代の萌え絵らしい、つくみず画風の手描きキャラクター。可愛さが最優先。人物は一人だけ。正面を向いた、全身のデフォルメの少女。5頭身を守る。
Style: intimate hand-drawn manga illustration, understated early-2000s Japanese doujin moe charm, expressive slightly wavering pencil-and-ink outlines, soft rounded organic silhouettes, simple flat colors with restrained pencil shading. A squishy round face with full lower cheeks and an extremely small rounded chin, relaxed gently sloping shoulders, convincingly connected human arms and legs, small hands with natural fingers. Fluffy slightly uneven pale-gray bob haircut, softly sweeping asymmetrical bangs and loose side locks, one subtle stray tuft.
Expression: sleepy half-lidded JITO-ME eyes with almost horizontal upper eyelids, large deep-slate solid oval irises partially hidden by the lids, absolutely NO eye highlights, NO white glints, NO shiny reflections, NO iris gradients. Tiny dot nose, tiny almost-neutral content mouth, three short diagonal pencil blush strokes on each cheek. Adorably deadpan and gentle, not glamorous.
Palette: white skin #FFFFFF, hair #E2E4EE with a little #C9CCD9 shading, soft ink #524C60, solid eyes #353140. Entire image is neutral white and pale cool gray with darker clothing accents.
Clothes: fully dressed in a simple loose off-white sailor-collar blouse with a small charcoal ribbon, softly pleated charcoal-gray skirt, opaque pale-gray tights and rounded dark flat shoes. Natural soft fabric folds and delicate hand-drawn hems. Outfit is modest and nonsexual.
Composition: one isolated complete character, front-facing relaxed standing pose, both arms slightly away from torso with hands naturally down, feet a little apart. Whole body and both shoes fully visible, centered, consistent frontal proportions suitable for a dress-up character asset, no perspective distortion. Leave a little empty padding around the entire figure.
Background: genuinely transparent alpha, no environment, no floor or cast shadow.
Avoid: text, labels, signature, watermark, panel borders, extra characters, props, scenery, glossy modern gacha rendering, 3D, plastic mannequin, geometric SVG/vector clipart appearance, stiff tubular anatomy, exaggerated waist, pinup posing, exposed torso, bright colors. Especially no dots of light inside either eye.

## 頭身調整プロンプト

Edit the most recently generated full-body grayscale girl illustration.
Preserve the character's exact cute rounded face, sleepy nearly horizontal JITO-ME eyelids, solid dark irises with absolutely no eye glints or highlights, tiny neutral smile, cheek hatches, fluffy bob, muted white/gray palette, delicate slightly wavering hand-drawn pencil linework, and the same fully covering sailor blouse, pleated skirt, opaque tights and flat shoes.
Change the body-to-head proportion to a true FIVE-HEAD-TALL dress-up character. The previous figure is only about 3.5 heads tall. Measure one head from the top of the cranium to the chin, excluding the stray tuft. Total distance from top of cranium to shoe soles must equal five of those head lengths. Make the head smaller relative to the body while preserving all facial features and head shape; extend the torso and legs naturally with clear thighs, knees and calves. Keep gently sloping shoulders and soft normal human anatomy. Keep the relaxed frontal pose with arms a little away from the torso. Both hands and shoes must remain fully visible with generous padding. The expression and hand-drawn early-2000s moe / つくみず風 character appeal should remain the same.
Background must be genuine empty transparent alpha right up to the character edges. Remove the gray glowing vignette around the figure. No black background, no gray background, no halo, no backdrop gradient, no cast shadow, no text, no extra characters. A single isolated finished character.

