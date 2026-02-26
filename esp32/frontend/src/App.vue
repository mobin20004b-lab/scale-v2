<template>
  <main class="layout">
    <section class="hero">
      <h1>ESP32 Scale Console</h1>
      <p>Modern dashboard rebuilt with shadcn-vue style UI primitives for Wi-Fi, telemetry, and device configuration.</p>
      <Badge :variant="isLive ? 'success' : 'warning'">{{ isLive ? 'Live stream active' : 'Polling mode' }}</Badge>
    </section>

    <section class="stats-grid">
      <Card title="Weight" description="Latest stable payload from HX711">
        <p class="stat-value">{{ formattedWeight }}</p>
        <p class="muted">Upload: {{ uploadStatus }}</p>
      </Card>
      <Card title="Wi-Fi" description="Station connection status">
        <p class="stat-value small">{{ status.sta_connected ? status.sta_ssid : 'Disconnected' }}</p>
        <p class="muted">RSSI {{ status.rssi ?? '-' }} dBm</p>
      </Card>
      <Card title="System" description="Runtime diagnostics">
        <p class="stat-value small">{{ uptimeText }}</p>
        <p class="muted">Heap {{ formatBytes(status.free_heap_bytes) }}</p>
      </Card>
    </section>

    <section class="content-grid">
      <Card title="Wi-Fi Setup" description="Scan nearby networks and connect to router">
        <div class="row">
          <Button :loading="scanning" @click="scanNetworks">{{ scanning ? 'Scanning...' : 'Scan Networks' }}</Button>
          <Button variant="outline" :disabled="!status.sta_ssid" @click="forgetWifi">Forget</Button>
        </div>

        <div v-if="networks.length" class="table-wrap">
          <table>
            <thead><tr><th>SSID</th><th>RSSI</th><th>Security</th><th></th></tr></thead>
            <tbody>
              <tr v-for="network in networks" :key="network.ssid">
                <td>{{ network.ssid }}</td><td>{{ network.rssi }}</td><td>{{ network.open ? 'Open' : 'Secured' }}</td>
                <td><Button variant="ghost" @click="chooseNetwork(network)">Use</Button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedSsid" class="stack">
          <label>Selected SSID</label>
          <Input :model-value="selectedSsid" disabled />
          <label>Password</label>
          <Input v-model="password" type="password" placeholder="Enter Wi-Fi password" />
          <Button :loading="connecting" @click="connectWifi">Connect Wi-Fi</Button>
        </div>
      </Card>

      <Card title="Device Settings" description="Control upload timing and backend configuration">
        <div class="stack">
          <label>Upload interval (ms)</label>
          <Input v-model="uploadIntervalMs" type="number" />

          <label>API Token</label>
          <Input v-model="config.token" placeholder="Token for backend API" />
          <label>Server Domain</label>
          <Input v-model="config.domain" placeholder="api.example.com" />
          <label>Device Name</label>
          <Input v-model="config.device_name" placeholder="Scale #1" />
          <label>Hostname</label>
          <Input v-model="config.wifi_hostname" placeholder="esp32-scale" />

          <div class="row">
            <Button :loading="savingInterval" @click="saveInterval">Save Interval</Button>
            <Button :loading="savingConfig" variant="outline" @click="saveConfig">Save Config</Button>
            <Button :loading="restarting" variant="destructive" @click="restartDevice">Restart</Button>
          </div>
        </div>
      </Card>
    </section>

    <Alert v-if="message" :variant="error ? 'destructive' : 'default'">{{ message }}</Alert>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Card from './components/ui/Card.vue'
import Button from './components/ui/Button.vue'
import Badge from './components/ui/Badge.vue'
import Input from './components/ui/Input.vue'
import Alert from './components/ui/Alert.vue'

const networks = ref([])
const scanning = ref(false)
const selectedSsid = ref('')
const password = ref('')
const connecting = ref(false)
const savingInterval = ref(false)
const uploadIntervalMs = ref(5000)
const savingConfig = ref(false)
const restarting = ref(false)
const message = ref('')
const error = ref(false)
const isLive = ref(false)
let eventSource
let liveTimeout

const status = ref({})
const config = ref({ token: '', domain: '', device_name: '', wifi_hostname: '' })

const setMessage = (text, isError = false) => {
  message.value = text
  error.value = isError
}

const uptimeText = computed(() => {
  const total = Number(status.value.uptime_seconds || 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}h ${m}m ${s}s`
})

const formattedWeight = computed(() => {
  if (!status.value.weight_available) return 'No data'
  return `${Number(status.value.weight_value || 0).toFixed(3)} kg`
})

const uploadStatus = computed(() => {
  const code = status.value.weight_last_post_code
  const result = status.value.weight_last_post_result
  return code ? `HTTP ${code} ${result || ''}` : 'Not uploaded yet'
})

const formatBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '-'
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}

const fetchStatus = async () => {
  const res = await fetch('/api/status')
  if (res.ok) status.value = await res.json()
}

const fetchSettings = async () => {
  const settings = await fetch('/api/settings')
  if (settings.ok) {
    const data = await settings.json()
    uploadIntervalMs.value = data.upload_interval_ms ?? 5000
  }

  const cfg = await fetch('/api/config')
  if (cfg.ok) {
    const data = await cfg.json()
    config.value = {
      token: data.token || '',
      domain: data.domain || '',
      device_name: data.device_name || 'ESP32 Controller',
      wifi_hostname: data.wifi_hostname || 'esp32-controller'
    }
  }
}

const scanNetworks = async () => {
  scanning.value = true
  networks.value = []
  try {
    const res = await fetch('/api/wifi/scan')
    if (res.status === 202) {
      setTimeout(scanNetworks, 1200)
      return
    }
    if (res.ok) {
      const data = await res.json()
      networks.value = data.networks || []
    }
  } finally {
    scanning.value = false
  }
}

const chooseNetwork = (network) => {
  selectedSsid.value = network.ssid
  password.value = ''
}

const connectWifi = async () => {
  if (!selectedSsid.value) return
  connecting.value = true
  try {
    const res = await fetch('/api/wifi/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid: selectedSsid.value, password: password.value })
    })
    setMessage(res.ok ? 'Wi-Fi connect request sent.' : 'Wi-Fi connect failed.', !res.ok)
  } catch {
    setMessage('Wi-Fi connect failed.', true)
  } finally {
    connecting.value = false
  }
}

const forgetWifi = async () => {
  const res = await fetch('/api/wifi/disconnect', { method: 'POST' })
  setMessage(res.ok ? 'Saved Wi-Fi removed.' : 'Failed to remove Wi-Fi.', !res.ok)
}

const saveInterval = async () => {
  savingInterval.value = true
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_interval_ms: Number(uploadIntervalMs.value) })
    })
    setMessage(res.ok ? 'Upload interval updated.' : 'Failed to save interval.', !res.ok)
  } finally {
    savingInterval.value = false
  }
}

const saveConfig = async () => {
  savingConfig.value = true
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    setMessage(res.ok ? 'Device config updated.' : 'Failed to save config.', !res.ok)
  } finally {
    savingConfig.value = false
  }
}

const restartDevice = async () => {
  restarting.value = true
  try {
    const res = await fetch('/api/system/restart', { method: 'POST' })
    setMessage(res.ok ? 'Restart command sent.' : 'Failed to restart device.', !res.ok)
  } finally {
    restarting.value = false
  }
}

const connectRealtime = () => {
  if (!window.EventSource) return
  eventSource = new EventSource('/api/events')
  eventSource.addEventListener('status', (event) => {
    status.value = JSON.parse(event.data)
    isLive.value = true
    clearTimeout(liveTimeout)
    liveTimeout = setTimeout(() => {
      isLive.value = false
    }, 10000)
  })
  eventSource.onerror = () => {
    isLive.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchStatus(), fetchSettings()])
  connectRealtime()
  setInterval(fetchStatus, 8000)
})

onUnmounted(() => {
  if (eventSource) eventSource.close()
  clearTimeout(liveTimeout)
})
</script>
