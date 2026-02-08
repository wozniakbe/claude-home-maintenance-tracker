<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const taskId = route.params.id as string;
const { $csrfFetch } = useNuxtApp();

const { data: task, status, refresh } = await useFetch(`/api/tasks/${taskId}`);

const showDeleteDialog = ref(false);
const showDeleteImageDialog = ref(false);
const deleteLoading = ref(false);
const completeLoading = ref(false);
const deletingImageId = ref<number | null>(null);
const deleteImageLoading = ref(false);

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function isOverdue(dueAt: number | null, taskStatus: string): boolean {
  if (!dueAt)
    return false;
  return dueAt < Date.now() && taskStatus === "pending";
}

async function handleComplete(status: "completed" | "skipped") {
  completeLoading.value = true;
  try {
    await $csrfFetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      body: { status },
    });
    await refresh();
  }
  finally {
    completeLoading.value = false;
  }
}

async function handleDelete() {
  deleteLoading.value = true;
  try {
    await $csrfFetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    router.push(`/dashboard/components/${task.value?.houseComponent.slug}`);
  }
  catch {
    deleteLoading.value = false;
    showDeleteDialog.value = false;
  }
}

function confirmDeleteImage(imageId: number) {
  deletingImageId.value = imageId;
  showDeleteImageDialog.value = true;
}

async function handleDeleteImage() {
  if (!deletingImageId.value)
    return;

  deleteImageLoading.value = true;
  try {
    await $csrfFetch(`/api/tasks/${taskId}/image/${deletingImageId.value}`, {
      method: "DELETE",
    });
    await refresh();
  }
  finally {
    deleteImageLoading.value = false;
    showDeleteImageDialog.value = false;
    deletingImageId.value = null;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-2xl">
    <!-- Loading State -->
    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Error State -->
    <div v-else-if="status === 'error' || !task" class="alert alert-error">
      <Icon name="tabler:alert-circle" size="20" />
      <span>Task not found</span>
      <NuxtLink to="/dashboard" class="btn btn-sm">
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="`/dashboard/components/${task.houseComponent.slug}`"
            class="btn btn-ghost btn-sm btn-square"
          >
            <Icon name="tabler:arrow-left" size="20" />
          </NuxtLink>
          <div>
            <p class="text-sm text-base-content/70">
              {{ task.houseComponent.name }}
            </p>
            <h1 class="text-2xl font-bold">
              {{ task.title }}
            </h1>
          </div>
        </div>
        <div class="flex gap-2">
          <NuxtLink
            :to="`/dashboard/tasks/${taskId}/edit`"
            class="btn btn-ghost btn-sm"
          >
            <Icon name="tabler:edit" size="18" />
            Edit
          </NuxtLink>
          <button
            class="btn btn-ghost btn-sm text-error"
            @click="showDeleteDialog = true"
          >
            <Icon name="tabler:trash" size="18" />
            Delete
          </button>
        </div>
      </div>

      <!-- Status Card -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <div class="flex flex-wrap gap-4">
            <div>
              <p class="text-sm text-base-content/70">
                Status
              </p>
              <span
                class="badge"
                :class="{
                  'badge-warning': task.status === 'pending',
                  'badge-success': task.status === 'completed',
                  'badge-ghost': task.status === 'skipped',
                }"
              >
                {{ task.status }}
              </span>
            </div>

            <div v-if="task.dueAt">
              <p class="text-sm text-base-content/70">
                Due Date
              </p>
              <p :class="isOverdue(task.dueAt, task.status) ? 'text-error font-medium' : ''">
                <Icon
                  v-if="isOverdue(task.dueAt, task.status)"
                  name="tabler:alert-circle"
                  size="16"
                  class="inline"
                />
                {{ formatDate(task.dueAt) }}
              </p>
            </div>

            <div v-if="task.completedAt">
              <p class="text-sm text-base-content/70">
                Completed
              </p>
              <p>{{ formatDate(task.completedAt) }}</p>
            </div>

            <div>
              <p class="text-sm text-base-content/70">
                Created
              </p>
              <p>{{ formatDate(task.createdAt) }}</p>
            </div>
          </div>

          <!-- Complete Actions -->
          <div v-if="task.status === 'pending'" class="flex gap-2 mt-4 pt-4 border-t border-base-300">
            <button
              class="btn btn-success btn-sm"
              :disabled="completeLoading"
              @click="handleComplete('completed')"
            >
              <span v-if="completeLoading" class="loading loading-spinner loading-xs" />
              <Icon
                v-else
                name="tabler:check"
                size="18"
              />
              Mark Completed
            </button>
            <button
              class="btn btn-ghost btn-sm"
              :disabled="completeLoading"
              @click="handleComplete('skipped')"
            >
              <Icon name="tabler:x" size="18" />
              Skip
            </button>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="task.description" class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-base">
            Description
          </h2>
          <p class="whitespace-pre-wrap">
            {{ task.description }}
          </p>
        </div>
      </div>

      <!-- Images Section -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-base">
            Images
          </h2>

          <!-- Existing Images -->
          <div v-if="task.images?.length" class="mb-4">
            <ImageGallery :images="task.images">
              <template #default="{ image }">
                <div class="absolute bottom-2 right-2">
                  <button
                    class="btn btn-error btn-xs"
                    @click.stop="confirmDeleteImage(image.id)"
                  >
                    <Icon name="tabler:trash" size="14" />
                  </button>
                </div>
              </template>
            </ImageGallery>
          </div>
          <p v-else class="text-base-content/50 text-sm mb-4">
            No images attached yet.
          </p>

          <!-- Upload -->
          <div class="border-t border-base-300 pt-4">
            <h3 class="text-sm font-medium mb-3">
              Add Image
            </h3>
            <ImageUpload :task-id="Number(taskId)" @uploaded="refresh" />
          </div>
        </div>
      </div>

      <!-- Delete Image Confirmation Dialog -->
      <ConfirmDialog
        :open="showDeleteImageDialog"
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        confirm-label="Delete"
        :loading="deleteImageLoading"
        @confirm="handleDeleteImage"
        @cancel="showDeleteImageDialog = false"
      />

      <!-- Delete Confirmation Dialog -->
      <ConfirmDialog
        :open="showDeleteDialog"
        title="Delete Task"
        :message="`Are you sure you want to delete '${task.title}'? This action cannot be undone.`"
        confirm-label="Delete"
        :loading="deleteLoading"
        @confirm="handleDelete"
        @cancel="showDeleteDialog = false"
      />
    </template>
  </div>
</template>
