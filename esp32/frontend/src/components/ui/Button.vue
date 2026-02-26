<template>
  <button
    class="ui-button"
    :class="[`ui-button--${variant}`, { 'is-loading': loading }]"
    :disabled="disabled || loading"
    type="button"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  variant: { type: String, default: 'default' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})
</script>
