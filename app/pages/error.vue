<script setup lang="ts">
const route = useRoute();
const errorMessage = computed(() => route.query.error || "An error occurred");
</script>

<template>
  <div class="flex min-h-64 flex-col items-center justify-center gap-4">
    <Icon
      name="tabler:alert-circle"
      size="64"
      class="text-error"
    />
    <h1 class="text-2xl font-bold">
      Something went wrong
    </h1>
    <p class="text-base-content/70">
      {{ errorMessage }}
    </p>
    <NuxtLink to="/" class="btn btn-primary">
      <Icon name="tabler:arrow-left" size="20" />
      Back to Home
    </NuxtLink>
  </div>
</template>
