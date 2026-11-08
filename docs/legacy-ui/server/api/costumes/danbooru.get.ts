import { defineEventHandler, getQuery } from 'h3'
import type { CostumeItem, SlotCategory } from '~/types/costume'
import { SLOT_DEFINITIONS, STYLE_PRESETS } from '~/types/costume'
import {
  CURATED_DANBOORU_ITEMS,
  extractColorsFromTagList,
  generateArtistTip,
  inferCategoryFromTags,
  translateTagsToJa
} from '~/server/utils/costumeCatalog'

interface DanbooruRawPost {
  id: number
  tag_string: string
  tag_string_general: string
  tag_string_character?: string
  tag_string_artist?: string
  rating: string
  file_ext?: string
  file_url?: string
  large_file_url?: string
  preview_file_url?: string
  image_width?: number
  image_height?: number
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawTagInput = String(query.tags || '').trim()
  const categoryParam = String(query.category || 'all') as SlotCategory | 'all'
  const styleParam = String(query.style || '').trim()
  const page = Math.max(1, Number(query.page || 1))
  const limit = Math.min(40, Math.max(6, Number(query.limit || 20)))

  // Determine primary tag for Danbooru (Danbooru anonymous API allows max 2 tags including rating:g)
  const stylePreset = STYLE_PRESETS.find((s) => s.id === styleParam)
  const slotDef = SLOT_DEFINITIONS.find((s) => s.id === categoryParam)

  const requestedTokens = rawTagInput
    .split(/[\s,+]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t && !t.startsWith('rating:'))

  let primaryTag = requestedTokens[0] || ''
  if (!primaryTag) {
    if (slotDef && stylePreset) {
      // Pick a tag from stylePreset if it matches or fallback to slot default
      primaryTag = slotDef.defaultDanbooruTag
    } else if (slotDef) {
      primaryTag = slotDef.defaultDanbooruTag
    } else if (stylePreset && stylePreset.danbooruTags.length > 0) {
      primaryTag = stylePreset.danbooruTags[0]
    } else {
      primaryTag = 'pleated_skirt'
    }
  }

  // Always enforce rating:g for safe general-audience costume reference
  const safeDanbooruQuery = `${primaryTag} rating:g`

  // Filter curated 2D items first for instant high-precision results
  const curatedMatches = CURATED_DANBOORU_ITEMS.filter((item) => {
    if (categoryParam !== 'all' && item.category !== categoryParam) {
      return false
    }
    if (styleParam && item.styleIds && !item.styleIds.includes(styleParam)) {
      // If user also typed a specific tag, check tag match
      if (requestedTokens.length === 0) return false
    }
    if (requestedTokens.length > 0) {
      const hay = [
        item.title.toLowerCase(),
        ...item.tags.map((t) => t.toLowerCase()),
        ...(item.tagsJa || []).map((t) => t.toLowerCase())
      ].join(' ')
      return requestedTokens.some((tok) => hay.includes(tok))
    }
    return true
  })

  const liveItems: CostumeItem[] = []
  let apiStatus: 'live' | 'fallback' = 'fallback'

  try {
    const danbooruUrl = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(safeDanbooruQuery)}&limit=${limit}&page=${page}`
    const response = await fetch(danbooruUrl, {
      headers: {
        'User-Agent': 'FashfolioIO/1.0 (https://fashfolio.io; Costume Reference Tool)',
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(4500)
    })

    if (response.ok) {
      const posts = (await response.json()) as DanbooruRawPost[]
      if (Array.isArray(posts)) {
        apiStatus = 'live'
        for (const post of posts) {
          // Strict rating:g check and valid static image check
          if (post.rating !== 'g') continue
          const imgUrl = post.large_file_url || post.file_url || post.preview_file_url
          const prevUrl = post.preview_file_url || post.large_file_url || post.file_url
          if (!imgUrl || !prevUrl) continue
          if (post.file_ext && !['jpg', 'jpeg', 'png', 'webp'].includes(post.file_ext.toLowerCase())) {
            continue
          }

          const allTags = (post.tag_string_general || post.tag_string || '')
            .split(' ')
            .filter(Boolean)

          const inferredCategory: SlotCategory =
            categoryParam !== 'all'
              ? categoryParam
              : inferCategoryFromTags(allTags, slotDef?.id || 'tops')

          const jaTags = translateTagsToJa(allTags)
          const displayTitle =
            jaTags.length > 0
              ? `${jaTags.slice(0, 2).join(' × ')} 作画リファレンス #${post.id}`
              : `${primaryTag.replace(/_/g, ' ')} 衣装資料 #${post.id}`

          const paletteHint = stylePreset?.suggestedPalette
          const colors = extractColorsFromTagList(allTags, paletteHint)

          liveItems.push({
            id: `danbooru-${post.id}`,
            title: displayTitle,
            imageUrl: `/api/image-proxy?url=${encodeURIComponent(imgUrl)}`,
            previewUrl: `/api/image-proxy?url=${encodeURIComponent(prevUrl)}`,
            sourceUrl: `https://danbooru.donmai.us/posts/${post.id}`,
            source: 'danbooru',
            category: inferredCategory,
            styleIds: styleParam ? [styleParam] : undefined,
            tags: allTags.slice(0, 14),
            tagsJa: jaTags,
            dominantColors: colors,
            width: post.image_width,
            height: post.image_height,
            authorOrCredit: post.tag_string_artist ? `@${post.tag_string_artist}` : 'Danbooru Safe Ref',
            artistTip: generateArtistTip(inferredCategory, allTags)
          })
        }
      }
    }
  } catch {
    // Gracefully fall back to curated studio catalog if offline or rate-limited
    apiStatus = 'fallback'
  }

  // Combine curated items (on page 1) with live items so the artist always has rich structure cards + live examples
  const combined =
    page === 1
      ? [
          ...curatedMatches,
          ...liveItems
        ]
      : liveItems

  // If still empty on page 1 (e.g., very specific filter with no live matches), provide category-matched curated items
  const finalItems =
    combined.length > 0
      ? combined
      : CURATED_DANBOORU_ITEMS.filter((item) =>
          categoryParam === 'all' ? true : item.category === categoryParam
        )

  return {
    source: 'danbooru',
    apiStatus,
    enforcedSafety: 'rating:g',
    appliedQuery: safeDanbooruQuery,
    page,
    count: finalItems.length,
    items: finalItems
  }
})

