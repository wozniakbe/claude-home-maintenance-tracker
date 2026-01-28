<script lang="ts" setup>
import type { SelectHouseComponent } from "~~/lib/db/schema";

type ComponentNode = SelectHouseComponent & { children: ComponentNode[] };

defineProps<{
  components: ComponentNode[];
  depth?: number;
}>();
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="component in components"
      :key="component.id"
      class="flex flex-col gap-2"
    >
      <NuxtLink
        :to="`/dashboard/components/${component.slug}`"
        class="card bg-base-200 border border-base-300 hover:bg-base-300 transition-colors cursor-pointer"
        :style="depth ? { marginLeft: `${depth * 1.5}rem` } : {}"
      >
        <div class="card-body py-3 px-4">
          <div class="flex items-center gap-2">
            <Icon
              v-if="component.children?.length"
              name="tabler:folder"
              size="18"
              class="text-base-content/70"
            />
            <Icon
              v-else
              name="tabler:home-cog"
              size="18"
              class="text-base-content/70"
            />
            <span class="font-medium">{{ component.name }}</span>
            <span
              v-if="component.children?.length"
              class="badge badge-ghost badge-sm"
            >
              {{ component.children.length }}
            </span>
          </div>
          <p
            v-if="component.description"
            class="text-sm text-base-content/70 line-clamp-1 mt-1"
          >
            {{ component.description }}
          </p>
        </div>
      </NuxtLink>

      <!-- Recursively render children -->
      <ComponentTree
        v-if="component.children?.length"
        :components="component.children"
        :depth="(depth ?? 0) + 1"
      />
    </div>
  </div>
</template>
