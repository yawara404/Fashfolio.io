// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    apiBase: "http://127.0.0.1:8085",
    public: {
      apiBase: "http://127.0.0.1:8085",
    },
  },
  routeRules: {
    "/api/**": { proxy: "http://127.0.0.1:8085/api/**" },
  },
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"],
  css: ["~/assets/css/main.css", "~/assets/css/dress-up.css", "~/assets/css/avatar.css"],
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "Fashfolio — 絵師向けコーデプロンプトメーカー",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "衣装パーツと配色を選んで、イラスト設定文・AI用プロンプト・資料リンクをまとめて生成。Ollamaで衣装のアイデアも。",
        },
        { name: "theme-color", content: "#ffffff" },
      ],
      link: [
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
        },
      ],
    },
  },
  typescript: {
    strict: true,
  },
});
