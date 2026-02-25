<template>
  <div class="app-shell">
    <Card>
      <template #title>
        <div class="header-wrap">
          <div class="header-title">
            <i class="pi pi-bolt" />
            ESP32 Realtime Console
          </div>
          <p class="subtitle">Faster Wi-Fi diagnostics, cleaner setup flow, and richer device controls.</p>
        </div>
      </template>
      <template #content>
        <TabMenu :model="menuItems" :activeIndex="activeIndex" class="mb-4" />
        <router-view />
      </template>
    </Card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import TabMenu from 'primevue/tabmenu'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { label: 'Wi-Fi', icon: 'pi pi-wifi', command: () => router.push('/wifi') },
  { label: 'Settings', icon: 'pi pi-sliders-h', command: () => router.push('/config') }
]

const activeIndex = computed(() => {
  if (route.path === '/config') return 1
  return 0
})
</script>

<style>
body {
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.15), transparent 45%),
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 40%),
    linear-gradient(160deg, #f3f7ff 0%, #f7fff8 100%);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

#app {
  min-height: 100vh;
  padding: 1rem;
}

.app-shell {
  max-width: 960px;
  margin: 0 auto;
}

.header-wrap {
  display: grid;
  gap: 0.35rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.35rem;
}

.subtitle {
  color: #4b5563;
  margin: 0;
  font-size: 0.92rem;
}

.p-card .p-card-content {
  padding-top: 0;
}
</style>
