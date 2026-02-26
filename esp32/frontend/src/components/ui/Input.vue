<template>
  <input
    class="ui-input"
    :type="type"
    :placeholder="placeholder"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  >
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' }
})

defineEmits(['update:modelValue'])
</script>
