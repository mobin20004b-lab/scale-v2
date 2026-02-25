<template>
  <div class="app-shell">
    <Card>
      <template #title>
        <div class="header-title">
          <i class="pi pi-cog" />
          ESP32 Device Console
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
  { label: 'Dashboard', icon: 'pi pi-home', command: () => router.push('/') },
  { label: 'Wi-Fi', icon: 'pi pi-wifi', command: () => router.push('/wifi') },
  { label: 'Settings', icon: 'pi pi-sliders-h', command: () => router.push('/config') }
]

const activeIndex = computed(() => {
  if (route.path === '/wifi') return 1
  if (route.path === '/config') return 2
  return 0
})
</script>

<style>
body {
  margin: 0;
  background: linear-gradient(160deg, #f2f7ff 0%, #f6fff8 100%);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

#app {
  min-height: 100vh;
  padding: 1rem;
}

.app-shell {
  max-width: 920px;
  margin: 0 auto;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
}

.p-card .p-card-content {
  padding-top: 0;
}
</style>
