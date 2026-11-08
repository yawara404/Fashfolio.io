import { ref, computed } from 'vue'
import type { CostumeItem, SlotCategory, SourceFilter } from '~/types/costume'
import { SLOT_DEFINITIONS, STYLE_PRESETS } from '~/types/costume'

interface CostumeSearchResponse {
  items: CostumeItem[]
  apiStatus?: 'live' | 'fallback'
  appliedQuery?: string
}

const JA_TO_DANBOORU_MAP: Record<string, string> = {
  帽子: 'hat',
  ベレー帽: 'beret',
  メガネ: 'glasses',
  眼鏡: 'glasses',
  ピアス: 'earrings',
  イヤリング: 'earrings',
  リボン: 'hair_ribbon',
  ヘッドホン: 'headphones',
  チョーカー: 'choker',
  ジャケット: 'jacket',
  パーカー: 'hoodie',
  フーディー: 'hoodie',
  カーディガン: 'cardigan',
  コート: 'coat',
  トレンチコート: 'trench_coat',
  ブレザー: 'blazer',
  マント: 'cape',
  ケープ: 'capelet',
  羽織: 'haori',
  tシャツ: 't-shirt',
  シャツ: 'shirt',
  ブラウス: 'blouse',
  フリル: 'frilled_shirt',
  ニット: 'sweater',
  セーター: 'sweater',
  キャミソール: 'camisole',
  クロップド: 'crop_top',
  へそ出し: 'crop_top',
  オフショル: 'off_shoulder',
  セーラー: 'sailor_collar',
  スカート: 'skirt',
  プリーツスカート: 'pleated_skirt',
  ミニスカート: 'miniskirt',
  デニム: 'jeans',
  ジーンズ: 'jeans',
  カーゴパンツ: 'cargo_pants',
  ショートパンツ: 'shorts',
  ショーパン: 'shorts',
  袴: 'hakama_skirt',
  ニーハイ: 'thighhighs',
  ルーズソックス: 'loose_socks',
  ブーツ: 'boots',
  スニーカー: 'sneakers',
  ローファー: 'loafers',
  厚底: 'platform_footwear',
  地雷系: 'jirai_kei',
  ゴスロリ: 'gothic_lolita',
  チャイナ: 'china_dress',
  和服: 'japanese_clothes',
  着物: 'japanese_clothes',
  テックウェア: 'techwear',
  サイバーパンク: 'cyberpunk',
  スチームパンク: 'steampunk'
}

function normalizeQueryToDanbooruTag(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return ''
  for (const [jaKey, enTag] of Object.entries(JA_TO_DANBOORU_MAP)) {
    if (trimmed.includes(jaKey)) {
      return enTag
    }
  }
  return trimmed.replace(/\s+/g, '_')
}

const searchQuery = ref<string>('')
const sourceFilter = ref<SourceFilter>('all')
const selectedCategory = ref<SlotCategory | 'all'>('all')
const selectedStyleId = ref<string | null>(null)
const selectedQuickTag = ref<string>('')

const items = ref<CostumeItem[]>([])
const isLoading = ref<boolean>(false)
const isLoadingMore = ref<boolean>(false)
const danbooruApiStatus = ref<'live' | 'fallback'>('fallback')
const appliedDanbooruQuery = ref<string>('pleated_skirt rating:g')
const currentPage = ref<number>(1)
const hasMore = ref<boolean>(true)

export function useCostumeSearch() {
  const activeStylePreset = computed(() =>
    selectedStyleId.value ? STYLE_PRESETS.find((s) => s.id === selectedStyleId.value) || null : null
  )

  const activeSlotDef = computed(() =>
    selectedCategory.value !== 'all'
      ? SLOT_DEFINITIONS.find((s) => s.id === selectedCategory.value) || null
      : null
  )

  async function fetchCostumes(resetPage = true) {
    if (resetPage) {
      isLoading.value = true
      currentPage.value = 1
      hasMore.value = true
    } else {
      isLoadingMore.value = true
    }

    const effectiveTag =
      selectedQuickTag.value ||
      normalizeQueryToDanbooruTag(searchQuery.value) ||
      ''

    try {
      const requests: Array<Promise<CostumeSearchResponse | null>> = []

      if (sourceFilter.value === 'all' || sourceFilter.value === 'danbooru') {
        requests.push(
          $fetch<CostumeSearchResponse>('/api/costumes/danbooru', {
            query: {
              tags: effectiveTag,
              category: selectedCategory.value,
              style: selectedStyleId.value || '',
              page: currentPage.value,
              limit: 20
            }
          })
        )
      } else {
        requests.push(Promise.resolve(null))
      }

      if (
        (sourceFilter.value === 'all' || sourceFilter.value === 'pinterest') &&
        currentPage.value === 1
      ) {
        requests.push(
          $fetch<CostumeSearchResponse>('/api/costumes/pinterest', {
            query: {
              q: effectiveTag || searchQuery.value,
              category: selectedCategory.value,
              style: selectedStyleId.value || ''
            }
          })
        )
      } else {
        requests.push(Promise.resolve(null))
      }

      const [danbooruRes, pinterestRes] = await Promise.all(requests)

      const newItems: CostumeItem[] = []

      if (danbooruRes) {
        danbooruApiStatus.value = danbooruRes.apiStatus || 'fallback'
        appliedDanbooruQuery.value = danbooruRes.appliedQuery || 'rating:g'
        if (Array.isArray(danbooruRes.items)) {
          newItems.push(...danbooruRes.items)
        }
      }

      if (pinterestRes && Array.isArray(pinterestRes.items)) {
        // Interleave 2D Danbooru and 3D Pinterest items when in hybrid 'all' mode
        if (sourceFilter.value === 'all' && newItems.length > 0) {
          const blended: CostumeItem[] = []
          const maxLen = Math.max(newItems.length, pinterestRes.items.length)
          for (let i = 0; i < maxLen; i++) {
            if (i < newItems.length) blended.push(newItems[i])
            if (i < pinterestRes.items.length) blended.push(pinterestRes.items[i])
          }
          newItems.splice(0, newItems.length, ...blended)
        } else {
          newItems.push(...pinterestRes.items)
        }
      }

      if (resetPage) {
        items.value = newItems
      } else {
        const existingIds = new Set(items.value.map((i) => i.id))
        const uniqueNext = newItems.filter((i) => !existingIds.has(i.id))
        items.value = [...items.value, ...uniqueNext]
        if (uniqueNext.length === 0) {
          hasMore.value = false
        }
      }
    } catch {
      // Keep existing items on network glitch
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  async function loadMore() {
    if (isLoading.value || isLoadingMore.value || !hasMore.value) return
    if (sourceFilter.value === 'pinterest') {
      hasMore.value = false
      return
    }
    currentPage.value += 1
    await fetchCostumes(false)
  }

  function applyStylePreset(styleId: string | null) {
    selectedStyleId.value = selectedStyleId.value === styleId ? null : styleId
    selectedQuickTag.value = ''
    fetchCostumes(true)
  }

  function applyCategoryFilter(category: SlotCategory | 'all') {
    selectedCategory.value = category
    selectedQuickTag.value = ''
    fetchCostumes(true)
  }

  function applyQuickTag(tag: string) {
    selectedQuickTag.value = selectedQuickTag.value === tag ? '' : tag
    fetchCostumes(true)
  }

  function setSourceFilter(source: SourceFilter) {
    sourceFilter.value = source
    fetchCostumes(true)
  }

  async function fetchFullPoolForRandomize(): Promise<CostumeItem[]> {
    try {
      const [dbRes, pinRes] = await Promise.all([
        $fetch<{ items: CostumeItem[] }>('/api/costumes/danbooru', {
          query: {
            category: 'all',
            style: selectedStyleId.value || '',
            limit: 30
          }
        }),
        $fetch<{ items: CostumeItem[] }>('/api/costumes/pinterest', {
          query: {
            category: 'all',
            style: selectedStyleId.value || ''
          }
        })
      ])
      return [...(dbRes?.items || []), ...(pinRes?.items || [])]
    } catch {
      return items.value
    }
  }

  return {
    searchQuery,
    sourceFilter,
    selectedCategory,
    selectedStyleId,
    selectedQuickTag,
    activeStylePreset,
    activeSlotDef,
    items,
    isLoading,
    isLoadingMore,
    danbooruApiStatus,
    appliedDanbooruQuery,
    currentPage,
    hasMore,
    fetchCostumes,
    loadMore,
    applyStylePreset,
    applyCategoryFilter,
    applyQuickTag,
    setSourceFilter,
    fetchFullPoolForRandomize
  }
}

