<script setup lang="ts">
const authStore = useAuthStore();
await authStore.init();

const config = useRuntimeConfig();
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <header>
      <AppNavbar />
    </header>
    <main class="flex-1 p-4 pb-8">
      <slot />
    </main>
    <footer class="text-center text-xs text-base-content/30 py-3">
      v{{ config.public.appVersion }} ({{ config.public.gitSha }})
    </footer>
  </div>
</template>
