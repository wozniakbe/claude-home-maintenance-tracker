<script setup lang="ts">
const authStore = useAuthStore();
await authStore.init();
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <header>
      <AppNavbar />
    </header>
    <main class="flex-1 p-4 pb-8">
      <slot />
    </main>
  </div>
</template>
