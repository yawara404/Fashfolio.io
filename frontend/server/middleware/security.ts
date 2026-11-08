import { createError, defineEventHandler, getHeader, getRequestURL, setResponseHeaders } from "h3";
import { sameOriginRequest } from "~/utils/requestOrigin";

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  const url = getRequestURL(event);
  if (url.pathname.startsWith("/api/") && !sameOriginRequest(url.href, getHeader(event, "origin"), getHeader(event, "sec-fetch-site")))
    throw createError({ statusCode: 403, statusMessage: "Cross-origin API requests are not allowed" });
});
