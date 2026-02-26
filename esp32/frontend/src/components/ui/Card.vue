<template>
  <section class="ui-card">
    <header v-if="$slots.header || title" class="ui-card-header">
      <slot name="header">
        <h3 class="ui-card-title">{{ title }}</h3>
        <p v-if="description" class="ui-card-description">{{ description }}</p>
      </slot>
    </header>
    <div class="ui-card-content">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' }
})
</script>
