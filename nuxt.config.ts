import tailwindcss from "@tailwindcss/vite";

import env from "./lib/env";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: "Home Tracker",
      meta: [
        { name: "theme-color", content: "#1c1e2a" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/TablerHomeCog.svg" },
        { rel: "apple-touch-icon", href: "/pwa-192x192.png" },
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
    "nuxt-easy-lightbox",
    ["@vite-pwa/nuxt", {
      registerType: "autoUpdate",
      manifest: {
        name: "Home Tracker",
        short_name: "Home Tracker",
        description: "Track and manage home maintenance tasks",
        theme_color: "#1c1e2a",
        background_color: "#1c1e2a",
        display: "standalone",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: undefined,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 128,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }],
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
