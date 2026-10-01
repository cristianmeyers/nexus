<script setup>
defineProps({ modelValue: { type: Boolean, default: false } })
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="relative inline-flex items-center cursor-pointer shrink-0">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
      class="sr-only peer"
    />
    <div
      class="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer-checked:bg-blue-600 transition-colors duration-200 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-5"
    ></div>
  </label>
</template>