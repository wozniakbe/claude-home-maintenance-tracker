import tailwindcss from "@tailwindcss/vite";

import env from "./lib/env";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: "Home Tracker",
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/TablerHomeCog.svg" },
      ],
    },
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  modules: [
    "@nuxt/eslint",
    "@nuxt/icon",
    "@pinia/nuxt",
    "nuxt-csurf",
  ],
  csurf: {
    // Disable CSRF in test mode - API integration tests don't use browser sessions
    // eslint-disable-next-line node/no-process-env
    enabled: process.env.NODE_ENV !== "test",
  },
  runtimeConfig: {
    testAuthBypass: false,
    public: {
      s3BucketUrl: env.S3_BUCKET_URL,
    },
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
    server: {
      watch: {
        ignored: ["./docker-data/*"],
      },
    },
  },
});
