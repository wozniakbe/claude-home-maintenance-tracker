<script lang="ts" setup>
import type { SelectMaintenanceSchedule } from "~~/lib/db/schema";

const props = defineProps<{
  schedule?: SelectMaintenanceSchedule;
  loading?: boolean;
  cancelUrl?: string;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; description: string | null; intervalDays: number }];
}>();

const name = ref(props.schedule?.name ?? "");
const description = ref(props.schedule?.description ?? "");
const intervalDays = ref(props.schedule?.intervalDays ?? 30);
const errors = ref<Record<string, string>>({});

// Common interval presets
const presets = [
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Biannually", days: 182 },
  { label: "Yearly", days: 365 },
];

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

  if (!intervalDays.value || intervalDays.value < 1) {
    errors.value.intervalDays = "Interval must be at least 1 day";
    return;
  }

  if (intervalDays.value > 365 * 5) {
    errors.value.intervalDays = "Interval cannot exceed 5 years";
    return;
  }

  emit("submit", {
    name: name.value.trim(),
    description: description.value.trim() || null,
    intervalDays: intervalDays.value,
  });
}

watch(() => props.schedule, (newVal) => {
  if (newVal) {
    name.value = newVal.name;
    description.value = newVal.description ?? "";
    intervalDays.value = newVal.intervalDays;
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
        placeholder="e.g., Replace furnace filter"
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
        placeholder="Instructions or notes for this maintenance task..."
        class="textarea w-full h-24"
        :class="{ 'textarea-error': errors.description }"
        :disabled="loading"
      />
      <p v-if="errors.description" class="fieldset-label text-error">
        {{ errors.description }}
      </p>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">
        Repeat Every
      </legend>
      <div class="flex gap-2 items-center">
        <input
          v-model.number="intervalDays"
          type="number"
          min="1"
          max="1825"
          class="input w-24"
          :class="{ 'input-error': errors.intervalDays }"
          :disabled="loading"
        >
        <span>days</span>
      </div>
      <div class="flex flex-wrap gap-2 mt-2">
        <button
          v-for="preset in presets"
          :key="preset.days"
          type="button"
          class="btn btn-xs"
          :class="intervalDays === preset.days ? 'btn-primary' : 'btn-ghost'"
          :disabled="loading"
          @click="intervalDays = preset.days"
        >
          {{ preset.label }}
        </button>
      </div>
      <p v-if="errors.intervalDays" class="fieldset-label text-error">
        {{ errors.intervalDays }}
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
        {{ schedule ? 'Save Changes' : 'Create Schedule' }}
      </button>
    </div>
  </form>
</template>
