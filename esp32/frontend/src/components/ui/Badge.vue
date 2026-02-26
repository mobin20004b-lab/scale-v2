<template>
  <span class="ui-badge" :class="`ui-badge--${variant}`">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  variant: { type: String, default: 'default' }
})
</script>
