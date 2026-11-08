/** Stop cross-site pages from driving the local AI/API through the browser. */
export function sameOriginRequest(requestUrl: string, origin?: string, fetchSite?: string) {
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false;
  if (!origin) return true; // SSR, command-line clients and same-origin GETs may omit it.
  try { return new URL(origin).origin === new URL(requestUrl).origin; }
  catch { return false; }
}
