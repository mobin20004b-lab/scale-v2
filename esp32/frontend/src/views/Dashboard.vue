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
        <p><strong>Signal:</strong> {{ status.sta_connected ? `${status.rssi} dBm (${signalQuality}%)` : '-' }}</p>
        <p><strong>Channel:</strong> {{ status.wifi_channel || '-' }}</p>
        <p><strong>Disconnect Reason:</strong> {{ status.last_disconnect_reason || 'none' }}</p>
        <p>
          <strong>RGB LED:</strong>
          <Tag :value="status.led_state || 'unknown'" :severity="ledSeverity" />
        </p>
      </template>
    </Card>

    <Card>
      <template #title>
        <div class="card-title">
          <span>Scale Weight</span>
          <Tag :value="status.weight_available ? 'Live' : 'No Data'" :severity="status.weight_available ? 'success' : 'warning'" />
        </div>
      </template>
      <template #content>
        <p class="weight-value">{{ formattedWeight }}</p>
        <p><strong>Raw frame:</strong> {{ status.weight_raw || 'No Data' }}</p>
        <p><strong>Last upload:</strong> {{ uploadStatus }}</p>
      </template>
    </Card>

    <Card>
      <template #title>Diagnostics</template>
      <template #content>
        <p><strong>Uptime:</strong> {{ uptimeText }}</p>
        <p><strong>Chip temp:</strong> {{ formatTemperature(status.chip_temp_c) }}</p>
        <p><strong>Heap free:</strong> {{ formatBytes(status.free_heap_bytes) }}</p>
        <p><strong>Connect timeout:</strong> {{ status.wifi_timeout_ms || '-' }} ms</p>
        <p><strong>Reconnect interval:</strong> {{ status.reconnect_interval_ms || '-' }} ms</p>
        <p><strong>Connection attempts:</strong> {{ status.connection_attempts || 0 }}</p>
        <Button :label="testing ? 'Testing...' : 'Test Internet Connection'" icon="pi pi-globe" :loading="testing" :disabled="!status.sta_connected" @click="testInternet" />
        <Message v-if="testResult" class="mt-3" severity="info" :closable="false">{{ testResult }}</Message>
      </template>
    </Card>

    <Card>
      <template #title>Signal Trend (RSSI dBm)</template>
      <template #content>
        <div class="chart-wrap">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" class="sparkline">
            <path :d="rssiPath" class="line line-rssi" />
          </svg>
        </div>
        <small class="muted">Last {{ maxHistory }} samples</small>
      </template>
    </Card>

    <Card>
      <template #title>Temperature Trend (°C)</template>
      <template #content>
        <div class="chart-wrap">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" class="sparkline">
            <path :d="tempPath" class="line line-temp" />
          </svg>
        </div>
        <small class="muted">Internal ESP32 temperature readings</small>
      </template>
    </Card>

    <Card>
      <template #title>Heap Trend (KB)</template>
      <template #content>
        <div class="chart-wrap">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" class="sparkline">
            <path :d="heapPath" class="line line-heap" />
          </svg>
        </div>
        <small class="muted">Free heap memory history</small>
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
const maxHistory = 40
const rssiHistory = ref([])
const tempHistory = ref([])
const heapHistory = ref([])
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

const signalQuality = computed(() => {
  if (!status.value.sta_connected) return 0
  const rssi = Number(status.value.rssi || -100)
  if (rssi <= -100) return 0
  if (rssi >= -50) return 100
  return Math.round(2 * (rssi + 100))
})

const ledSeverity = computed(() => {
  switch (status.value.led_state) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'waiting-config': return 'info'
    case 'restarting': return 'secondary'
    case 'error': return 'danger'
    default: return 'contrast'
  }
})

const formattedWeight = computed(() => {
  if (!status.value.weight_available) return '-'
  const value = Number(status.value.weight_value)
  if (!Number.isFinite(value)) return '-'
  return `${value.toFixed(3)}`
})

const uploadStatus = computed(() => {
  if (!status.value.weight_last_post_ms) return 'Not uploaded yet'
  const code = status.value.weight_last_post_code
  const result = status.value.weight_last_post_result || 'unknown'
  return `HTTP ${code} (${result})`
})

const makePath = (values) => {
  if (!values.length) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 30 - ((value - min) / spread) * 28 - 1
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

const rssiPath = computed(() => makePath(rssiHistory.value))
const tempPath = computed(() => makePath(tempHistory.value))
const heapPath = computed(() => makePath(heapHistory.value))

const pushSample = (target, value) => {
  if (!Number.isFinite(value)) return
  target.value.push(value)
  if (target.value.length > maxHistory) target.value.shift()
}

const pushMetrics = () => {
  if (status.value.sta_connected) pushSample(rssiHistory, Number(status.value.rssi))
  pushSample(tempHistory, Number(status.value.chip_temp_c))
  pushSample(heapHistory, Number(status.value.free_heap_bytes) / 1024)
}

const bumpLive = () => {
  isLive.value = true
  clearTimeout(liveTimeout)
  liveTimeout = setTimeout(() => {
    isLive.value = false
  }, 10000)
}

const applyStatus = (nextStatus) => {
  status.value = nextStatus
  pushMetrics()
}

const fetchStatus = async () => {
  try {
    const res = await fetch('/api/status')
    if (res.ok) applyStatus(await res.json())
  } catch (e) {
    console.error('Failed to fetch status', e)
  }
}

const connectRealtime = () => {
  if (!window.EventSource) return
  eventSource = new EventSource('/api/events')

  eventSource.addEventListener('status', (event) => {
    try {
      applyStatus(JSON.parse(event.data))
      bumpLive()
    } catch (e) {
      console.error('Failed to parse status event', e)
    }
  })

  eventSource.onerror = () => {
    isLive.value = false
  }
}

const formatBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '-'
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}

const formatTemperature = (value) => {
  const t = Number(value)
  if (!Number.isFinite(t)) return '-'
  return `${t.toFixed(1)} °C`
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
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.chart-wrap {
  width: 100%;
  height: 140px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: linear-gradient(to bottom, #f8fafc, #ffffff);
  padding: 0.5rem;
}

.sparkline {
  width: 100%;
  height: 100%;
}

.line {
  fill: none;
  stroke-width: 1.8;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.line-rssi {
  stroke: #2563eb;
}

.line-temp {
  stroke: #ef4444;
}

.line-heap {
  stroke: #16a34a;
}

.muted {
  color: #6b7280;
}

.weight-value {
  font-size: 2rem;
  font-weight: 700;
  margin: 0.25rem 0 0.75rem;
}
</style>
