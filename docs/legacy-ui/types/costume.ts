export type SlotCategory = 'head' | 'outer' | 'tops' | 'bottoms' | 'shoes'

export type CostumeSource = 'danbooru' | 'pinterest'

export type SourceFilter = 'all' | 'danbooru' | 'pinterest'

export type StyleCategoryGroup = 'trend' | 'dark' | 'classic' | 'fantasy'

export interface QuickTagOption {
  label: string
  danbooruTag: string
  pinterestQuery: string
}

export interface SlotDefinition {
  id: SlotCategory
  step: number
  label: string
  labelJa: string
  description: string
  defaultDanbooruTag: string
  quickTags: QuickTagOption[]
}

export interface StylePreset {
  id: string
  label: string
  subLabel: string
  group: StyleCategoryGroup
  groupLabel: string
  danbooruTags: string[]
  pinterestQuery: string
  description: string
  suggestedPalette: string[]
}

export interface CostumeItem {
  id: string
  title: string
  imageUrl: string
  previewUrl: string
  sourceUrl: string
  source: CostumeSource
  category: SlotCategory
  styleIds?: string[]
  tags: string[]
  tagsJa?: string[]
  dominantColors: string[]
  width?: number
  height?: number
  authorOrCredit?: string
  artistTip?: string
}

export interface FittingSlotState {
  category: SlotCategory
  item: CostumeItem | null
  locked: boolean
  customNote: string
}

export interface ColorSwatch {
  hex: string
  name: string
  role: 'base' | 'main' | 'accent' | 'shadow' | 'highlight'
  roleLabel: string
  sourceSlot?: SlotCategory
  ratio: number
}

export interface SavedCoordination {
  id: string
  name: string
  createdAt: string
  styleId: string | null
  slots: Record<SlotCategory, CostumeItem | null>
  palette: ColorSwatch[]
}

export interface ReflensExportPayload {
  version: string
  sourceApp: 'fashfolio.io'
  targetApp: 'Reflens.io'
  exportedAt: string
  boardTitle: string
  stylePreset: string | null
  palette: ColorSwatch[]
  canvasLayout: {
    columns: number
    gap: number
    includePaletteCard: boolean
  }
  items: Array<{
    slot: SlotCategory
    slotLabel: string
    title: string
    imageUrl: string
    sourceUrl: string
    source: CostumeSource
    tags: string[]
    colors: string[]
    artistTip?: string
  }>
}

export const SLOT_DEFINITIONS: SlotDefinition[] = [
  {
    id: 'head',
    step: 1,
    label: 'Head / Accessory',
    labelJa: '頭・小物',
    description: '帽子, メガネ, ピアス, リボン',
    defaultDanbooruTag: 'hat',
    quickTags: [
      { label: '帽子 (Hat)', danbooruTag: 'hat', pinterestQuery: 'fashion hat beret bucket hat aesthetic' },
      { label: 'ベレー帽', danbooruTag: 'beret', pinterestQuery: 'beret hat outfit coordinate' },
      { label: 'メガネ', danbooruTag: 'glasses', pinterestQuery: 'glasses eyewear fashion aesthetic' },
      { label: 'ピアス', danbooruTag: 'earrings', pinterestQuery: 'statement earrings ear cuff fashion' },
      { label: 'リボン', danbooruTag: 'hair_ribbon', pinterestQuery: 'hair ribbon bow gothic lolita' },
      { label: 'ヘッドホン', danbooruTag: 'headphones', pinterestQuery: 'cyberpunk y2k headphones fashion' },
      { label: 'チョーカー', danbooruTag: 'choker', pinterestQuery: 'choker necklace subculture fashion' }
    ]
  },
  {
    id: 'outer',
    step: 2,
    label: 'Outer',
    labelJa: 'アウター',
    description: 'ジャケット, パーカー, カーディガン, コート',
    defaultDanbooruTag: 'jacket',
    quickTags: [
      { label: 'ジャケット', danbooruTag: 'jacket', pinterestQuery: 'cropped jacket street fashion design' },
      { label: 'パーカー', danbooruTag: 'hoodie', pinterestQuery: 'oversized hoodie streetwear silhouette' },
      { label: 'カーディガン', danbooruTag: 'cardigan', pinterestQuery: 'knit cardigan preppy grunge outfit' },
      { label: 'コート', danbooruTag: 'coat', pinterestQuery: 'trench coat long coat fashion folds' },
      { label: 'ブレザー', danbooruTag: 'blazer', pinterestQuery: 'tailored blazer preppy fashion' },
      { label: 'マント・ケープ', danbooruTag: 'capelet', pinterestQuery: 'cape cloak fantasy coat design' }
    ]
  },
  {
    id: 'tops',
    step: 3,
    label: 'Tops',
    labelJa: 'トップス',
    description: 'Tシャツ, ブラウス, ニット, キャミソール',
    defaultDanbooruTag: 'shirt',
    quickTags: [
      { label: 'Tシャツ', danbooruTag: 't-shirt', pinterestQuery: 'graphic tee oversized t-shirt folds' },
      { label: 'ブラウス', danbooruTag: 'blouse', pinterestQuery: 'frill blouse puff sleeve shirt fashion' },
      { label: 'ニット・セーター', danbooruTag: 'sweater', pinterestQuery: 'ribbed sweater turtleneck knit texture' },
      { label: 'キャミソール', danbooruTag: 'camisole', pinterestQuery: 'layered camisole y2k top fashion' },
      { label: 'クロップド丈', danbooruTag: 'crop_top', pinterestQuery: 'crop top Korean street fashion' },
      { label: 'オフショルダー', danbooruTag: 'off_shoulder', pinterestQuery: 'off shoulder top aesthetic fashion' }
    ]
  },
  {
    id: 'bottoms',
    step: 4,
    label: 'Bottoms',
    labelJa: 'ボトムス',
    description: 'プリーツスカート, デニム, カーゴパンツ, ショートパンツ',
    defaultDanbooruTag: 'skirt',
    quickTags: [
      { label: 'プリーツスカート', danbooruTag: 'pleated_skirt', pinterestQuery: 'pleated skirt fashion silhouette folds' },
      { label: 'デニム', danbooruTag: 'jeans', pinterestQuery: 'wide leg denim jeans streetwear' },
      { label: 'カーゴパンツ', danbooruTag: 'cargo_pants', pinterestQuery: 'techwear cargo pants straps pockets' },
      { label: 'ショートパンツ', danbooruTag: 'shorts', pinterestQuery: 'tailored shorts high waist fashion' },
      { label: 'フリルスカート', danbooruTag: 'frilled_skirt', pinterestQuery: 'tiered frill skirt gothic lolita' },
      { label: '袴・ロングスカート', danbooruTag: 'long_skirt', pinterestQuery: 'maxi pleated hakama skirt modern' }
    ]
  },
  {
    id: 'shoes',
    step: 5,
    label: 'Legwear / Shoes',
    labelJa: 'レッグウェア・靴',
    description: 'ニーハイ, ルーズソックス, ブーツ, スニーカー',
    defaultDanbooruTag: 'boots',
    quickTags: [
      { label: 'ニーハイ', danbooruTag: 'thighhighs', pinterestQuery: 'thigh high socks garter fashion' },
      { label: 'ルーズソックス', danbooruTag: 'loose_socks', pinterestQuery: 'loose socks leg warmers y2k shoes' },
      { label: 'ブーツ', danbooruTag: 'boots', pinterestQuery: 'platform combat boots lace up leather' },
      { label: 'スニーカー', danbooruTag: 'sneakers', pinterestQuery: 'chunky sneakers techwear dad shoes' },
      { label: 'ローファー', danbooruTag: 'loafers', pinterestQuery: 'platform loafers Mary Janes preppy' },
      { label: '厚底パンプス', danbooruTag: 'mary_janes', pinterestQuery: 'platform mary jane shoes jirai kei' }
    ]
  }
]

export const STYLE_PRESETS: StylePreset[] = [
  // トレンド/ストリート
  {
    id: 'y2k',
    label: 'Y2K',
    subLabel: '2000s Pop & Cyber',
    group: 'trend',
    groupLabel: 'トレンド / ストリート',
    danbooruTags: ['crop_top', 'loose_socks', 'headphones', 'miniskirt'],
    pinterestQuery: 'Y2K fashion aesthetic outfit crop top leg warmers',
    description: 'ローライズ・クロップド丈・ルーズソックス・メタリック小物を組み合わせた2000年代リバイバル',
    suggestedPalette: ['#1E1B2E', '#EC4899', '#38BDF8', '#E2E8F0', '#A855F7']
  },
  {
    id: 'techwear',
    label: 'Techwear',
    subLabel: 'テックウェア',
    group: 'trend',
    groupLabel: 'トレンド / ストリート',
    danbooruTags: ['techwear', 'jacket', 'cargo_pants', 'hoodie', 'straps'],
    pinterestQuery: 'Techwear urban tactical jacket cargo pants straps outfit',
    description: '撥水ナイロン・止水ジップ・バックルベルト・多ポケット構造の機能美ストリートスタイル',
    suggestedPalette: ['#090D16', '#1E293B', '#475569', '#10B981', '#E2E8F0']
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    subLabel: 'サイバーパンク',
    group: 'trend',
    groupLabel: 'トレンド / ストリート',
    danbooruTags: ['cyberpunk', 'jacket', 'headphones', 'boots', 'glowing'],
    pinterestQuery: 'Cyberpunk futuristic fashion neon visor jacket outfit',
    description: 'ネオンアクセント・ハイネックジャケット・ハーネス・発光ラインが映える近未来スタイル',
    suggestedPalette: ['#0B0F19', '#06B6D4', '#F43F5E', '#FACC15', '#334155']
  },
  {
    id: 'oversized',
    label: 'Oversized',
    subLabel: 'オーバーサイズ',
    group: 'trend',
    groupLabel: 'トレンド / ストリート',
    danbooruTags: ['oversized_clothes', 'hoodie', 'long_sleeves', 'sneakers'],
    pinterestQuery: 'Oversized silhouette hoodie wide pants street snap',
    description: '萌え袖・ドロップショルダー・だぼっとした布の溜まりと華奢なシルエット対比が魅力',
    suggestedPalette: ['#18181B', '#52525B', '#D4D4D8', '#F97316', '#FAFAF9']
  },
  {
    id: 'k-street',
    label: '韓国ストリート',
    subLabel: 'K-Street Mode',
    group: 'trend',
    groupLabel: 'トレンド / ストリート',
    danbooruTags: ['crop_top', 'jacket', 'pleated_skirt', 'boots', 'beret'],
    pinterestQuery: 'Korean street fashion monotone blazer crop top pleated skirt',
    description: '短丈トップス×ハイウエストボトムスで脚長バランスを強調する洗練モノトーン＆差し色コーデ',
    suggestedPalette: ['#111827', '#374151', '#9CA3AF', '#F3F4F6', '#6366F1']
  },

  // ダーク/サブカル
  {
    id: 'jirai-kei',
    label: '地雷系',
    subLabel: 'Jirai-kei',
    group: 'dark',
    groupLabel: 'ダーク / サブカル',
    danbooruTags: ['jirai_kei', 'frilled_shirt', 'pleated_skirt', 'hair_ribbon', 'thighhighs'],
    pinterestQuery: 'Jirai kei fashion pink black blouse ribbon platform shoes',
    description: '黒×くすみピンク・たっぷりフリル・十字架ビジュー・厚底ローファーの王道サブカルドール衣装',
    suggestedPalette: ['#141115', '#2E1F27', '#F472B6', '#FBCFE8', '#E5E7EB']
  },
  {
    id: 'ryousangata',
    label: '量産型',
    subLabel: 'Ryousangata Girly',
    group: 'dark',
    groupLabel: 'ダーク / サブカル',
    danbooruTags: ['frilled_blouse', 'hair_ribbon', 'skirt', 'mary_janes', 'cardigan'],
    pinterestQuery: 'Ryousangata Japanese girly fashion tweed ribbon blouse',
    description: 'ツイード・パールボタン・大きなサテンリボン・ホワイト＆パステル系の甘めガーリーコーデ',
    suggestedPalette: ['#271722', '#F9A8D4', '#FCE7F3', '#DDD6FE', '#FFFBEB']
  },
  {
    id: 'gothic-lolita',
    label: 'ゴシック・ロリータ',
    subLabel: 'Gothic Lolita',
    group: 'dark',
    groupLabel: 'ダーク / サブカル',
    danbooruTags: ['gothic_lolita', 'frilled_skirt', 'lace', 'headdress', 'mary_janes'],
    pinterestQuery: 'Gothic Lolita dress corset lace headdress outfit',
    description: 'パニエで膨らむベルラインスカート・多段レース・ボンネット・編み上げコルセットの重厚造形',
    suggestedPalette: ['#09090B', '#1F122B', '#7F1D1D', '#D4AF37', '#F4F4F5']
  },
  {
    id: 'punk',
    label: 'パンク',
    subLabel: 'Punk Rock',
    group: 'dark',
    groupLabel: 'ダーク / サブカル',
    danbooruTags: ['punk', 'choker', 'plaid_skirt', 'boots', 'leather_jacket'],
    pinterestQuery: 'Punk fashion tartan plaid leather jacket chains combat boots',
    description: 'ライダース・タータンチェック・安全ピン・スタッズチョーカー・編み上げブーツの反骨スタイル',
    suggestedPalette: ['#0F0F12', '#DC2626', '#27272A', '#A1A1AA', '#F8FAFC']
  },
  {
    id: 'yamikawa',
    label: '病みかわ',
    subLabel: 'Yami-Kawaii',
    group: 'dark',
    groupLabel: 'ダーク / サブカル',
    danbooruTags: ['oversized_shirt', 'choker', 'thighhighs', 'hoodie', 'ribbon'],
    pinterestQuery: 'Yamikawaii pastel goth subculture oversized hoodie pastel purple',
    description: 'ラベンダー×ブラック・ハーネス・包帯や医療モチーフ・ビッグTシャツの退廃ポップスタイル',
    suggestedPalette: ['#13111C', '#4C1D95', '#C084FC', '#F472B6', '#F3E8FF']
  },

  // クラシック/トラッド
  {
    id: 'ivy-preppy',
    label: 'アイビー・プレッピー',
    subLabel: 'Ivy / Preppy',
    group: 'classic',
    groupLabel: 'クラシック / トラッド',
    danbooruTags: ['blazer', 'pleated_skirt', 'necktie', 'loafers', 'cardigan'],
    pinterestQuery: 'Preppy academia outfit blazer argyle vest pleated skirt loafers',
    description: 'エンブレム付きブレザー・チルデンニット・チェックプリーツ・ローファーの知的な学院トラッド',
    suggestedPalette: ['#0F172A', '#1E3A8A', '#7C2D12', '#D97706', '#F8FAFC']
  },
  {
    id: 'retro-vintage',
    label: 'レトロ・ヴィンテージ',
    subLabel: 'Retro Vintage',
    group: 'classic',
    groupLabel: 'クラシック / トラッド',
    danbooruTags: ['beret', 'coat', 'long_skirt', 'boots', 'scarf'],
    pinterestQuery: 'Vintage retro autumn fashion trench coat beret plaid skirt',
    description: 'ベレー帽・ダブルブレストコート・クラシカルなロングスカート・ブラウン革靴のノスタルジック装い',
    suggestedPalette: ['#291D18', '#5C4033', '#B45309', '#D6D3D1', '#FEF3C7']
  },
  {
    id: 'steampunk',
    label: 'スチームパンク',
    subLabel: 'Steampunk',
    group: 'classic',
    groupLabel: 'クラシック / トラッド',
    danbooruTags: ['steampunk', 'goggles', 'corset', 'boots', 'coat'],
    pinterestQuery: 'Steampunk costume brass goggles corset tailcoat leather boots',
    description: '真鍮ゴーグル・レザーコルセット・燕尾ベスト・歯車装飾・バックルブーツの蒸気機関ファンタジー',
    suggestedPalette: ['#1C1411', '#451A03', '#92400E', '#D97706', '#E7E5E4']
  },

  // ファンタジー/民族
  {
    id: 'chinese-modern',
    label: '中華風 (漢服/チャイナ)',
    subLabel: 'Neo China / Hanfu',
    group: 'fantasy',
    groupLabel: 'ファンタジー / 民族',
    danbooruTags: ['china_dress', 'chinese_clothes', 'tassel', 'jacket', 'boots'],
    pinterestQuery: 'Modern Chinese fashion Neo Qipao Hanfu street coordinate',
    description: 'チャイナボタン（盤扣）・タッセル・立ち襟・刺繍入り羽織りを現代シルエットに昇華した中華スタイル',
    suggestedPalette: ['#111115', '#991B1B', '#EAB308', '#1E293B', '#F8FAFC']
  },
  {
    id: 'wa-modern',
    label: '和装・和モダン',
    subLabel: 'Wa-Modern / Haori',
    group: 'fantasy',
    groupLabel: 'ファンタジー / 民族',
    danbooruTags: ['japanese_clothes', 'haori', 'hakama_skirt', 'boots', 'obi'],
    pinterestQuery: 'Wa-modern kimono haori jacket hakama boots street fashion',
    description: '羽織ジャケット・袴プリーツ・帯ベルト・編み上げブーツを合わせた大正ロマン＆現代和折衷コーデ',
    suggestedPalette: ['#131620', '#312E81', '#BE123C', '#D97706', '#F1F5F9']
  },
  {
    id: 'knight-cloak',
    label: '騎士・マント',
    subLabel: 'Knight / Cloak',
    group: 'fantasy',
    groupLabel: 'ファンタジー / 民族',
    danbooruTags: ['cape', 'capelet', 'epaulettes', 'boots', 'gloves'],
    pinterestQuery: 'Fantasy knight uniform capelet military jacket boots concept art',
    description: '肩章付きハーフマント・金モール礼装ジャケット・ロングブーツの気品あるファンタジー騎士装束',
    suggestedPalette: ['#0F172A', '#1E293B', '#EAB308', '#991B1B', '#F8FAFC']
  }
]

