<script lang="ts" setup>
import type { SelectHouseComponent } from "~~/lib/db/schema";

const props = defineProps<{
  houseComponent?: SelectHouseComponent;
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; description: string | null }];
}>();

const name = ref(props.houseComponent?.name ?? "");
const description = ref(props.houseComponent?.description ?? "");
const errors = ref<Record<string, string>>({});

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
  });
}

watch(() => props.houseComponent, (newVal) => {
  if (newVal) {
    name.value = newVal.name;
    description.value = newVal.description ?? "";
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

    <div class="flex gap-2 justify-end pt-2">
      <NuxtLink
        to="/dashboard"
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
