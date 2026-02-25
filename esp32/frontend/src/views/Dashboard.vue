<template>
  <div class="dashboard-grid">
    <Card>
      <template #title>Access Point</template>
      <template #content>
        <p><strong>SSID:</strong> {{ status.ap_ssid || 'Loading...' }}</p>
        <p><strong>IP Address:</strong> {{ status.ap_ip || 'Loading...' }}</p>
        <p><strong>Device:</strong> {{ status.device_name || '-' }}</p>
      </template>
    </Card>

    <Card>
      <template #title>Station Network</template>
      <template #content>
        <p>
          <strong>Status:</strong>
          <Tag :value="status.sta_connected ? 'Connected' : 'Disconnected'" :severity="status.sta_connected ? 'success' : 'danger'" />
        </p>
        <p><strong>SSID:</strong> {{ status.sta_ssid || '-' }}</p>
        <p><strong>IP Address:</strong> {{ status.sta_connected ? status.sta_ip : '-' }}</p>
        <p><strong>Signal:</strong> {{ status.sta_connected ? `${status.rssi} dBm` : '-' }}</p>
      </template>
    </Card>

    <Card>
      <template #title>Diagnostics</template>
      <template #content>
        <p><strong>Uptime:</strong> {{ uptimeText }}</p>
        <p><strong>Connect timeout:</strong> {{ status.wifi_timeout_ms || '-' }} ms</p>
        <Button :label="testing ? 'Testing...' : 'Test Internet Connection'" icon="pi pi-globe" :loading="testing" :disabled="!status.sta_connected" @click="testInternet" />
        <Message v-if="testResult" class="mt-3" severity="info" :closable="false">{{ testResult }}</Message>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Message from 'primevue/message'

const status = ref({})
const testResult = ref('')
const testing = ref(false)
let pollInterval

const uptimeText = computed(() => {
  const total = Number(status.value.uptime_seconds || 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}h ${m}m ${s}s`
})

const fetchStatus = async () => {
  try {
    const res = await fetch('/api/status')
    if (res.ok) status.value = await res.json()
  } catch (e) {
    console.error('Failed to fetch status', e)
  }
}

const testInternet = async () => {
  testing.value = true
  testResult.value = ''
  try {
    const res = await fetch('/api/wifi/test')
    const data = await res.json()
    testResult.value = data.result || 'Unknown result'
  } catch (e) {
    testResult.value = 'Network error'
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  fetchStatus()
  pollInterval = setInterval(fetchStatus, 3000)
})

onUnmounted(() => clearInterval(pollInterval))
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: 1rem;
}
</style>
