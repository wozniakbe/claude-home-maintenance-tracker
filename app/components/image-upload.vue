<script lang="ts" setup>
const props = defineProps<{
  taskId: number;
}>();

const emit = defineEmits<{
  uploaded: [];
}>();

const { $csrfFetch } = useNuxtApp();

const image = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const caption = ref("");
const loading = ref(false);
const errorMessage = ref("");
const imageInput = useTemplateRef("imageInput");

function selectImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    image.value = file;
    previewUrl.value = URL.createObjectURL(file);
    errorMessage.value = "";
  }
}

function clearImage() {
  image.value = null;
  previewUrl.value = null;
  caption.value = "";
  errorMessage.value = "";
  if (imageInput.value) {
    imageInput.value.value = "";
  }
}

async function getChecksum(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return btoa(String.fromCodePoint(...new Uint8Array(hashBuffer)));
}

async function uploadImage() {
  if (!image.value || !previewUrl.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  const previewImage = new Image();
  previewImage.addEventListener("load", async () => {
    try {
      // Resize image client-side
      const width = Math.min(1000, previewImage.width);
      const resized = await createImageBitmap(previewImage, {
        resizeWidth: width,
      });
      const canvas = new OffscreenCanvas(width, resized.height);
      canvas.getContext("bitmaprenderer")?.transferFromImageBitmap(resized);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });

      const checksum = await getChecksum(blob);

      // Step 1: Get presigned URL
      const { fields, key, url } = await $csrfFetch(`/api/tasks/${props.taskId}/sign-image`, {
        method: "POST",
        body: {
          contentLength: blob.size,
          checksum,
        },
      });

      // Step 2: Upload to S3
      const formData = new FormData();
      Object.entries(fields).forEach(([fieldKey, value]) => {
        formData.append(fieldKey, value as string);
      });
      formData.append("file", blob);

      await $fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          "x-amz-checksum-algorithm": "SHA256",
        },
      });

      // Step 3: Confirm upload in database
      await $csrfFetch(`/api/tasks/${props.taskId}/image`, {
        method: "POST",
        body: {
          key,
          caption: caption.value.trim() || null,
        },
      });

      clearImage();
      emit("uploaded");
    }
    catch (e: unknown) {
      const error = e as { statusMessage?: string; message?: string };
      errorMessage.value = error.statusMessage || error.message || "Upload failed";
    }
    loading.value = false;
  });

  previewImage.src = previewUrl.value;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Preview -->
    <div
      class="relative flex items-center justify-center bg-base-300 border border-base-content/10 rounded-lg h-32 overflow-hidden"
    >
      <p v-if="!previewUrl" class="text-base-content/50 text-sm">
        Select an image to upload
      </p>
      <img
        v-else
        :src="previewUrl"
        alt="Upload preview"
        class="h-full object-contain"
      >
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-base-100/80"
      >
        <span class="loading loading-spinner loading-md" />
      </div>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="alert alert-error alert-sm">
      <Icon name="tabler:alert-circle" size="16" />
      <span class="text-sm">{{ errorMessage }}</span>
    </div>

    <!-- Controls -->
    <div class="flex gap-2">
      <input
        ref="imageInput"
        type="file"
        accept="image/*"
        class="file-input file-input-bordered file-input-sm flex-1"
        :disabled="loading"
        @change="selectImage"
      >
      <button
        v-if="previewUrl"
        class="btn btn-ghost btn-sm"
        :disabled="loading"
        @click="clearImage"
      >
        <Icon name="tabler:x" size="18" />
      </button>
    </div>

    <!-- Caption (optional) -->
    <input
      v-model="caption"
      type="text"
      placeholder="Caption (optional)"
      class="input input-bordered input-sm w-full"
      maxlength="500"
      :disabled="loading || !previewUrl"
    >

    <button
      class="btn btn-primary btn-sm"
      :disabled="!image || loading"
      @click="uploadImage"
    >
      <span v-if="loading" class="loading loading-spinner loading-xs" />
      <Icon
        v-else
        name="tabler:upload"
        size="18"
      />
      Upload Image
    </button>
  </div>
</template>
