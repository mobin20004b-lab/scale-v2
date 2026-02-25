<template>
  <div class="dashboard-grid">
    <Card>
      <template #title>
        <div class="card-title">
          <span>Access Point</span>
          <Tag value="Always on" severity="info" />
        </div>
      </template>
      <template #content>
        <p><strong>SSID:</strong> {{ status.ap_ssid || 'Loading...' }}</p>
        <p><strong>IP Address:</strong> {{ status.ap_ip || 'Loading...' }}</p>
        <p><strong>Device:</strong> {{ status.device_name || '-' }}</p>
        <p><strong>Host Name:</strong> {{ status.wifi_hostname || '-' }}</p>
      </template>
    </Card>

    <Card>
      <template #title>
        <div class="card-title">
          <span>Station Network</span>
          <Tag :value="liveLabel" :severity="isLive ? 'success' : 'warning'" />
        </div>
      </template>
      <template #content>
        <p>
          <strong>Status:</strong>
          <Tag :value="status.sta_connected ? 'Connected' : 'Disconnected'" :severity="status.sta_connected ? 'success' : 'danger'" />
        </p>
        <p><strong>SSID:</strong> {{ status.sta_ssid || '-' }}</p>
        <p><strong>IP Address:</strong> {{ status.sta_connected ? status.sta_ip : '-' }}</p>
        <p><strong>Signal:</strong> {{ status.sta_connected ? `${status.rssi} dBm` : '-' }}</p>
        <p><strong>Disconnect Reason:</strong> {{ status.last_disconnect_reason || 'none' }}</p>
      </template>
    </Card>

    <Card>
      <template #title>Diagnostics</template>
      <template #content>
        <p><strong>Uptime:</strong> {{ uptimeText }}</p>
        <p><strong>Connect timeout:</strong> {{ status.wifi_timeout_ms || '-' }} ms</p>
        <p><strong>Reconnect interval:</strong> {{ status.reconnect_interval_ms || '-' }} ms</p>
        <p><strong>Connection attempts:</strong> {{ status.connection_attempts || 0 }}</p>
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
const isLive = ref(false)
let pollInterval
let eventSource
let liveTimeout

const uptimeText = computed(() => {
  const total = Number(status.value.uptime_seconds || 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}h ${m}m ${s}s`
})

const liveLabel = computed(() => (isLive.value ? 'Live updates' : 'Polling'))

const bumpLive = () => {
  isLive.value = true
  clearTimeout(liveTimeout)
  liveTimeout = setTimeout(() => {
    isLive.value = false
  }, 10000)
}

const fetchStatus = async () => {
  try {
    const res = await fetch('/api/status')
    if (res.ok) status.value = await res.json()
  } catch (e) {
    console.error('Failed to fetch status', e)
  }
}

const connectRealtime = () => {
  if (!window.EventSource) return
  eventSource = new EventSource('/api/events')

  eventSource.addEventListener('status', (event) => {
    try {
      status.value = JSON.parse(event.data)
      bumpLive()
    } catch (e) {
      console.error('Failed to parse status event', e)
    }
  })

  eventSource.onerror = () => {
    isLive.value = false
  }
}

const testInternet = async () => {
  testing.value = true
  testResult.value = ''
  try {
    const res = await fetch('/api/wifi/test')
    const data = await res.json()
    testResult.value = data.result || 'Unknown result'
  } catch {
    testResult.value = 'Network error'
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  fetchStatus()
  connectRealtime()
  pollInterval = setInterval(fetchStatus, 8000)
})

onUnmounted(() => {
  clearInterval(pollInterval)
  clearTimeout(liveTimeout)
  if (eventSource) eventSource.close()
})
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: 1rem;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
</style>
