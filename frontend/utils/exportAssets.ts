/** Keep PNG composition local: never fetch arbitrary third-party/private URLs. */
export function localExportAsset(href: string, origin: string): string {
  if (/^data:image\/(?:png|jpeg|webp|svg\+xml)(?:;[^,]*)?,/i.test(href)) return href;
  const url = new URL(href, origin);
  if (url.protocol === "blob:" && url.origin === origin) return url.href;
  if (url.origin === origin && ["http:", "https:"].includes(url.protocol) && !url.username && !url.password)
    return url.href;
  throw new Error("このサイト内の素材だけを書き出せます。外部画像は読み込みません。");
}

export function illustrationSize(viewBox: string | null, width: number) {
  const [, , w, h] = (viewBox || "0 0 480 720").trim().split(/[\s,]+/).map(Number);
  if (!Number.isFinite(width) || width < 320 || width > 2400 || !w || !h || !Number.isFinite(h / w) || h / w > 3 || h / w < .3)
    throw new Error("画像のサイズが正しくありません。");
  return { width: Math.round(width), height: Math.round(width * h / w) };
}
