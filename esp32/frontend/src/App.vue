<template>
  <div class="app">
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">⚖ ESP32 Scale</span>
        <Badge :variant="connected ? 'success' : 'danger'">
          {{ connected ? 'Online' : 'Offline' }}
        </Badge>
      </div>
      <span class="uptime">{{ bootLoading ? 'Loading…' : uptimeText }}</span>
    </header>

    <main class="content">
      <section class="page-intro">
        <h1 class="page-title">Device Console</h1>
        <p class="page-subtitle">Material 3 tuned layout for scale status, connectivity, and upload settings.</p>
      </section>

      <!-- ── Stats row ─────────────────────────────────────────────────────── -->
      <div class="stats">
        <Card title="Weight">
          <div class="stat-val" :class="{ 'stat-val--stale': weightStale }">
            {{ formattedWeight }}
          </div>
          <div class="stat-sub">raw: {{ status.weight_raw || '—' }}</div>
        </Card>

        <Card title="Wi-Fi">
          <div class="stat-val stat-val--md">
            {{ status.sta_connected ? status.sta_ssid : 'Disconnected' }}
          </div>
          <div class="stat-sub">
            {{ status.sta_connected ? status.sta_ip : 'No IP' }}
            {{ status.sta_connected ? `· ${status.rssi} dBm` : '' }}
          </div>
        </Card>

        <Card title="Last Upload">
          <div class="stat-val stat-val--md" :class="uploadCodeClass">
            {{ status.weight_last_upload_code ? `HTTP ${status.weight_last_upload_code}` : '—' }}
          </div>
          <div class="stat-sub">{{ status.weight_last_upload_response || 'Never uploaded' }}</div>
        </Card>
      </div>

      <!-- ── Panels ─────────────────────────────────────────────────────────── -->
      <div class="panels">
        <!-- Wi-Fi setup -->
        <Card title="Wi-Fi Setup">
          <div class="btn-row btn-row--split">
            <Button :loading="scanning" @click="startScan">Scan Networks</Button>
            <Button
              variant="destructive"
              :disabled="!status.sta_connected || forgetting"
              :loading="forgetting"
              @click="forgetWifi"
            >
              Forget
            </Button>
          </div>

          <!-- Network list -->
          <div v-if="uniqueNetworks.length" class="net-list">
            <button
              v-for="net in uniqueNetworks"
              :key="net.ssid"
              class="net-row"
              :class="{ 'net-row--active': selectedSsid === net.ssid }"
              @click="selectNetwork(net)"
            >
              <span class="net-ssid">{{ net.ssid }}</span>
              <span class="net-meta">{{ net.rssi }} dBm · {{ net.open ? 'Open' : '🔒' }}</span>
            </button>
          </div>

          <!-- Connect form -->
          <template v-if="selectedSsid">
            <div class="field">
              <label>SSID</label>
              <Input :modelValue="selectedSsid" disabled />
            </div>
            <div class="field">
              <label>Password</label>
              <Input
                v-model="wifiPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Leave blank if open"
              />
            </div>
            <div class="btn-row">
              <Button variant="primary" :loading="connecting" @click="connectWifi">Connect</Button>
              <Button @click="selectedSsid = ''; wifiPassword = ''">Cancel</Button>
            </div>
          </template>
        </Card>

        <!-- Settings -->
        <Card title="Settings">
          <div class="stack-md">
          <div class="field">
            <label>Upload interval
              <span class="hint">1 000 – 600 000 ms</span>
            </label>
            <Input
              v-model.number="uploadIntervalMs"
              type="number"
              min="1000"
              max="600000"
              step="1000"
            />
          </div>
          <div class="field">
            <label>Upload API token
              <span class="hint">Bearer token without the "Bearer" prefix</span>
            </label>
            <Input
              v-model="uploadAuthToken"
              type="text"
              autocomplete="off"
              placeholder="a854aecf-da96-4f02-801d-77212c5e71cf"
            />
          </div>

          <Button variant="primary" :loading="savingSettings" @click="saveSettings">
            Save Settings
          </Button>
          </div>

          <div class="divider"></div>

          <div class="panel-title panel-title--sm">Diagnostics</div>
          <div class="kv">
            <div class="kv-row"><span>Free Heap</span><span class="mono">{{ formatBytes(status.free_heap) }}</span></div>
            <div class="kv-row"><span>AP IP</span><span class="mono">{{ status.ap_ip || '—' }}</span></div>
            <div class="kv-row"><span>AP SSID</span><span class="mono">{{ status.ap_ssid || '—' }}</span></div>
            <div class="kv-row"><span>Upload interval</span><span class="mono">{{ status.upload_interval_ms }} ms</span></div>
            <div class="kv-row"><span>API token configured</span><span class="mono">{{ status.upload_auth_token_configured ? 'Yes' : 'No' }}</span></div>
          </div>
        </Card>
      </div>
    </main>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast" class="toast">
        <Alert :variant="toast.error ? 'destructive' : 'success'">
          {{ toast.msg }}
        </Alert>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from './components/ui/Button.vue'
import Card from './components/ui/Card.vue'
import Input from './components/ui/Input.vue'
import Badge from './components/ui/Badge.vue'
import Alert from './components/ui/Alert.vue'

// ── State ─────────────────────────────────────────────────────────────────────
const status           = ref({})
const networks         = ref([])
const scanning         = ref(false)
const selectedSsid     = ref('')
const wifiPassword     = ref('')
const connecting       = ref(false)
const forgetting       = ref(false)
const savingSettings   = ref(false)
const uploadIntervalMs = ref(5000)
const uploadAuthToken  = ref('')
const connected        = ref(false)
const toast            = ref(null)
const bootLoading      = ref(true)

let pollTimer     = null
let scanPollTimer = null
let toastTimer    = null
const POLL_MS     = 3000   // status poll interval when no SSE

// ── Toast helper ──────────────────────────────────────────────────────────────
const showToast = (msg, error = false) => {
  clearTimeout(toastTimer)
  toast.value = { msg, error }
  toastTimer = setTimeout(() => { toast.value = null }, 3500)
}

// ── Computed ──────────────────────────────────────────────────────────────────
const uptimeText = computed(() => {
  const t = Number(status.value.uptime_seconds ?? 0)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const formattedWeight = computed(() => {
  if (!status.value.weight_available) return 'No data'
  return `${Number(status.value.weight_value).toFixed(3)} kg`
})

// Weight is stale if last read was more than 10 s ago (relative to reported uptime)
const weightStale = computed(() => {
  const lastRead = Number(status.value.weight_last_read_ms ?? 0)
  const uptime   = Number(status.value.uptime_seconds ?? 0) * 1000
  return lastRead > 0 && (uptime - lastRead) > 10000
})

const uploadCodeClass = computed(() => {
  const code = Number(status.value.weight_last_upload_code ?? 0)
  if (!code) return ''
  if (code >= 200 && code < 300) return 'stat-val--ok'
  if (code >= 400 || code < 0)   return 'stat-val--err'
  return ''
})

const formatBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n < 1024)         return `${n} B`
  if (n < 1024 * 1024)  return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const uniqueNetworks = computed(() => {
  const bestBySsid = new Map()
  for (const net of networks.value) {
    if (!net?.ssid) continue
    const current = bestBySsid.get(net.ssid)
    if (!current || Number(net.rssi ?? -999) > Number(current.rssi ?? -999)) {
      bestBySsid.set(net.ssid, net)
    }
  }
  return [...bestBySsid.values()].sort((a, b) => Number(b.rssi ?? -999) - Number(a.rssi ?? -999))
})

// ── Status polling ────────────────────────────────────────────────────────────
const fetchStatus = async () => {
  try {
    const res = await fetch('/api/status')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    status.value = await res.json()
    connected.value = true
  } catch {
    connected.value = false
  }
}

// ── Scan ──────────────────────────────────────────────────────────────────────
const stopScanPoll = () => {
  clearTimeout(scanPollTimer)
  scanPollTimer = null
}

const pollScan = async () => {
  try {
    const res = await fetch('/api/wifi/scan')
    if (res.status === 202) {
      // Still running – poll again shortly
      scanPollTimer = setTimeout(pollScan, 1200)
      return
    }
    scanning.value = false
    if (res.ok) {
      const data = await res.json()
      networks.value = data.networks ?? []
    } else {
      showToast('Scan failed.', true)
    }
  } catch {
    scanning.value = false
    showToast('Scan request failed.', true)
  }
}

const startScan = () => {
  stopScanPoll()
  scanning.value  = true
  networks.value  = []
  selectedSsid.value = ''
  wifiPassword.value = ''
  pollScan()
}

// ── Connect / forget ──────────────────────────────────────────────────────────
const selectNetwork = (net) => {
  selectedSsid.value = net.ssid
  wifiPassword.value = ''
}

const connectWifi = async () => {
  if (!selectedSsid.value) return
  connecting.value = true
  try {
    const res = await fetch('/api/wifi/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid: selectedSsid.value, password: wifiPassword.value })
    })
    if (res.ok) {
      showToast('Connect request sent. Waiting for device…')
      selectedSsid.value = ''
      wifiPassword.value = ''
    } else {
      const body = await res.json().catch(() => ({}))
      showToast(body.error ?? `Server error ${res.status}`, true)
    }
  } catch {
    showToast('Request failed.', true)
  } finally {
    connecting.value = false
  }
}

const forgetWifi = async () => {
  forgetting.value = true
  try {
    const res = await fetch('/api/wifi/disconnect', { method: 'POST' })
    if (res.ok) {
      showToast('Wi-Fi credentials removed.')
    } else {
      showToast(`Failed: HTTP ${res.status}`, true)
    }
  } catch {
    showToast('Request failed.', true)
  } finally {
    forgetting.value = false
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────
const loadSettings = async () => {
  try {
    const res = await fetch('/api/settings')
    if (res.ok) {
      const data = await res.json()
      uploadIntervalMs.value = data.upload_interval_ms ?? 5000
      uploadAuthToken.value = data.upload_auth_token ?? ''
    }
  } catch { /* ignore on boot */ }
}

const saveSettings = async () => {
  const val = Number(uploadIntervalMs.value)
  if (!Number.isInteger(val) || val < 1000 || val > 600000) {
    showToast('Interval must be 1 000 – 600 000 ms.', true)
    return
  }
  const token = uploadAuthToken.value.trim()
  if (!token) {
    showToast('API token is required.', true)
    return
  }
  savingSettings.value = true
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_interval_ms: val,
        upload_auth_token: token
      })
    })
    if (res.ok) {
      showToast('Settings saved.')
    } else {
      const body = await res.json().catch(() => ({}))
      showToast(body.error ?? `Server error ${res.status}`, true)
    }
  } catch {
    showToast('Request failed.', true)
  } finally {
    savingSettings.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchStatus(), loadSettings()])
  bootLoading.value = false
  pollTimer = setInterval(fetchStatus, POLL_MS)
})

onUnmounted(() => {
  clearInterval(pollTimer)
  stopScanPoll()
  clearTimeout(toastTimer)
})
</script>

<style scoped>
.app {
  min-height: 100vh;
}
</style>
