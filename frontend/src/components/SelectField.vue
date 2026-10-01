<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true }, // [{ value, label, disabled? }]
  label: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="space-y-1 w-full">
    <label v-if="label" class="block text-[10px] font-black uppercase text-slate-400">{{ label }}</label>
    <div class="relative">
      <select
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
        class="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3.5 pr-10 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 cursor-pointer transition-colors"
      >
        <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled">
          {{ opt.label }}
        </option>
      </select>
      <i
        class="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"
      ></i>
    </div>
  </div>
</template>