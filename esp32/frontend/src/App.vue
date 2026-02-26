<template>
  <div class="app-shell">
    <Card>
      <template #title>
        <div class="header">
          <h2>ESP32 Scale Setup</h2>
          <small>Wi-Fi, upload interval, latest weight and server response.</small>
        </div>
      </template>
      <template #content>
        <div class="grid">
          <section class="panel">
            <h3>1) Scan Wi-Fi</h3>
            <div class="row">
              <Button :label="scanning ? 'Scanning...' : 'Scan Networks'" icon="pi pi-search" :loading="scanning" @click="scanNetworks" />
              <Button label="Forget Saved Wi-Fi" severity="danger" outlined :disabled="!status.sta_ssid" @click="forgetWifi" />
            </div>
            <DataTable v-if="networks.length" :value="networks" dataKey="ssid" selectionMode="single" @row-select="({ data }) => chooseNetwork(data)">
              <Column field="ssid" header="SSID" />
              <Column field="rssi" header="RSSI" />
              <Column header="Security">
                <template #body="slotProps">
                  <Tag :value="slotProps.data.open ? 'Open' : 'Secured'" :severity="slotProps.data.open ? 'warning' : 'success'" />
                </template>
              </Column>
            </DataTable>

            <div v-if="selectedSsid" class="connect-box">
              <p>Selected: <strong>{{ selectedSsid }}</strong></p>
              <div class="field">
                <label>Password</label>
                <Password v-model="password" toggleMask :feedback="false" />
              </div>
              <Button :loading="connecting" label="Connect" icon="pi pi-link" @click="connectWifi" />
            </div>
          </section>

          <section class="panel">
            <h3>2) Upload Interval</h3>
            <div class="field">
              <label>Upload Interval (ms)</label>
              <InputNumber v-model="uploadIntervalMs" :min="1000" :max="600000" :step="500" />
            </div>
            <Button :loading="savingInterval" label="Save Interval" icon="pi pi-save" @click="saveInterval" />

            <h3 class="mt">3) Latest Weight</h3>
            <p class="weight">{{ status.weight_available ? `${status.weight_value} kg` : 'No weight yet' }}</p>

            <h3 class="mt">4) Latest Server Response</h3>
            <p><strong>Code:</strong> {{ status.weight_last_upload_code ?? '-' }}</p>
            <p><strong>Response:</strong> {{ status.weight_last_upload_response || '-' }}</p>
            <p><strong>Wi-Fi:</strong> {{ status.sta_connected ? `Connected to ${status.sta_ssid}` : 'Disconnected' }}</p>
          </section>
        </div>

        <Message v-if="message" :severity="error ? 'error' : 'success'" :closable="false" class="mt">{{ message }}</Message>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Password from 'primevue/password'
import Tag from 'primevue/tag'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'

const networks = ref([])
const scanning = ref(false)
const selectedSsid = ref('')
const password = ref('')
const connecting = ref(false)
const savingInterval = ref(false)
const uploadIntervalMs = ref(5000)
const message = ref('')
const error = ref(false)

const status = ref({
  sta_ssid: '',
  sta_connected: false,
  weight_available: false,
  weight_value: 0,
  weight_last_upload_code: 0,
  weight_last_upload_response: 'never'
})

const setMessage = (text, isError = false) => {
  message.value = text
  error.value = isError
}

const fetchStatus = async () => {
  try {
    const res = await fetch('/api/status')
    if (!res.ok) return
    status.value = await res.json()
  } catch {
    setMessage('Failed to load status', true)
  }
}

const fetchSettings = async () => {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) return
    const data = await res.json()
    uploadIntervalMs.value = data.upload_interval_ms ?? 5000
  } catch {
    setMessage('Failed to load settings', true)
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
    setMessage(res.ok ? 'Wi-Fi connect requested' : 'Wi-Fi connect failed', !res.ok)
  } catch {
    setMessage('Wi-Fi connect failed', true)
  } finally {
    connecting.value = false
  }
}

const forgetWifi = async () => {
  try {
    const res = await fetch('/api/wifi/disconnect', { method: 'POST' })
    setMessage(res.ok ? 'Saved Wi-Fi forgotten' : 'Forget failed', !res.ok)
  } catch {
    setMessage('Forget failed', true)
  }
}

const saveInterval = async () => {
  savingInterval.value = true
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_interval_ms: uploadIntervalMs.value })
    })
    setMessage(res.ok ? 'Interval saved' : 'Save interval failed', !res.ok)
  } catch {
    setMessage('Save interval failed', true)
  } finally {
    savingInterval.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchStatus(), fetchSettings()])

  const source = new EventSource('/api/events')
  source.addEventListener('status', (event) => {
    try {
      status.value = JSON.parse(event.data)
    } catch {
      // ignore parse errors
    }
  })
})
</script>

<style>
body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f4f6fb; }
#app { padding: 1rem; }
.app-shell { max-width: 980px; margin: 0 auto; }
.header h2 { margin: 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.panel { border: 1px solid #e5e7eb; border-radius: 10px; padding: 1rem; }
.row { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.field { display: grid; gap: 0.4rem; max-width: 280px; }
.connect-box { margin-top: 0.75rem; display: grid; gap: 0.6rem; }
.mt { margin-top: 1rem; }
.weight { font-size: 1.8rem; font-weight: 700; margin: 0; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
</style>
