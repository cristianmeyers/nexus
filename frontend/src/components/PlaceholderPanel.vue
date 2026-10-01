<script setup>
defineProps({
  icon: { type: String, default: 'fas fa-hammer' },
  message: { type: String, default: 'Cette section est en cours de développement.' },
})
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
    <div class="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-2xl mb-4">
      <i :class="icon"></i>
    </div>
    <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md">{{ message }}</p>
  </div>
</template>
