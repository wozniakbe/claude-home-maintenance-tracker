<script lang="ts" setup>
const authStore = useAuthStore();

onMounted(async () => {
  await authStore.signOut();
});
</script>

<template>
  <div class="flex min-h-64 items-center justify-center">
    <span class="loading loading-spinner loading-lg" />
  </div>
</template>
