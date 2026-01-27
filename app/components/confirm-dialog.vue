<script lang="ts" setup>
const props = defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClass?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    dialogRef.value?.showModal();
  }
  else {
    dialogRef.value?.close();
  }
});
</script>

<template>
  <dialog
    ref="dialogRef"
    class="modal"
    @close="emit('cancel')"
  >
    <div class="modal-box">
      <h3 class="font-bold text-lg">
        {{ title }}
      </h3>
      <p class="py-4">
        {{ message }}
      </p>
      <div class="modal-action">
        <button
          class="btn btn-ghost"
          :disabled="loading"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="btn"
          :class="confirmClass || 'btn-error'"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm" />
          {{ confirmLabel || 'Confirm' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button :disabled="loading">
        close
      </button>
    </form>
  </dialog>
</template>
