import {
  createError,
  defineEventHandler,
  getRequestURL,
  proxyRequest,
} from "h3";

// One same-origin boundary: API credentials and Ollama access stay in Python.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const url = getRequestURL(event);
  const path = url.pathname.replace(/^\/api\//, "");
  if (
    !/^(catalog|prompts|recommend|references|health|integrations)$/.test(path)
  ) {
    throw createError({ statusCode: 404, statusMessage: "Unknown API route" });
  }
  try {
    return await proxyRequest(
      event,
      `${config.apiBase}/api/${path}${url.search}`,
    );
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage:
        "Python API unavailable. Run npm run dev from the project root.",
    });
  }
});
