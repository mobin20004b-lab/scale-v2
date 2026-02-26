<template>
  <div class="ui-alert" :class="`ui-alert--${variant}`">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'default' }
})
</script>
