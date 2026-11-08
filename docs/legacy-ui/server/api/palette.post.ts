import { defineEventHandler, readBody } from 'h3'
import type { ColorSwatch, SlotCategory } from '~/types/costume'

interface PaletteRequestItem {
  slot: SlotCategory
  colors?: string[]
  tags?: string[]
}

interface PaletteRequestBody {
  items?: PaletteRequestItem[]
  stylePalette?: string[]
}

const COLOR_ROLES: Array<{
  role: ColorSwatch['role']
  roleLabel: string
  defaultRatio: number
}> = [
  { role: 'base', roleLabel: 'ベースカラー (60%)', defaultRatio: 45 },
  { role: 'main', roleLabel: 'メイン・アソート (25%)', defaultRatio: 25 },
  { role: 'accent', roleLabel: 'アクセント・差し色 (10%)', defaultRatio: 12 },
  { role: 'shadow', roleLabel: '影・締め色 (Shadow)', defaultRatio: 10 },
  { role: 'highlight', roleLabel: 'ハイライト・抜け感', defaultRatio: 8 }
]

function hexToLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6) return 0.5
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function getColorNameJa(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase()
  const lum = hexToLuminance(clean)
  if (lum < 0.08) return 'ジェットブラック'
  if (lum > 0.9) return 'ピュアホワイト'

  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 22) {
    return lum < 0.35 ? 'チャコールグレー' : lum < 0.7 ? 'スレートグレー' : 'シルバーミスト'
  }
  if (r >= g && r >= b) {
    if (b > g + 30) return 'マゼンタピンク'
    if (g > 140) return 'アンバーゴールド'
    return lum < 0.3 ? 'バーガンディ' : 'クリムゾンレッド'
  }
  if (b >= r && b >= g) {
    if (r > g + 25) return 'バイオレット'
    return lum < 0.25 ? 'ミッドナイトネイビー' : 'サイバーシアン'
  }
  return lum < 0.3 ? 'フォレストグリーン' : 'ネオンエメラルド'
}

export default defineEventHandler(async (event) => {
  const body: PaletteRequestBody = (await readBody<PaletteRequestBody>(event).catch((): PaletteRequestBody => ({}))) || {}
  const items = Array.isArray(body.items) ? body.items : []

  const collected: Array<{ hex: string; slot?: SlotCategory }> = []

  // Collect colors from equipped slot items
  for (const item of items) {
    if (Array.isArray(item.colors)) {
      for (const rawHex of item.colors) {
        const normalized = rawHex.trim().toUpperCase()
        if (/^#[0-9A-F]{6}$/.test(normalized)) {
          if (!collected.some((c) => c.hex === normalized)) {
            collected.push({ hex: normalized, slot: item.slot })
          }
        }
      }
    }
  }

  // Fill remaining slots with style preset palette or studio defaults
  const fallbacks = body.stylePalette?.length
    ? body.stylePalette
    : ['#18181B', '#6366F1', '#EC4899', '#38BDF8', '#F4F4F5']

  for (const hex of fallbacks) {
    if (collected.length >= 5) break
    const normalized = hex.trim().toUpperCase()
    if (/^#[0-9A-F]{6}$/.test(normalized) && !collected.some((c) => c.hex === normalized)) {
      collected.push({ hex: normalized })
    }
  }

  const swatches: ColorSwatch[] = collected.slice(0, 5).map((entry, index) => {
    const roleMeta = COLOR_ROLES[index] || COLOR_ROLES[0]
    return {
      hex: entry.hex,
      name: getColorNameJa(entry.hex),
      role: roleMeta.role,
      roleLabel: roleMeta.roleLabel,
      sourceSlot: entry.slot,
      ratio: roleMeta.defaultRatio
    }
  })

  return {
    palette: swatches
  }
})

