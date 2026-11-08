import type { CostumeItem, SlotCategory } from '~/types/costume'

export const TAG_JA_MAP: Record<string, string> = {
  hat: '帽子',
  beret: 'ベレー帽',
  glasses: 'メガネ',
  sunglasses: 'サングラス',
  earrings: 'ピアス・イヤリング',
  hair_ribbon: 'ヘアリボン',
  ribbon: 'リボン',
  headphones: 'ヘッドホン',
  choker: 'チョーカー',
  headdress: 'ヘッドドレス',
  goggles: 'ゴーグル',
  hair_ornament: '髪飾り',
  bow: 'リボン結び',
  jacket: 'ジャケット',
  hoodie: 'パーカー',
  cardigan: 'カーディガン',
  coat: 'コート',
  blazer: 'ブレザー',
  capelet: 'ケープ・肩マント',
  cape: 'マント',
  haori: '羽織',
  leather_jacket: 'レザージャケット',
  windbreaker: 'ウィンドブレーカー',
  trench_coat: 'トレンチコート',
  shirt: 'シャツ',
  't-shirt': 'Tシャツ',
  blouse: 'ブラウス',
  frilled_shirt: 'フリルシャツ',
  frilled_blouse: 'フリルブラウス',
  sweater: 'ニット・セーター',
  turtleneck: 'タートルネック',
  camisole: 'キャミソール',
  crop_top: 'クロップドトップス',
  off_shoulder: 'オフショルダー',
  sailor_collar: 'セーラー襟',
  corset: 'コルセット',
  vest: 'ベスト',
  oversized_shirt: 'ビッグシャツ',
  oversized_clothes: 'オーバーサイズ',
  long_sleeves: '長袖・萌え袖',
  detached_sleeves: '付け袖',
   puffy_sleeves: 'パフスリーブ',
  skirt: 'スカート',
  pleated_skirt: 'プリーツスカート',
  miniskirt: 'ミニスカート',
  long_skirt: 'ロングスカート',
  frilled_skirt: 'フリルスカート',
  plaid_skirt: 'チェック柄スカート',
  hakama_skirt: '袴スカート',
  jeans: 'デニム・ジーンズ',
  denim: 'デニム素材',
  cargo_pants: 'カーゴパンツ',
  pants: 'パンツ',
  shorts: 'ショートパンツ',
  short_shorts: 'ホットパンツ',
   suspender_skirt: 'サスペンダースカート',
  thighhighs: 'ニーハイソックス',
  loose_socks: 'ルーズソックス',
  bobby_socks: 'クルーソックス',
  pantyhose: 'タイツ・ストッキング',
  boots: 'ブーツ',
  ankle_boots: 'ショートブーツ',
  knee_boots: 'ロングブーツ',
  sneakers: 'スニーカー',
  loafers: 'ローファー',
  mary_janes: 'ストラップシューズ・厚底靴',
  high_heels: 'ハイヒール',
  platform_footwear: '厚底シューズ',
  techwear: 'テックウェア',
  cyberpunk: 'サイバーパンク',
  jirai_kei: '地雷系',
  gothic_lolita: 'ゴシックロリータ',
  steampunk: 'スチームパンク',
  china_dress: 'チャイナ服',
  chinese_clothes: '中華風衣装',
  japanese_clothes: '和装・和モダン',
  necktie: 'ネクタイ',
  straps: 'ベルト・ハーネス',
  lace: 'レース装飾',
  frills: 'フリル構造',
  pleats: 'プリーツ折り目'
}

export const COLOR_TAG_HEX_MAP: Array<{ pattern: RegExp; hex: string }> = [
  { pattern: /^black_/, hex: '#18181B' },
  { pattern: /^white_/, hex: '#F4F4F5' },
  { pattern: /^grey_|^gray_|^silver_/, hex: '#94A3B8' },
  { pattern: /^red_|^crimson_|^burgundy_/, hex: '#E11D48' },
  { pattern: /^pink_|^magenta_/, hex: '#F472B6' },
  { pattern: /^blue_|^navy_|^aqua_|^cyan_/, hex: '#38BDF8' },
  { pattern: /^dark_blue_/, hex: '#1E3A8A' },
  { pattern: /^purple_|^violet_|^lavender_/, hex: '#A855F7' },
  { pattern: /^green_|^olive_|^teal_/, hex: '#10B981' },
  { pattern: /^yellow_|^gold_|^blonde_/, hex: '#FACC15' },
  { pattern: /^orange_/, hex: '#FB923C' },
  { pattern: /^brown_|^beige_|^tan_/, hex: '#A16207' }
]

export function inferCategoryFromTags(tags: string[], fallback: SlotCategory = 'tops'): SlotCategory {
  const tagSet = new Set(tags)
  if (
    tagSet.has('boots') ||
    tagSet.has('sneakers') ||
    tagSet.has('loafers') ||
    tagSet.has('mary_janes') ||
    tagSet.has('thighhighs') ||
    tagSet.has('loose_socks') ||
    tagSet.has('shoes') ||
    tagSet.has('footwear') ||
    tagSet.has('ankle_boots') ||
    tagSet.has('knee_boots')
  ) {
    return 'shoes'
  }
  if (
    tagSet.has('pleated_skirt') ||
    tagSet.has('jeans') ||
    tagSet.has('cargo_pants') ||
    tagSet.has('shorts') ||
    tagSet.has('frilled_skirt') ||
    tagSet.has('long_skirt') ||
    tagSet.has('hakama_skirt') ||
    tagSet.has('plaid_skirt') ||
    tagSet.has('miniskirt') ||
    tagSet.has('skirt') ||
    tagSet.has('pants')
  ) {
    return 'bottoms'
  }
  if (
    tagSet.has('jacket') ||
    tagSet.has('hoodie') ||
    tagSet.has('cardigan') ||
    tagSet.has('coat') ||
    tagSet.has('blazer') ||
    tagSet.has('capelet') ||
    tagSet.has('cape') ||
    tagSet.has('haori') ||
    tagSet.has('leather_jacket') ||
    tagSet.has('trench_coat')
  ) {
    return 'outer'
  }
  if (
    tagSet.has('hat') ||
    tagSet.has('beret') ||
    tagSet.has('glasses') ||
    tagSet.has('earrings') ||
    tagSet.has('hair_ribbon') ||
    tagSet.has('headphones') ||
    tagSet.has('choker') ||
    tagSet.has('headdress') ||
    tagSet.has('goggles')
  ) {
    return 'head'
  }
  return fallback
}

export function extractColorsFromTagList(tags: string[], defaultPalette?: string[]): string[] {
  const found: string[] = []
  for (const tag of tags) {
    for (const entry of COLOR_TAG_HEX_MAP) {
      if (entry.pattern.test(tag) && !found.includes(entry.hex)) {
        found.push(entry.hex)
      }
    }
    if (found.length >= 4) break
  }
  const baseDefaults = defaultPalette || ['#18181B', '#6366F1', '#EC4899', '#F4F4F5']
  for (const c of baseDefaults) {
    if (found.length >= 4) break
    if (!found.includes(c)) {
      found.push(c)
    }
  }
  return found.slice(0, 4)
}

export function translateTagsToJa(tags: string[]): string[] {
  const result: string[] = []
  for (const t of tags) {
    if (TAG_JA_MAP[t] && !result.includes(TAG_JA_MAP[t])) {
      result.push(TAG_JA_MAP[t])
    }
    if (result.length >= 5) break
  }
  return result
}

export function generateArtistTip(category: SlotCategory, tags: string[]): string {
  if (category === 'head') {
    if (tags.includes('beret') || tags.includes('hat')) {
      return '頭蓋骨の丸みに沿わせつつ、斜めに傾けるとシルエットに動きが出ます。髪の 묶り目やサイドの毛束との重なりを意識。'
    }
    if (tags.includes('headphones')) {
      return 'イヤーパッドの厚みとアームの楕円パースに注意。首掛け状態にしても顔周りの情報量アップに有効。'
    }
    return '顔周りの視線誘導パーツ。ハイライトを強めに入れると瞳や表情が引き立ちます。'
  }
  if (category === 'outer') {
    if (tags.includes('hoodie') || tags.includes('oversized_clothes')) {
      return '肩の縫い目（ドロップショルダー）を本来の肩より落とし、肘の内側と袖口に大きめの布溜まり（たわみシワ）を作ると自然。'
    }
    if (tags.includes('jacket') || tags.includes('coat')) {
      return '襟元の折り返し（ラペル）の立体感と、脇から肘にかけての引っ張りシワを描き分けると厚手生地の質感が出ます。'
    }
    return 'インナーとの間に少し空気の隙間（影色）を入れると、重ね着の奥行きが際立ちます。'
  }
  if (category === 'tops') {
    if (tags.includes('frilled_shirt') || tags.includes('blouse') || tags.includes('jirai_kei')) {
      return 'フリルは1枚ずつ描くのではなく「波打つリボン状の面」として捉え、表と裏を交互に配置すると立体的に見えます。'
    }
    if (tags.includes('crop_top')) {
      return '裾とウエストの肌見せラインのコントラストが鍵。肋骨から骨盤へのくびれラインを意識して裾の楕円を描きます。'
    }
    return '鎖骨・胸元・肩甲骨の張り出しを起点に、重力方向へ流れるY字・X字シワを整理して配置しましょう。'
  }
  if (category === 'bottoms') {
    if (tags.includes('pleated_skirt')) {
      return 'ウエスト帯から裾へ向かってヒダの幅が少しずつ広がる台形を意識。裾のジグザグの奥側（裏面）に濃い影を落とすと一気に立体的になります。'
    }
    if (tags.includes('cargo_pants') || tags.includes('jeans')) {
      return '股関節のV字シワ、膝裏のひし形シワ、裾が靴の上に乗るクッション（たるみ）の3箇所を押さえると説得力が倍増します。'
    }
    return '腰の傾き（コントラポスト）に合わせてベルトラインの楕円角度を傾けると立ち姿が自然になります。'
  }
  // shoes
  if (tags.includes('thighhighs')) {
    return '太ももの食い込み（絶対領域のぷにっとした膨らみ）と、膝皿・くるぶしの骨格の凹凸を意識して境界線を引きましょう。'
  }
  if (tags.includes('loose_socks')) {
    return '足首に向かって重力で重なるアコーディオン状の輪っかシワを3〜4段に分けて塊で捉えると綺麗にまとまります。'
  }
  return '靴底（ソール）の厚みと地面の接地影をしっかり描くことで、キャラクター全体の重心と安定感が生まれます。'
}

/**
 * Generates an inline SVG data URI studio illustration card for curated items
 * so that every curated costume item displays a crisp, high-contrast schematic & color card
 * even in restricted network environments.
 */
function buildFashionCardSvg(params: {
  title: string
  subtitle: string
  category: SlotCategory
  colors: string[]
  sourceLabel: string
  badge: string
}): string {
  const [c1 = '#18181b', c2 = '#6366f1', c3 = '#ec4899', c4 = '#f4f4f5'] = params.colors
  const silhouettePath = getCategorySilhouetteSvg(params.category, c2, c3, c4)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 600" width="480" height="600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="60%" stop-color="#111116" />
        <stop offset="100%" stop-color="#09090b" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="42%" r="48%">
        <stop offset="0%" stop-color="${c2}" stop-opacity="0.38" />
        <stop offset="60%" stop-color="${c3}" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="480" height="600" fill="url(#bg)" />
    <rect width="480" height="600" fill="url(#grid)" />
    <circle cx="240" cy="255" r="210" fill="url(#glow)" />

    <!-- Top Technical Header -->
    <g transform="translate(28, 26)">
      <rect x="0" y="0" width="128" height="26" rx="13" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />
      <text x="64" y="17" text-anchor="middle" fill="#e4e4e7" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="0.8">${params.sourceLabel}</text>
      <rect x="312" y="0" width="112" height="26" rx="13" fill="${c2}" fill-opacity="0.22" stroke="${c2}" stroke-opacity="0.6" />
      <text x="368" y="17" text-anchor="middle" fill="#f4f4f5" font-family="sans-serif" font-size="11" font-weight="600">${params.badge}</text>
    </g>

    <!-- Construction Guidelines -->
    <line x1="240" y1="75" x2="240" y2="440" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4 4" />
    <line x1="80" y1="255" x2="400" y2="255" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 4" />

    <!-- Garment Silhouette & Fold Lines -->
    <g transform="translate(0, 10)">
      ${silhouettePath}
    </g>

    <!-- Color Swatch Pills -->
    <g transform="translate(28, 462)">
      <circle cx="14" cy="14" r="11" fill="${c1}" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.5"/>
      <circle cx="44" cy="14" r="11" fill="${c2}" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.5"/>
      <circle cx="74" cy="14" r="11" fill="${c3}" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.5"/>
      <circle cx="104" cy="14" r="11" fill="${c4}" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.5"/>
      <text x="128" y="18" fill="#a1a1aa" font-family="monospace" font-size="11">${c2} · ${c3}</text>
    </g>

    <!-- Title Footer Box -->
    <g transform="translate(24, 502)">
      <rect width="432" height="74" rx="14" fill="rgba(9,9,11,0.82)" stroke="rgba(255,255,255,0.12)" />
      <text x="20" y="31" fill="#fafafa" font-family="sans-serif" font-size="17" font-weight="700">${params.title}</text>
      <text x="20" y="54" fill="#a1a1aa" font-family="sans-serif" font-size="12">${params.subtitle}</text>
    </g>
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function getCategorySilhouetteSvg(category: SlotCategory, c2: string, c3: string, c4: string): string {
  switch (category) {
    case 'head':
      return `
        <!-- Head & Beret / Ribbon / Headphones Schematic -->
        <circle cx="240" cy="260" r="78" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2" stroke-dasharray="5 4" />
        <path d="M145 215 C140 155, 295 135, 345 190 C360 208, 330 232, 295 228 C235 220, 175 225, 145 215 Z" fill="${c2}" fill-opacity="0.82" stroke="${c4}" stroke-width="2.5" />
        <path d="M168 216 Q240 202 316 222" fill="none" stroke="${c3}" stroke-width="4" />
        <!-- Ribbon / Side Accent -->
        <path d="M310 198 L355 178 L342 212 L364 235 L318 220 Z" fill="${c3}" stroke="${c4}" stroke-width="2" />
        <circle cx="245" cy="152" r="6" fill="${c4}" />
        <!-- Glasses / Frame -->
        <rect x="178" y="250" width="52" height="32" rx="10" fill="none" stroke="${c4}" stroke-width="2.5" />
        <rect x="250" y="250" width="52" height="32" rx="10" fill="none" stroke="${c4}" stroke-width="2.5" />
        <line x1="230" y1="264" x2="250" y2="264" stroke="${c4}" stroke-width="2.5" />
      `
    case 'outer':
      return `
        <!-- Outer Jacket / Hoodie Silhouette with Wrinkle Lines -->
        <path d="M165 135 L205 118 L275 118 L315 135 L378 215 L346 375 L302 365 L312 230 L296 385 L184 385 L168 230 L178 365 L134 375 L102 215 Z" fill="${c2}" fill-opacity="0.8" stroke="${c4}" stroke-width="2.5" stroke-linejoin="round" />
        <!-- Lapels & Zip -->
        <path d="M205 118 L240 210 L275 118" fill="none" stroke="${c4}" stroke-width="2.5" />
        <line x1="240" y1="210" x2="240" y2="385" stroke="${c3}" stroke-width="3" />
        <!-- Elbow & Sleeve Fold Lines -->
        <path d="M132 275 Q155 288 172 272" fill="none" stroke="${c4}" stroke-width="2" />
        <path d="M136 335 Q158 348 176 332" fill="none" stroke="${c3}" stroke-width="2" />
        <path d="M348 275 Q325 288 308 272" fill="none" stroke="${c4}" stroke-width="2" />
        <path d="M344 335 Q322 348 304 332" fill="none" stroke="${c3}" stroke-width="2" />
        <!-- Pocket Straps -->
        <rect x="195" y="295" width="32" height="42" rx="4" fill="none" stroke="${c3}" stroke-width="2" />
        <rect x="253" y="295" width="32" height="42" rx="4" fill="none" stroke="${c3}" stroke-width="2" />
      `
    case 'tops':
      return `
        <!-- Tops / Blouse / Crop Top with Collar & Ribbon -->
        <path d="M172 145 L210 130 L240 158 L270 130 L308 145 L356 225 L316 250 L295 205 L295 348 L185 348 L185 205 L164 250 L124 225 Z" fill="${c2}" fill-opacity="0.82" stroke="${c4}" stroke-width="2.5" stroke-linejoin="round" />
        <!-- Sailor / Frill Collar -->
        <path d="M192 138 L240 212 L288 138" fill="none" stroke="${c3}" stroke-width="3" />
        <!-- Chest Ribbon -->
        <path d="M240 192 L212 226 L232 232 L240 205 L248 232 L268 226 Z" fill="${c3}" stroke="${c4}" stroke-width="1.8" />
        <!-- Tension & Drape Wrinkles -->
        <path d="M210 245 Q240 258 270 245" fill="none" stroke="${c4}" stroke-width="1.8" stroke-opacity="0.8" />
        <path d="M202 315 Q240 330 278 315" fill="none" stroke="${c4}" stroke-width="1.8" stroke-opacity="0.8" />
      `
    case 'bottoms':
      return `
        <!-- Pleated Skirt / Cargo Bottoms Silhouette -->
        <rect x="176" y="140" width="128" height="28" rx="4" fill="${c3}" fill-opacity="0.85" stroke="${c4}" stroke-width="2.5" />
        <path d="M176 168 L128 365 L168 378 L195 362 L222 380 L240 364 L258 380 L285 362 L312 378 L352 365 L304 168 Z" fill="${c2}" fill-opacity="0.82" stroke="${c4}" stroke-width="2.5" stroke-linejoin="round" />
        <!-- Pleat Fold Lines -->
        <line x1="196" y1="168" x2="168" y2="376" stroke="${c4}" stroke-width="2" stroke-opacity="0.85" />
        <line x1="218" y1="168" x2="195" y2="362" stroke="${c4}" stroke-width="1.6" stroke-opacity="0.6" />
        <line x1="240" y1="168" x2="240" y2="364" stroke="${c4}" stroke-width="2" stroke-opacity="0.85" />
        <line x1="262" y1="168" x2="285" y2="362" stroke="${c4}" stroke-width="1.6" stroke-opacity="0.6" />
        <line x1="284" y1="168" x2="312" y2="376" stroke="${c4}" stroke-width="2" stroke-opacity="0.85" />
        <!-- Belt Accent -->
        <rect x="226" y="137" width="28" height="34" rx="4" fill="none" stroke="${c4}" stroke-width="2.5" />
      `
    case 'shoes':
      return `
        <!-- Thighhighs + Platform Boots Silhouette -->
        <!-- Left Leg / Boot -->
        <path d="M168 125 L218 125 L212 285 L228 338 L228 378 L146 378 L146 346 L168 320 Z" fill="${c2}" fill-opacity="0.82" stroke="${c4}" stroke-width="2.5" stroke-linejoin="round" />
        <rect x="142" y="366" width="90" height="22" rx="6" fill="${c3}" stroke="${c4}" stroke-width="2.2" />
        <!-- Right Leg / Boot -->
        <path d="M262 125 L312 125 L312 320 L334 346 L334 378 L252 378 L252 338 L268 285 Z" fill="${c2}" fill-opacity="0.82" stroke="${c4}" stroke-width="2.5" stroke-linejoin="round" />
        <rect x="248" y="366" width="90" height="22" rx="6" fill="${c3}" stroke="${c4}" stroke-width="2.2" />
        <!-- Lace / Strap Lines -->
        <line x1="168" y1="152" x2="216" y2="152" stroke="${c3}" stroke-width="4" />
        <line x1="264" y1="152" x2="312" y2="152" stroke="${c3}" stroke-width="4" />
        <line x1="172" y1="265" x2="210" y2="265" stroke="${c4}" stroke-width="2.2" />
        <line x1="172" y1="288" x2="212" y2="288" stroke="${c4}" stroke-width="2.2" />
        <line x1="268" y1="265" x2="308" y2="265" stroke="${c4}" stroke-width="2.2" />
        <line x1="268" y1="288" x2="308" y2="288" stroke="${c4}" stroke-width="2.2" />
      `
  }
}

export const CURATED_DANBOORU_ITEMS: CostumeItem[] = [
  // HEAD / ACCESSORY
  {
    id: 'db-head-y2k-headphones',
    title: 'Y2K メタリックヘッドホン＆ヘアピン',
    imageUrl: buildFashionCardSvg({
      title: 'Y2K Metallic Headphones',
      subtitle: 'headphones · hairclip · cyber_y2k',
      category: 'head',
      colors: ['#1E1B2E', '#EC4899', '#38BDF8', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'HEAD / ACC'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Y2K Metallic Headphones',
      subtitle: 'headphones · hairclip · cyber_y2k',
      category: 'head',
      colors: ['#1E1B2E', '#EC4899', '#38BDF8', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'HEAD / ACC'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=headphones+rating%3Ag',
    source: 'danbooru',
    category: 'head',
    styleIds: ['y2k', 'cyberpunk', 'oversized'],
    tags: ['headphones', 'hairclip', 'star_hair_ornament', 'choker'],
    tagsJa: ['ヘッドホン', 'ヘアピン', '星型髪飾り', 'チョーカー'],
    dominantColors: ['#1E1B2E', '#EC4899', '#38BDF8', '#F8FAFC'],
    artistTip: 'イヤーパッドの楕円パースを顔の向きと揃え、シルバーのハイライトを強く入れるとY2Kらしい質感になります。'
  },
  {
    id: 'db-head-jirai-ribbon',
    title: 'ツインテール用サテンビッグリボン＆十字架ピアス',
    imageUrl: buildFashionCardSvg({
      title: 'Jirai-Kei Twin Satin Ribbons',
      subtitle: 'hair_ribbon · cross_earrings · lace',
      category: 'head',
      colors: ['#141115', '#F472B6', '#2E1F27', '#FBCFE8'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'HEAD / ACC'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Jirai-Kei Twin Satin Ribbons',
      subtitle: 'hair_ribbon · cross_earrings · lace',
      category: 'head',
      colors: ['#141115', '#F472B6', '#2E1F27', '#FBCFE8'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'HEAD / ACC'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=hair_ribbon+jirai_kei+rating%3Ag',
    source: 'danbooru',
    category: 'head',
    styleIds: ['jirai-kei', 'ryousangata', 'yamikawa', 'gothic-lolita'],
    tags: ['hair_ribbon', 'earrings', 'choker', 'jirai_kei', 'lace'],
    tagsJa: ['ヘアリボン', 'ピアス・イヤリング', 'チョーカー', '地雷系', 'レース装飾'],
    dominantColors: ['#141115', '#F472B6', '#2E1F27', '#FBCFE8'],
    artistTip: '結び目の中央にパールやハートビジューを描き足し、垂れ下がるリボン端にレースを入れると情報量が跳ね上がります。'
  },
  {
    id: 'db-head-classic-beret',
    title: 'クラシカル・ウールベレー帽＆丸メガネ',
    imageUrl: buildFashionCardSvg({
      title: 'Classic Wool Beret & Eyewear',
      subtitle: 'beret · round_glasses · preppy',
      category: 'head',
      colors: ['#291D18', '#B45309', '#5C4033', '#FEF3C7'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'HEAD / ACC'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Classic Wool Beret & Eyewear',
      subtitle: 'beret · round_glasses · preppy',
      category: 'head',
      colors: ['#291D18', '#B45309', '#5C4033', '#FEF3C7'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'HEAD / ACC'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=beret+glasses+rating%3Ag',
    source: 'danbooru',
    category: 'head',
    styleIds: ['ivy-preppy', 'retro-vintage', 'k-street'],
    tags: ['beret', 'glasses', 'hat', 'earrings'],
    tagsJa: ['ベレー帽', 'メガネ', '帽子', 'ピアス'],
    dominantColors: ['#291D18', '#B45309', '#5C4033', '#FEF3C7'],
    artistTip: 'ベレー帽は被り口のリブ帯を少し見せて斜めに傾けると、前髪やサイドの毛束が潰れず可愛く収まります。'
  },
  {
    id: 'db-head-steampunk-goggles',
    title: '真鍮スチームパンクゴーグル＆シルクハット飾り',
    imageUrl: buildFashionCardSvg({
      title: 'Brass Steampunk Goggles & Hat',
      subtitle: 'goggles · steampunk · hat',
      category: 'head',
      colors: ['#1C1411', '#D97706', '#92400E', '#E7E5E4'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'HEAD / ACC'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Brass Steampunk Goggles & Hat',
      subtitle: 'goggles · steampunk · hat',
      category: 'head',
      colors: ['#1C1411', '#D97706', '#92400E', '#E7E5E4'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'HEAD / ACC'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=goggles+steampunk+rating%3Ag',
    source: 'danbooru',
    category: 'head',
    styleIds: ['steampunk', 'knight-cloak', 'cyberpunk'],
    tags: ['goggles', 'steampunk', 'hat', 'hair_ornament'],
    tagsJa: ['ゴーグル', 'スチームパンク', '帽子', '髪飾り'],
    dominantColors: ['#1C1411', '#D97706', '#92400E', '#E7E5E4'],
    artistTip: 'レンズの円筒の厚み（リムの2重楕円）と革ベルトのバックル留め具を描き込むと重厚感が出ます。'
  },

  // OUTER
  {
    id: 'db-outer-techwear-jacket',
    title: 'タクティカル・ハイネックマウンテンジャケット',
    imageUrl: buildFashionCardSvg({
      title: 'Tactical High-Neck Shell Jacket',
      subtitle: 'techwear · jacket · straps · hoodie',
      category: 'outer',
      colors: ['#090D16', '#10B981', '#334155', '#E2E8F0'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Tactical High-Neck Shell Jacket',
      subtitle: 'techwear · jacket · straps · hoodie',
      category: 'outer',
      colors: ['#090D16', '#10B981', '#334155', '#E2E8F0'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=techwear+jacket+rating%3Ag',
    source: 'danbooru',
    category: 'outer',
    styleIds: ['techwear', 'cyberpunk', 'oversized'],
    tags: ['techwear', 'jacket', 'hoodie', 'straps', 'long_sleeves'],
    tagsJa: ['テックウェア', 'ジャケット', 'パーカー', 'ベルト・ハーネス', '長袖・萌え袖'],
    dominantColors: ['#090D16', '#10B981', '#334155', '#E2E8F0'],
    artistTip: '口元まで覆う高いスタンドカラーと、硬めの撥水ナイロン特有の直線的・鋭角な折れシワを意識するとテック感が出ます。'
  },
  {
    id: 'db-outer-oversized-hoodie',
    title: 'ドロップショルダー・オーバーサイズパーカー',
    imageUrl: buildFashionCardSvg({
      title: 'Drop-Shoulder Oversized Hoodie',
      subtitle: 'hoodie · oversized_clothes · long_sleeves',
      category: 'outer',
      colors: ['#18181B', '#8B5CF6', '#F472B6', '#F4F4F5'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Drop-Shoulder Oversized Hoodie',
      subtitle: 'hoodie · oversized_clothes · long_sleeves',
      category: 'outer',
      colors: ['#18181B', '#8B5CF6', '#F472B6', '#F4F4F5'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=oversized_clothes+hoodie+rating%3Ag',
    source: 'danbooru',
    category: 'outer',
    styleIds: ['oversized', 'yamikawa', 'y2k', 'k-street'],
    tags: ['hoodie', 'oversized_clothes', 'long_sleeves', 'jacket'],
    tagsJa: ['パーカー', 'オーバーサイズ', '長袖・萌え袖', 'ジャケット'],
    dominantColors: ['#18181B', '#8B5CF6', '#F472B6', '#F4F4F5'],
    artistTip: '袖口のリブの上にたぷっと溜まる布のボリュームを大きく描き、指先だけ覗かせると華奢さが強調されます。'
  },
  {
    id: 'db-outer-preppy-blazer',
    title: '金ボタン・エンブレム付きショートブレザー',
    imageUrl: buildFashionCardSvg({
      title: 'Emblem Tailored Short Blazer',
      subtitle: 'blazer · cardigan · preppy',
      category: 'outer',
      colors: ['#0F172A', '#1E3A8A', '#D97706', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Emblem Tailored Short Blazer',
      subtitle: 'blazer · cardigan · preppy',
      category: 'outer',
      colors: ['#0F172A', '#1E3A8A', '#D97706', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=blazer+rating%3Ag',
    source: 'danbooru',
    category: 'outer',
    styleIds: ['ivy-preppy', 'k-street', 'retro-vintage'],
    tags: ['blazer', 'jacket', 'cardigan', 'long_sleeves'],
    tagsJa: ['ブレザー', 'ジャケット', 'カーディガン', '長袖・萌え袖'],
    dominantColors: ['#0F172A', '#1E3A8A', '#D97706', '#F8FAFC'],
    artistTip: '肩パッドの入った端正な肩ラインとウエストのシェイプを意識。ラペルの刻み（ノッチ）を正確に描くと品が出ます。'
  },
  {
    id: 'db-outer-knight-capelet',
    title: '金モール肩章＆アシンメトリー騎士ケープ',
    imageUrl: buildFashionCardSvg({
      title: 'Royal Knight Epaulette Capelet',
      subtitle: 'capelet · cape · epaulettes',
      category: 'outer',
      colors: ['#0F172A', '#EAB308', '#991B1B', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Royal Knight Epaulette Capelet',
      subtitle: 'capelet · cape · epaulettes',
      category: 'outer',
      colors: ['#0F172A', '#EAB308', '#991B1B', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=capelet+rating%3Ag',
    source: 'danbooru',
    category: 'outer',
    styleIds: ['knight-cloak', 'gothic-lolita', 'steampunk'],
    tags: ['capelet', 'cape', 'coat', 'jacket'],
    tagsJa: ['ケープ・肩マント', 'マント', 'コート', 'ジャケット'],
    dominantColors: ['#0F172A', '#EAB308', '#991B1B', '#F8FAFC'],
    artistTip: 'マントの表地（濃紺や黒）と裏地（深紅や金）の色を分けると、風になびいた瞬間のシルエットが一気に映えます。'
  },
  {
    id: 'db-outer-wa-haori',
    title: '和モダン・タッセル付き刺繍羽織コート',
    imageUrl: buildFashionCardSvg({
      title: 'Wa-Modern Embroidered Haori',
      subtitle: 'haori · japanese_clothes · chinese_clothes',
      category: 'outer',
      colors: ['#131620', '#BE123C', '#D97706', '#F1F5F9'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Wa-Modern Embroidered Haori',
      subtitle: 'haori · japanese_clothes · chinese_clothes',
      category: 'outer',
      colors: ['#131620', '#BE123C', '#D97706', '#F1F5F9'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'OUTER'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=haori+rating%3Ag',
    source: 'danbooru',
    category: 'outer',
    styleIds: ['wa-modern', 'chinese-modern'],
    tags: ['haori', 'japanese_clothes', 'chinese_clothes', 'jacket'],
    tagsJa: ['羽織', '和装・和モダン', '中華風衣装', 'ジャケット'],
    dominantColors: ['#131620', '#BE123C', '#D97706', '#F1F5F9'],
    artistTip: '大きく垂れ下がる袂（たもと）の曲線と、腕を上げたときに袖口から覗くインナーや二の腕の対比が見どころです。'
  },

  // TOPS
  {
    id: 'db-tops-jirai-blouse',
    title: 'ヨークフリル＆リボンタイ・バイカラーブラウス',
    imageUrl: buildFashionCardSvg({
      title: 'Bicolor Frill & Ribbon Blouse',
      subtitle: 'frilled_blouse · jirai_kei · ribbon',
      category: 'tops',
      colors: ['#141115', '#F472B6', '#FBCFE8', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'TOPS'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Bicolor Frill & Ribbon Blouse',
      subtitle: 'frilled_blouse · jirai_kei · ribbon',
      category: 'tops',
      colors: ['#141115', '#F472B6', '#FBCFE8', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'TOPS'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=frilled_shirt+jirai_kei+rating%3Ag',
    source: 'danbooru',
    category: 'tops',
    styleIds: ['jirai-kei', 'ryousangata', 'gothic-lolita'],
    tags: ['frilled_shirt', 'frilled_blouse', 'blouse', 'jirai_kei', 'ribbon'],
    tagsJa: ['フリルシャツ', 'フリルブラウス', 'ブラウス', '地雷系', 'リボン'],
    dominantColors: ['#141115', '#F472B6', '#FBCFE8', '#F8FAFC'],
    artistTip: '肩から胸元へ走るハシゴレースとパフスリーブのギャザーを丁寧に描くと、正面バストアップ構図の密度が格段に上がります。'
  },
  {
    id: 'db-tops-y2k-croptop',
    title: 'レイヤード・ホルターネック＆クロップドチビT',
    imageUrl: buildFashionCardSvg({
      title: 'Y2K Layered Halter Crop Top',
      subtitle: 'crop_top · camisole · t-shirt',
      category: 'tops',
      colors: ['#1E1B2E', '#EC4899', '#38BDF8', '#E2E8F0'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'TOPS'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Y2K Layered Halter Crop Top',
      subtitle: 'crop_top · camisole · t-shirt',
      category: 'tops',
      colors: ['#1E1B2E', '#EC4899', '#38BDF8', '#E2E8F0'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'TOPS'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=crop_top+rating%3Ag',
    source: 'danbooru',
    category: 'tops',
    styleIds: ['y2k', 'k-street', 'cyberpunk', 'punk'],
    tags: ['crop_top', 'camisole', 't-shirt', 'off_shoulder'],
    tagsJa: ['クロップドトップス', 'キャミソール', 'Tシャツ', 'オフショルダー'],
    dominantColors: ['#1E1B2E', '#EC4899', '#38BDF8', '#E2E8F0'],
    artistTip: '首の後ろへ回るホルターストラップと鎖骨のラインを組み合わせると、首元〜肩周りの抜け感が美しく表現できます。'
  },
  {
    id: 'db-tops-china-top',
    title: '盤扣（チャイナボタン）＆パイピング立ち襟トップス',
    imageUrl: buildFashionCardSvg({
      title: 'Mandarin Collar Qipao Blouse',
      subtitle: 'china_dress · chinese_clothes · blouse',
      category: 'tops',
      colors: ['#111115', '#991B1B', '#EAB308', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'TOPS'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Mandarin Collar Qipao Blouse',
      subtitle: 'china_dress · chinese_clothes · blouse',
      category: 'tops',
      colors: ['#111115', '#991B1B', '#EAB308', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'TOPS'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=chinese_clothes+shirt+rating%3Ag',
    source: 'danbooru',
    category: 'tops',
    styleIds: ['chinese-modern', 'wa-modern'],
    tags: ['chinese_clothes', 'china_dress', 'blouse', 'detached_sleeves'],
    tagsJa: ['中華風衣装', 'チャイナ服', 'ブラウス', '付け袖'],
    dominantColors: ['#111115', '#991B1B', '#EAB308', '#F8FAFC'],
    artistTip: '立ち襟（マンダリンカラー）から斜めに走る合わせラインと金色の飾り結び（盤扣）が視線を集めるアクセントになります。'
  },
  {
    id: 'db-tops-preppy-sweater',
    title: 'シャツ重ね着・チルデンケーブルニット＆ネクタイ',
    imageUrl: buildFashionCardSvg({
      title: 'Cable Knit Vest & Tie Shirt',
      subtitle: 'sweater · shirt · necktie',
      category: 'tops',
      colors: ['#0F172A', '#1E3A8A', '#D97706', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'TOPS'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Cable Knit Vest & Tie Shirt',
      subtitle: 'sweater · shirt · necktie',
      category: 'tops',
      colors: ['#0F172A', '#1E3A8A', '#D97706', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'TOPS'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=sweater+necktie+rating%3Ag',
    source: 'danbooru',
    category: 'tops',
    styleIds: ['ivy-preppy', 'retro-vintage', 'oversized'],
    tags: ['sweater', 'shirt', 'necktie', 'blouse'],
    tagsJa: ['ニット・セーター', 'シャツ', 'ネクタイ', 'ブラウス'],
    dominantColors: ['#0F172A', '#1E3A8A', '#D97706', '#F8FAFC'],
    artistTip: 'Vネックのリブに沿った2本ラインで体の立体的な丸みを表現し、裾から少し白シャツを覗かせるとこなれ感が出ます。'
  },

  // BOTTOMS
  {
    id: 'db-bottoms-pleated-skirt',
    title: 'ハイウエスト・ベルト付きボックスプリーツスカート',
    imageUrl: buildFashionCardSvg({
      title: 'High-Waist Box Pleated Skirt',
      subtitle: 'pleated_skirt · miniskirt · straps',
      category: 'bottoms',
      colors: ['#18181B', '#EC4899', '#3F3F46', '#F4F4F5'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'BOTTOMS'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'High-Waist Box Pleated Skirt',
      subtitle: 'pleated_skirt · miniskirt · straps',
      category: 'bottoms',
      colors: ['#18181B', '#EC4899', '#3F3F46', '#F4F4F5'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'BOTTOMS'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=pleated_skirt+rating%3Ag',
    source: 'danbooru',
    category: 'bottoms',
    styleIds: ['jirai-kei', 'k-street', 'ivy-preppy', 'y2k', 'punk'],
    tags: ['pleated_skirt', 'miniskirt', 'skirt', 'plaid_skirt'],
    tagsJa: ['プリーツスカート', 'ミニスカート', 'スカート', 'チェック柄スカート'],
    dominantColors: ['#18181B', '#EC4899', '#3F3F46', '#F4F4F5'],
    artistTip: '腰骨の高さでキュッと締め、裾に向かってふわっと広がるAラインを作ると太ももとの対比で脚が長く美しく見えます。'
  },
  {
    id: 'db-bottoms-tech-cargo',
    title: 'マルチポケット＆ウェービングベルト・カーゴパンツ',
    imageUrl: buildFashionCardSvg({
      title: 'Techwear Strap Cargo Pants',
      subtitle: 'cargo_pants · techwear · straps',
      category: 'bottoms',
      colors: ['#090D16', '#1E293B', '#10B981', '#94A3B8'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'BOTTOMS'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Techwear Strap Cargo Pants',
      subtitle: 'cargo_pants · techwear · straps',
      category: 'bottoms',
      colors: ['#090D16', '#1E293B', '#10B981', '#94A3B8'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'BOTTOMS'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=cargo_pants+rating%3Ag',
    source: 'danbooru',
    category: 'bottoms',
    styleIds: ['techwear', 'cyberpunk', 'oversized', 'y2k'],
    tags: ['cargo_pants', 'pants', 'techwear', 'straps'],
    tagsJa: ['カーゴパンツ', 'パンツ', 'テックウェア', 'ベルト・ハーネス'],
    dominantColors: ['#090D16', '#1E293B', '#10B981', '#94A3B8'],
    artistTip: '太もも横のマチ付きポケットの立体感と、足首をジョガーリブで絞ったバルーンシルエットが格好良く決まるポイントです。'
  },
  {
    id: 'db-bottoms-gothic-frill',
    title: '多段ティアードレース＆コルセット風フリルスカート',
    imageUrl: buildFashionCardSvg({
      title: 'Corset Tiered Frill Skirt',
      subtitle: 'frilled_skirt · gothic_lolita · lace',
      category: 'bottoms',
      colors: ['#09090B', '#7F1D1D', '#D4AF37', '#F4F4F5'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'BOTTOMS'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Corset Tiered Frill Skirt',
      subtitle: 'frilled_skirt · gothic_lolita · lace',
      category: 'bottoms',
      colors: ['#09090B', '#7F1D1D', '#D4AF37', '#F4F4F5'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'BOTTOMS'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=frilled_skirt+gothic_lolita+rating%3Ag',
    source: 'danbooru',
    category: 'bottoms',
    styleIds: ['gothic-lolita', 'ryousangata', 'steampunk'],
    tags: ['frilled_skirt', 'gothic_lolita', 'skirt', 'lace', 'corset'],
    tagsJa: ['フリルスカート', 'ゴシックロリータ', 'スカート', 'レース装飾', 'コルセット'],
    dominantColors: ['#09090B', '#7F1D1D', '#D4AF37', '#F4F4F5'],
    artistTip: 'ハイウエストの編み上げコルセットでくびれを作り、パニエでドーム状に膨らむ3段フリルのリズムを描き分けます。'
  },
  {
    id: 'db-bottoms-wa-hakama',
    title: '和モダン・深プリーツロング袴スカート',
    imageUrl: buildFashionCardSvg({
      title: 'Modern Pleated Hakama Skirt',
      subtitle: 'hakama_skirt · long_skirt · japanese_clothes',
      category: 'bottoms',
      colors: ['#131620', '#312E81', '#BE123C', '#F1F5F9'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'BOTTOMS'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Modern Pleated Hakama Skirt',
      subtitle: 'hakama_skirt · long_skirt · japanese_clothes',
      category: 'bottoms',
      colors: ['#131620', '#312E81', '#BE123C', '#F1F5F9'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'BOTTOMS'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=hakama_skirt+rating%3Ag',
    source: 'danbooru',
    category: 'bottoms',
    styleIds: ['wa-modern', 'retro-vintage'],
    tags: ['hakama_skirt', 'long_skirt', 'pleated_skirt', 'japanese_clothes'],
    tagsJa: ['袴スカート', 'ロングスカート', 'プリーツスカート', '和装・和モダン'],
    dominantColors: ['#131620', '#312E81', '#BE123C', '#F1F5F9'],
    artistTip: '中心に向かって深く折られた独特のヒダ構造と、腰横の笹ヒダ（隙間）のディテールを入れると本物らしさが出ます。'
  },

  // SHOES / LEGWEAR
  {
    id: 'db-shoes-thighhigh-boots',
    title: 'レースアップ厚底コンバットブーツ＆ガーターニーハイ',
    imageUrl: buildFashionCardSvg({
      title: 'Thighhighs & Platform Combat Boots',
      subtitle: 'thighhighs · boots · platform_footwear',
      category: 'shoes',
      colors: ['#141115', '#EC4899', '#27272A', '#F4F4F5'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'SHOES / LEG'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Thighhighs & Platform Combat Boots',
      subtitle: 'thighhighs · boots · platform_footwear',
      category: 'shoes',
      colors: ['#141115', '#EC4899', '#27272A', '#F4F4F5'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'SHOES / LEG'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=thighhighs+boots+rating%3Ag',
    source: 'danbooru',
    category: 'shoes',
    styleIds: ['jirai-kei', 'punk', 'gothic-lolita', 'k-street', 'knight-cloak'],
    tags: ['thighhighs', 'boots', 'platform_footwear', 'mary_janes'],
    tagsJa: ['ニーハイソックス', 'ブーツ', '厚底シューズ', 'ストラップシューズ'],
    dominantColors: ['#141115', '#EC4899', '#27272A', '#F4F4F5'],
    artistTip: '厚底ソールの凹凸（ラグソール）と靴紐のクロス、そしてニーハイ上端のわずかな食い込みで脚線美を引き立てます。'
  },
  {
    id: 'db-shoes-y2k-loosesocks',
    title: 'ボリューム・ルーズソックス＆ダッドスニーカー',
    imageUrl: buildFashionCardSvg({
      title: 'Y2K Loose Socks & Chunky Sneakers',
      subtitle: 'loose_socks · sneakers · y2k',
      category: 'shoes',
      colors: ['#1E1B2E', '#38BDF8', '#EC4899', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'SHOES / LEG'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Y2K Loose Socks & Chunky Sneakers',
      subtitle: 'loose_socks · sneakers · y2k',
      category: 'shoes',
      colors: ['#1E1B2E', '#38BDF8', '#EC4899', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'SHOES / LEG'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=loose_socks+sneakers+rating%3Ag',
    source: 'danbooru',
    category: 'shoes',
    styleIds: ['y2k', 'oversized', 'yamikawa', 'techwear'],
    tags: ['loose_socks', 'sneakers', 'platform_footwear'],
    tagsJa: ['ルーズソックス', 'スニーカー', '厚底シューズ'],
    dominantColors: ['#1E1B2E', '#38BDF8', '#EC4899', '#F8FAFC'],
    artistTip: 'ふくらはぎ途中から足首にかけて末広がりになるシルエットを作ることで、膝周りの細さがより際立ちます。'
  },
  {
    id: 'db-shoes-preppy-loafers',
    title: 'タッセル付きコインローファー＆リブクルーソックス',
    imageUrl: buildFashionCardSvg({
      title: 'Classic Loafers & Ribbed Socks',
      subtitle: 'loafers · bobby_socks · preppy',
      category: 'shoes',
      colors: ['#291D18', '#7C2D12', '#1E3A8A', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'SHOES / LEG'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Classic Loafers & Ribbed Socks',
      subtitle: 'loafers · bobby_socks · preppy',
      category: 'shoes',
      colors: ['#291D18', '#7C2D12', '#1E3A8A', '#F8FAFC'],
      sourceLabel: 'DANBOORU 2D',
      badge: 'SHOES / LEG'
    }),
    sourceUrl: 'https://danbooru.donmai.us/posts?tags=loafers+rating%3Ag',
    source: 'danbooru',
    category: 'shoes',
    styleIds: ['ivy-preppy', 'retro-vintage', 'ryousangata'],
    tags: ['loafers', 'bobby_socks', 'mary_janes'],
    tagsJa: ['ローファー', 'クルーソックス', 'ストラップシューズ'],
    dominantColors: ['#291D18', '#7C2D12', '#1E3A8A', '#F8FAFC'],
    artistTip: 'エナメル調の鋭いツヤ（パキッとした白ハイライト）を甲とつま先に入れるだけで革靴らしい高級感が生まれます。'
  }
]

export const CURATED_PINTEREST_ITEMS: CostumeItem[] = [
  {
    id: 'pin-head-cyber-visor',
    title: '【実写質感】リムレス・シルバーオーバルメガネ＆イヤーカフ',
    imageUrl: buildFashionCardSvg({
      title: 'Silver Oval Rimless & Ear Cuff',
      subtitle: 'Real Texture · Chrome Metal · Y2K Eyewear',
      category: 'head',
      colors: ['#18181B', '#94A3B8', '#38BDF8', '#F8FAFC'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Silver Oval Rimless & Ear Cuff',
      subtitle: 'Real Texture · Chrome Metal · Y2K Eyewear',
      category: 'head',
      colors: ['#18181B', '#94A3B8', '#38BDF8', '#F8FAFC'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    sourceUrl: 'https://www.pinterest.com/search/pins/?q=y2k%20silver%20oval%20glasses%20ear%20cuff',
    source: 'pinterest',
    category: 'head',
    styleIds: ['y2k', 'k-street', 'cyberpunk', 'techwear'],
    tags: ['glasses', 'earrings', 'hat'],
    tagsJa: ['メガネ', 'ピアス・イヤリング', '金属光沢リファレンス'],
    dominantColors: ['#18181B', '#94A3B8', '#38BDF8', '#F8FAFC'],
    artistTip: '実写のクローム金属は「周囲の暗い色と強い白ハイライトの急激な境界」で表現するとリアルな金属感が出ます。'
  },
  {
    id: 'pin-head-velvet-bonnet',
    title: '【実写質感】ベルベットリボン＆アンティークレースヘッドドレス',
    imageUrl: buildFashionCardSvg({
      title: 'Velvet Ribbon & Antique Lace',
      subtitle: 'Real Texture · Velvet Sheen · Gothic Lolita',
      category: 'head',
      colors: ['#141115', '#7F1D1D', '#F472B6', '#F4F4F5'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Velvet Ribbon & Antique Lace',
      subtitle: 'Real Texture · Velvet Sheen · Gothic Lolita',
      category: 'head',
      colors: ['#141115', '#7F1D1D', '#F472B6', '#F4F4F5'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    sourceUrl: 'https://www.pinterest.com/search/pins/?q=velvet%20ribbon%20headdress%20gothic%20lolita',
    source: 'pinterest',
    category: 'head',
    styleIds: ['gothic-lolita', 'jirai-kei', 'ryousangata', 'retro-vintage'],
    tags: ['hair_ribbon', 'headdress', 'lace'],
    tagsJa: ['ヘアリボン', 'ヘッドドレス', '別珍・ベルベット質感'],
    dominantColors: ['#141115', '#7F1D1D', '#F472B6', '#F4F4F5'],
    artistTip: 'ベルベット（別珍）生地は一番出っ張った山ではなく、輪郭の少し内側（逆光側）に淡いハイライトを入れると独特の起毛感が出ます。'
  },
  {
    id: 'pin-outer-cropped-leather',
    title: '【実写質感】ヴィンテージ・クロップドライダースジャケット',
    imageUrl: buildFashionCardSvg({
      title: 'Cropped Leather Biker Jacket',
      subtitle: 'Real Texture · Heavy Leather · Folds',
      category: 'outer',
      colors: ['#0F0F12', '#27272A', '#DC2626', '#E4E4E7'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Cropped Leather Biker Jacket',
      subtitle: 'Real Texture · Heavy Leather · Folds',
      category: 'outer',
      colors: ['#0F0F12', '#27272A', '#DC2626', '#E4E4E7'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    sourceUrl: 'https://www.pinterest.com/search/pins/?q=cropped%20leather%20biker%20jacket%20street%20fashion',
    source: 'pinterest',
    category: 'outer',
    styleIds: ['punk', 'k-street', 'y2k', 'cyberpunk'],
    tags: ['leather_jacket', 'jacket', 'straps'],
    tagsJa: ['レザージャケット', 'ジャケット', '革シワ質感資料'],
    dominantColors: ['#0F0F12', '#27272A', '#DC2626', '#E4E4E7'],
    artistTip: 'レザー素材は布よりも折れ目が太く丸みを帯び、シワの稜線に沿って鈍い帯状のハイライトが走ります。'
  },
  {
    id: 'pin-outer-trench-drape',
    title: '【実写質感】オーバーサイズ・トレンチコート＆ドレープ構造',
    imageUrl: buildFashionCardSvg({
      title: 'Oversized Trench Coat Drape',
      subtitle: 'Real Texture · Gabardine Cotton · Classic',
      category: 'outer',
      colors: ['#291D18', '#B45309', '#D6D3D1', '#FEF3C7'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Oversized Trench Coat Drape',
      subtitle: 'Real Texture · Gabardine Cotton · Classic',
      category: 'outer',
      colors: ['#291D18', '#B45309', '#D6D3D1', '#FEF3C7'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    sourceUrl: 'https://www.pinterest.com/search/pins/?q=oversized%20trench%20coat%20street%20snap',
    source: 'pinterest',
    category: 'outer',
    styleIds: ['retro-vintage', 'ivy-preppy', 'steampunk', 'oversized'],
    tags: ['coat', 'trench_coat', 'jacket'],
    tagsJa: ['コート', 'トレンチコート', 'ドレープ構造資料'],
    dominantColors: ['#291D18', '#B45309', '#D6D3D1', '#FEF3C7'],
    artistTip: 'ウエストベルトをキュッと結んだときに上下へ放射状に広がるギャザーシワは、トレンチコート最大の描きどころです。'
  },
  {
    id: 'pin-tops-sheer-knit',
    title: '【実写質感】シアーメッシュ重ね着＆ダメージリブニット',
    imageUrl: buildFashionCardSvg({
      title: 'Layered Sheer Mesh & Rib Knit',
      subtitle: 'Real Texture · Translucent Fabric · Subculture',
      category: 'tops',
      colors: ['#13111C', '#4C1D95', '#C084FC', '#F3E8FF'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Layered Sheer Mesh & Rib Knit',
      subtitle: 'Real Texture · Translucent Fabric · Subculture',
      category: 'tops',
      colors: ['#13111C', '#4C1D95', '#C084FC', '#F3E8FF'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    sourceUrl: 'https://www.pinterest.com/search/pins/?q=sheer%20mesh%20layered%20knit%20top%20subculture',
    source: 'pinterest',
    category: 'tops',
    styleIds: ['yamikawa', 'punk', 'y2k', 'k-street'],
    tags: ['sweater', 'camisole', 'crop_top'],
    tagsJa: ['ニット・セーター', 'キャミソール', '透け感・シアー素材資料'],
    dominantColors: ['#13111C', '#4C1D95', '#C084FC', '#F3E8FF'],
    artistTip: 'シアー（透け）素材は「肌と生地が密着している中央は肌色が透け、輪郭付近は生地色が濃くなる」塗りでリアルに表現できます。'
  },
  {
    id: 'pin-bottoms-wide-denim',
    title: '【実写質感】ウォッシュド・バギーワイドデニム＆裾クッション',
    imageUrl: buildFashionCardSvg({
      title: 'Washed Baggy Wide Denim Jeans',
      subtitle: 'Real Texture · Heavy Denim · Stacking Folds',
      category: 'bottoms',
      colors: ['#0F172A', '#1E3A8A', '#64748B', '#E2E8F0'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Washed Baggy Wide Denim Jeans',
      subtitle: 'Real Texture · Heavy Denim · Stacking Folds',
      category: 'bottoms',
      colors: ['#0F172A', '#1E3A8A', '#64748B', '#E2E8F0'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    sourceUrl: 'https://www.pinterest.com/search/pins/?q=baggy%20wide%20denim%20jeans%20streetwear',
    source: 'pinterest',
    category: 'bottoms',
    styleIds: ['y2k', 'oversized', 'k-street', 'techwear'],
    tags: ['jeans', 'denim', 'pants'],
    tagsJa: ['デニム・ジーンズ', 'デニム素材', 'パンツ'],
    dominantColors: ['#0F172A', '#1E3A8A', '#64748B', '#E2E8F0'],
    artistTip: 'デニム特有の色落ち（太もも中央とシワの山が白っぽくなるアタリ）をブラシのテクスチャで乗せると一気に実在感が出ます。'
  },
  {
    id: 'pin-shoes-platform-maryjanes',
    title: '【実写質感】エナメル厚底メリージェーン＆レースソックス',
    imageUrl: buildFashionCardSvg({
      title: 'Patent Platform Mary Janes',
      subtitle: 'Real Texture · Patent Gloss · Buckle Shoes',
      category: 'shoes',
      colors: ['#141115', '#2E1F27', '#F472B6', '#F8FAFC'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    previewUrl: buildFashionCardSvg({
      title: 'Patent Platform Mary Janes',
      subtitle: 'Real Texture · Patent Gloss · Buckle Shoes',
      category: 'shoes',
      colors: ['#141115', '#2E1F27', '#F472B6', '#F8FAFC'],
      sourceLabel: 'PINTEREST 3D',
      badge: 'LOOKBOOK'
    }),
    sourceUrl: 'https://www.pinterest.com/search/pins/?q=platform%20mary%20jane%20shoes%20jirai%20kei',
    source: 'pinterest',
    category: 'shoes',
    styleIds: ['jirai-kei', 'ryousangata', 'gothic-lolita'],
    tags: ['mary_janes', 'platform_footwear', 'thighhighs'],
    tagsJa: ['ストラップシューズ', '厚底シューズ', 'エナメル光沢資料'],
    dominantColors: ['#141115', '#2E1F27', '#F472B6', '#F8FAFC'],
    artistTip: '厚底靴は前底（ストーム）とヒールの高さの差を意識し、地面との接地面を水平に揃えると立ち姿が安定します。'
  }
]

