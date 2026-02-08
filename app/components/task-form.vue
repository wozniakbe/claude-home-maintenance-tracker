<script lang="ts" setup>
import type { SelectTask, TaskStatus } from "~~/lib/db/schema";

const props = defineProps<{
  task?: SelectTask;
  loading?: boolean;
  cancelUrl?: string;
}>();

const emit = defineEmits<{
  submit: [data: { title: string; description: string | null; dueAt: number | null; status?: TaskStatus; completedAt?: number | null }];
}>();

const title = ref(props.task?.title ?? "");
const description = ref(props.task?.description ?? "");
const dueAt = ref(props.task?.dueAt ? formatDateForInput(props.task.dueAt) : "");
const status = ref<TaskStatus>(props.task?.status ?? "pending");
const completedAt = ref(props.task?.completedAt ? formatDateForInput(props.task.completedAt) : "");

// Show status field only when editing a completed/skipped task
const showStatusField = computed(() => props.task && props.task.status !== "pending");
const showCompletedAtField = computed(() => status.value !== "pending");
const errors = ref<Record<string, string>>({});

function formatDateForInput(timestamp: number): string {
  const date = new Date(timestamp);
  // Use local date components to avoid UTC offset issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateAsLocal(dateString: string): number {
  // Parse "YYYY-MM-DD" as local time, not UTC
  const parts = dateString.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid date format: "${dateString}", expected YYYY-MM-DD`);
  }
  return new Date(year, month - 1, day).getTime();
}

function handleSubmit() {
  errors.value = {};

  if (!title.value.trim()) {
    errors.value.title = "Title is required";
    return;
  }

  if (title.value.length > 100) {
    errors.value.title = "Title must be 100 characters or less";
    return;
  }

  const data: { title: string; description: string | null; dueAt: number | null; status?: TaskStatus; completedAt?: number | null } = {
    title: title.value.trim(),
    description: description.value.trim() || null,
    dueAt: dueAt.value ? parseDateAsLocal(dueAt.value) : null,
  };

  // Only include status when editing and it changed
  if (showStatusField.value) {
    data.status = status.value;
  }

  // Include completedAt when task is completed/skipped
  if (showCompletedAtField.value && completedAt.value) {
    data.completedAt = parseDateAsLocal(completedAt.value);
  }

  emit("submit", data);
}

watch(() => props.task, (newVal) => {
  if (newVal) {
    title.value = newVal.title;
    description.value = newVal.description ?? "";
    dueAt.value = newVal.dueAt ? formatDateForInput(newVal.dueAt) : "";
    status.value = newVal.status;
    completedAt.value = newVal.completedAt ? formatDateForInput(newVal.completedAt) : "";
  }
});
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <fieldset class="fieldset">
      <legend class="fieldset-legend">
        Title
      </legend>
      <input
        v-model="title"
        type="text"
        placeholder="e.g., Replace furnace filter"
        class="input w-full"
        :class="{ 'input-error': errors.title }"
        :disabled="loading"
      >
      <p v-if="errors.title" class="fieldset-label text-error">
        {{ errors.title }}
      </p>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">
        Description (optional)
      </legend>
      <textarea
        v-model="description"
        placeholder="Additional details or notes..."
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
        Due Date (optional)
      </legend>
      <input
        v-model="dueAt"
        type="date"
        class="input w-full"
        :disabled="loading"
      >
    </fieldset>

    <fieldset v-if="showStatusField" class="fieldset">
      <legend class="fieldset-legend">
        Status
      </legend>
      <select
        v-model="status"
        class="select w-full"
        :disabled="loading"
      >
        <option value="pending">
          Pending
        </option>
        <option value="completed">
          Completed
        </option>
        <option value="skipped">
          Skipped
        </option>
      </select>
      <p class="fieldset-label">
        Change to "Pending" to reopen this task
      </p>
    </fieldset>

    <fieldset v-if="showCompletedAtField" class="fieldset">
      <legend class="fieldset-legend">
        Completed Date
      </legend>
      <input
        v-model="completedAt"
        type="date"
        class="input w-full"
        :disabled="loading"
      >
      <p class="fieldset-label">
        When this task was completed or skipped
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
        {{ task ? 'Save Changes' : 'Add Task' }}
      </button>
    </div>
  </form>
</template>
