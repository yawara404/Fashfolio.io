import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  ColorSwatch,
  CostumeItem,
  FittingSlotState,
  ReflensExportPayload,
  SavedCoordination,
  SlotCategory
} from '~/types/costume'
import { SLOT_DEFINITIONS, STYLE_PRESETS } from '~/types/costume'

const DEFAULT_PALETTE: ColorSwatch[] = [
  {
    hex: '#18181B',
    name: 'ジェットブラック',
    role: 'base',
    roleLabel: 'ベースカラー (45%)',
    ratio: 45
  },
  {
    hex: '#6366F1',
    name: 'インディゴバイオレット',
    role: 'main',
    roleLabel: 'メイン・アソート (25%)',
    ratio: 25
  },
  {
    hex: '#EC4899',
    name: 'ネオンマゼンタ',
    role: 'accent',
    roleLabel: 'アクセント・差し色 (12%)',
    ratio: 12
  },
  {
    hex: '#38BDF8',
    name: 'サイバーシアン',
    role: 'shadow',
    roleLabel: 'サブアクセント (10%)',
    ratio: 10
  },
  {
    hex: '#F4F4F5',
    name: 'ピュアホワイト',
    role: 'highlight',
    roleLabel: 'ハイライト・抜け感 (8%)',
    ratio: 8
  }
]

export const useFittingBoardStore = defineStore('fittingBoard', () => {
  const boardTitle = ref<string>('メインキャラ衣装案 #01')
  const activeSlot = ref<SlotCategory | 'all'>('all')
  const activeStyleId = ref<string | null>(null)
  const isExportModalOpen = ref<boolean>(false)
  const lastEquippedSlot = ref<SlotCategory | null>(null)

  const slots = ref<Record<SlotCategory, FittingSlotState>>({
    head: { category: 'head', item: null, locked: false, customNote: '' },
    outer: { category: 'outer', item: null, locked: false, customNote: '' },
    tops: { category: 'tops', item: null, locked: false, customNote: '' },
    bottoms: { category: 'bottoms', item: null, locked: false, customNote: '' },
    shoes: { category: 'shoes', item: null, locked: false, customNote: '' }
  })

  const palette = ref<ColorSwatch[]>([...DEFAULT_PALETTE])
  const savedCoordinations = ref<SavedCoordination[]>([])

  const equippedCount = computed(() => {
    return Object.values(slots.value).filter((s) => s.item !== null).length
  })

  const equippedItemsList = computed(() => {
    return SLOT_DEFINITIONS.map((def) => ({
      definition: def,
      state: slots.value[def.id]
    })).filter((entry) => entry.state.item !== null)
  })

  const activeStylePreset = computed(() => {
    if (!activeStyleId.value) return null
    return STYLE_PRESETS.find((s) => s.id === activeStyleId.value) || null
  })

  async function refreshPalette() {
    const itemsPayload = SLOT_DEFINITIONS.map((def) => {
      const item = slots.value[def.id].item
      if (!item) return null
      return {
        slot: def.id,
        colors: item.dominantColors,
        tags: item.tags
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)

    try {
      const response = await $fetch<{ palette: ColorSwatch[] }>('/api/palette', {
        method: 'POST',
        body: {
          items: itemsPayload,
          stylePalette: activeStylePreset.value?.suggestedPalette
        }
      })
      if (response?.palette?.length) {
        palette.value = response.palette
      }
    } catch {
      // Fallback client computation if server call fails
      if (itemsPayload.length > 0) {
        const flatColors = Array.from(new Set(itemsPayload.flatMap((i) => i.colors)))
        palette.value = DEFAULT_PALETTE.map((swatch, idx) => ({
          ...swatch,
          hex: flatColors[idx] || swatch.hex
        }))
      }
    }
  }

  function equipItem(item: CostumeItem, targetSlot?: SlotCategory) {
    const slotKey = targetSlot || item.category
    const slotState = slots.value[slotKey]
    if (!slotState) return
    if (slotState.locked) {
      // Unlock automatically only if explicitly targeted, otherwise respect lock
      if (!targetSlot) return
    }
    slotState.item = { ...item, category: slotKey }
    lastEquippedSlot.value = slotKey
    refreshPalette()
  }

  function removeItem(slotKey: SlotCategory) {
    if (slots.value[slotKey].locked) return
    slots.value[slotKey].item = null
    refreshPalette()
  }

  function toggleLock(slotKey: SlotCategory) {
    slots.value[slotKey].locked = !slots.value[slotKey].locked
  }

  function setSlotNote(slotKey: SlotCategory, note: string) {
    slots.value[slotKey].customNote = note
  }

  function clearUnlockedSlots() {
    for (const def of SLOT_DEFINITIONS) {
      if (!slots.value[def.id].locked) {
        slots.value[def.id].item = null
        slots.value[def.id].customNote = ''
      }
    }
    refreshPalette()
  }

  function randomizeFromPool(pool: CostumeItem[]) {
    for (const def of SLOT_DEFINITIONS) {
      const slotState = slots.value[def.id]
      if (slotState.locked) continue

      const candidates = pool.filter((i) => i.category === def.id)
      if (candidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidates.length)
        slotState.item = { ...candidates[randomIndex], category: def.id }
      }
    }
    refreshPalette()
  }

  function updateSwatchHex(index: number, newHex: string) {
    const clean = newHex.trim().toUpperCase()
    if (/^#[0-9A-F]{6}$/.test(clean) && palette.value[index]) {
      palette.value[index].hex = clean
    }
  }

  function saveCurrentCoordination(customName?: string) {
    const name =
      customName?.trim() ||
      `${boardTitle.value} (${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })})`

    const snapshot: SavedCoordination = {
      id: `coord-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      styleId: activeStyleId.value,
      slots: {
        head: slots.value.head.item ? { ...slots.value.head.item } : null,
        outer: slots.value.outer.item ? { ...slots.value.outer.item } : null,
        tops: slots.value.tops.item ? { ...slots.value.tops.item } : null,
        bottoms: slots.value.bottoms.item ? { ...slots.value.bottoms.item } : null,
        shoes: slots.value.shoes.item ? { ...slots.value.shoes.item } : null
      },
      palette: palette.value.map((p) => ({ ...p }))
    }

    savedCoordinations.value = [snapshot, ...savedCoordinations.value.slice(0, 19)]
    persistSavedToStorage()
    return snapshot
  }

  function loadCoordination(coord: SavedCoordination) {
    boardTitle.value = coord.name
    if (coord.styleId !== undefined) {
      activeStyleId.value = coord.styleId
    }
    for (const def of SLOT_DEFINITIONS) {
      if (!slots.value[def.id].locked) {
        slots.value[def.id].item = coord.slots[def.id] ? { ...coord.slots[def.id]! } : null
      }
    }
    if (coord.palette?.length) {
      palette.value = coord.palette.map((p) => ({ ...p }))
    } else {
      refreshPalette()
    }
  }

  function deleteSavedCoordination(id: string) {
    savedCoordinations.value = savedCoordinations.value.filter((c) => c.id !== id)
    persistSavedToStorage()
  }

  function persistSavedToStorage() {
    if (import.meta.client) {
      try {
        localStorage.setItem('fashfolio_saved_coords_v1', JSON.stringify(savedCoordinations.value))
      } catch {
        // Ignore quota errors
      }
    }
  }

  function hydrateSavedFromStorage() {
    if (import.meta.client) {
      try {
        const raw = localStorage.getItem('fashfolio_saved_coords_v1')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            savedCoordinations.value = parsed
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  function buildReflensPayload(): ReflensExportPayload {
    const items = SLOT_DEFINITIONS.map((def) => {
      const state = slots.value[def.id]
      if (!state.item) return null
      return {
        slot: def.id,
        slotLabel: `${def.label} (${def.labelJa})`,
        title: state.item.title,
        imageUrl: state.item.imageUrl.startsWith('data:')
          ? state.item.sourceUrl
          : state.item.imageUrl,
        sourceUrl: state.item.sourceUrl,
        source: state.item.source,
        tags: state.item.tags.slice(0, 8),
        colors: state.item.dominantColors,
        artistTip: state.customNote || state.item.artistTip
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)

    return {
      version: '1.0.0',
      sourceApp: 'fashfolio.io',
      targetApp: 'Reflens.io',
      exportedAt: new Date().toISOString(),
      boardTitle: boardTitle.value,
      stylePreset: activeStylePreset.value?.label || null,
      palette: palette.value,
      canvasLayout: {
        columns: 3,
        gap: 24,
        includePaletteCard: true
      },
      items
    }
  }

  return {
    boardTitle,
    activeSlot,
    activeStyleId,
    activeStylePreset,
    isExportModalOpen,
    lastEquippedSlot,
    slots,
    palette,
    savedCoordinations,
    equippedCount,
    equippedItemsList,
    refreshPalette,
    equipItem,
    removeItem,
    toggleLock,
    setSlotNote,
    clearUnlockedSlots,
    randomizeFromPool,
    updateSwatchHex,
    saveCurrentCoordination,
    loadCoordination,
    deleteSavedCoordination,
    hydrateSavedFromStorage,
    buildReflensPayload
  }
})

export function useFittingBoard() {
  return useFittingBoardStore()
}

