import { defineEventHandler, getQuery } from 'h3'
import type { CostumeItem, SlotCategory } from '~/types/costume'
import { SLOT_DEFINITIONS, STYLE_PRESETS } from '~/types/costume'
import {
  CURATED_PINTEREST_ITEMS,
  generateArtistTip
} from '~/server/utils/costumeCatalog'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawQuery = String(query.q || query.tags || '').trim().toLowerCase()
  const categoryParam = String(query.category || 'all') as SlotCategory | 'all'
  const styleParam = String(query.style || '').trim()

  const stylePreset = STYLE_PRESETS.find((s) => s.id === styleParam)
  const slotDef = SLOT_DEFINITIONS.find((s) => s.id === categoryParam)

  let filtered = CURATED_PINTEREST_ITEMS.filter((item) => {
    if (categoryParam !== 'all' && item.category !== categoryParam) {
      return false
    }
    if (styleParam && item.styleIds && !item.styleIds.includes(styleParam)) {
      if (!rawQuery) return false
    }
    if (rawQuery) {
      const hay = [
        item.title.toLowerCase(),
        ...item.tags.map((t) => t.toLowerCase()),
        ...(item.tagsJa || []).map((t) => t.toLowerCase())
      ].join(' ')
      return rawQuery.split(/[\s,+]+/).some((tok) => hay.includes(tok))
    }
    return true
  })

  // If a specific style preset + slot has no exact match in static list, synthesize a tailored Pinterest Lookbook reference card
  if (filtered.length === 0) {
    const targetSlots: SlotCategory[] =
      categoryParam === 'all'
        ? ['head', 'outer', 'tops', 'bottoms', 'shoes']
        : [categoryParam]

    const palette = stylePreset?.suggestedPalette || ['#18181B', '#6366F1', '#EC4899', '#F4F4F5']
    const styleLabel = stylePreset?.label || 'トレンド'
    const pinSearchQuery = stylePreset?.pinterestQuery || rawQuery || 'street fashion coordinate'

    filtered = targetSlots.map((slotId) => {
      const def = SLOT_DEFINITIONS.find((d) => d.id === slotId)!
      const baseItem =
        CURATED_PINTEREST_ITEMS.find((i) => i.category === slotId) || CURATED_PINTEREST_ITEMS[0]
      return {
        ...baseItem,
        id: `pin-${styleParam || 'custom'}-${slotId}`,
        title: `【実写質感】${styleLabel} × ${def.labelJa} コレクション資料`,
        sourceUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(`${pinSearchQuery} ${def.label}`)}`,
        category: slotId,
        styleIds: styleParam ? [styleParam] : baseItem.styleIds,
        dominantColors: palette.slice(0, 4),
        artistTip: generateArtistTip(slotId, def.quickTags.map((q) => q.danbooruTag))
      }
    })
  }

  return {
    source: 'pinterest',
    appliedStyle: stylePreset?.label || null,
    appliedCategory: slotDef?.label || 'all',
    count: filtered.length,
    items: filtered
  }
})

