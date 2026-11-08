import { defineEventHandler, getQuery, setResponseHeaders, createError } from 'h3'

const ALLOWED_HOSTS = [
  'cdn.donmai.us',
  'danbooru.donmai.us',
  'i.pinimg.com',
  'images.unsplash.com'
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawUrl = String(query.url || '').trim()

  if (!rawUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url parameter' })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid url parameter' })
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  )
  if (!isAllowed) {
    throw createError({ statusCode: 403, statusMessage: 'Host not permitted by image proxy' })
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'FashfolioIO/1.0 (https://fashfolio.io; Costume Reference Tool)',
        Referer: `${parsed.protocol}//${parsed.hostname}/`,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(6000)
    })

    if (!upstream.ok) {
      throw createError({ statusCode: upstream.status, statusMessage: 'Upstream image fetch failed' })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await upstream.arrayBuffer()

    setResponseHeaders(event, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Access-Control-Allow-Origin': '*'
    })

    return Buffer.from(arrayBuffer)
  } catch {
    // Return a sleek fallback SVG placeholder if upstream image is unreachable
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
      <rect width="400" height="500" fill="#18181b"/>
      <text x="200" y="245" text-anchor="middle" fill="#a1a1aa" font-family="sans-serif" font-size="14">2D Costume Reference</text>
      <text x="200" y="270" text-anchor="middle" fill="#71717a" font-family="monospace" font-size="11">${parsed.hostname}</text>
    </svg>`
    setResponseHeaders(event, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    })
    return fallbackSvg
  }
})

