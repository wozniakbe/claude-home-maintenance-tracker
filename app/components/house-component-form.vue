<script lang="ts" setup>
import type { SelectHouseComponent } from "~~/lib/db/schema";

const props = defineProps<{
  houseComponent?: SelectHouseComponent & { parentId?: number | null };
  availableParents?: { id: number; name: string; slug: string }[];
  initialParentId?: number | null;
  loading?: boolean;
  cancelUrl?: string;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; description: string | null; parentId: number | null }];
}>();

const name = ref(props.houseComponent?.name ?? "");
const description = ref(props.houseComponent?.description ?? "");
const parentId = ref<number | null>(props.houseComponent?.parentId ?? props.initialParentId ?? null);
const errors = ref<Record<string, string>>({});

// Filter out the current component and its descendants from available parents
const filteredParents = computed(() => {
  if (!props.availableParents)
    return [];
  if (!props.houseComponent)
    return props.availableParents;

  // Can't be its own parent
  return props.availableParents.filter(p => p.id !== props.houseComponent!.id);
});

function handleSubmit() {
  errors.value = {};

  if (!name.value.trim()) {
    errors.value.name = "Name is required";
    return;
  }

  if (name.value.length > 100) {
    errors.value.name = "Name must be 100 characters or less";
    return;
  }

  emit("submit", {
    name: name.value.trim(),
    description: description.value.trim() || null,
    parentId: parentId.value,
  });
}

watch(() => props.houseComponent, (newVal) => {
  if (newVal) {
    name.value = newVal.name;
    description.value = newVal.description ?? "";
    parentId.value = newVal.parentId ?? null;
  }
});
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <fieldset class="fieldset">
      <legend class="fieldset-legend">
        Name
      </legend>
      <input
        v-model="name"
        type="text"
        placeholder="e.g., Furnace, Kitchen Sink, Garage"
        class="input w-full"
        :class="{ 'input-error': errors.name }"
        :disabled="loading"
      >
      <p v-if="errors.name" class="fieldset-label text-error">
        {{ errors.name }}
      </p>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">
        Description (optional)
      </legend>
      <textarea
        v-model="description"
        placeholder="Notes about this component..."
        class="textarea w-full h-24"
        :class="{ 'textarea-error': errors.description }"
        :disabled="loading"
      />
      <p v-if="errors.description" class="fieldset-label text-error">
        {{ errors.description }}
      </p>
    </fieldset>

    <fieldset v-if="filteredParents.length > 0" class="fieldset">
      <legend class="fieldset-legend">
        Parent Component (optional)
      </legend>
      <select
        v-model="parentId"
        class="select w-full"
        :disabled="loading"
      >
        <option :value="null">
          None (top-level component)
        </option>
        <option
          v-for="parent in filteredParents"
          :key="parent.id"
          :value="parent.id"
        >
          {{ parent.name }}
        </option>
      </select>
      <p class="fieldset-label text-base-content/70">
        Organize this component under another component
      </p>
    </fieldset>

    <div class="flex gap-2 justify-end pt-2">
      <NuxtLink
        :to="cancelUrl || '/dashboard'"
        class="btn btn-ghost"
        :class="{ 'btn-disabled': loading }"
      >
        Cancel
      </NuxtLink>
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="loading"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm" />
        {{ houseComponent ? 'Save Changes' : 'Add Component' }}
      </button>
    </div>
  </form>
</template>
