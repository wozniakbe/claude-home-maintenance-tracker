<script setup lang="ts">
const authStore = useAuthStore();
await authStore.init();
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header>
      <AppNavbar />
    </header>
    <main class="flex-1 p-4">
      <slot />
    </main>
  </div>
</template>
