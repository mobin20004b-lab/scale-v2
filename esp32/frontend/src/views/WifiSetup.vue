<template>
  <div class="wifi-stack">
    <Card>
      <template #title>Current Network</template>
      <template #content>
        <div class="row">
          <div>
            <p class="m-0">Configured SSID: <strong>{{ currentSsid || 'Not configured' }}</strong></p>
          </div>
          <Button label="Forget" icon="pi pi-times" severity="danger" outlined :disabled="!currentSsid" @click="disconnect" />
        </div>
      </template>
    </Card>

    <Card>
      <template #title>Scan & Connect</template>
      <template #content>
        <div class="mb-3">
          <Button :label="scanning ? 'Scanning...' : 'Scan Networks'" icon="pi pi-search" :loading="scanning" @click="scanNetworks" />
        </div>

        <DataTable v-if="networks.length" :value="networks" selectionMode="single" dataKey="ssid" @row-select="({ data }) => selectNetwork(data)">
          <Column field="ssid" header="SSID" />
          <Column field="rssi" header="Signal (dBm)" />
          <Column header="Security">
            <template #body="slotProps">
              <Tag :value="slotProps.data.open ? 'Open' : 'Secured'" :severity="slotProps.data.open ? 'warning' : 'success'" />
            </template>
          </Column>
        </DataTable>

        <div v-if="selectedNetwork" class="connect-box">
          <h4>Connect to {{ selectedNetwork.ssid }}</h4>
          <div v-if="!selectedNetwork.open" class="field">
            <label for="password">Password</label>
            <Password id="password" v-model="password" toggleMask :feedback="false" />
          </div>
          <div class="actions">
            <Button label="Connect" icon="pi pi-link" :loading="connecting" @click="connect" />
            <Button label="Cancel" text @click="selectedNetwork = null" />
          </div>
        </div>

        <Message v-if="message" class="mt-3" severity="info" :closable="false">{{ message }}</Message>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Password from 'primevue/password'
import Message from 'primevue/message'

const networks = ref([])
const scanning = ref(false)
const selectedNetwork = ref(null)
const password = ref('')
const connecting = ref(false)
const message = ref('')
const currentSsid = ref('')

const fetchStatus = async () => {
  try {
    const res = await fetch('/api/status')
    if (res.ok) currentSsid.value = (await res.json()).sta_ssid
  } catch (e) {
    console.error('Failed to fetch status', e)
  }
}

const scanNetworks = async () => {
  scanning.value = true
  networks.value = []
  selectedNetwork.value = null
  try {
    const res = await fetch('/api/wifi/scan')
    if (res.status === 202) {
      setTimeout(scanNetworks, 2000)
      return
    }
    if (res.ok) networks.value = (await res.json()).networks || []
  } catch (e) {
    console.error('Scan failed', e)
  } finally {
    if (networks.value.length > 0) scanning.value = false
  }
}

const selectNetwork = (net) => {
  selectedNetwork.value = net
  password.value = ''
  message.value = ''
}

const connect = async () => {
  connecting.value = true
  message.value = 'Saving Wi-Fi credentials...'
  try {
    const res = await fetch('/api/wifi/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid: selectedNetwork.value.ssid, password: password.value })
    })
    message.value = res.ok ? 'Credentials saved. Device is connecting...' : 'Failed to send credentials.'
    if (res.ok) currentSsid.value = selectedNetwork.value.ssid
  } catch {
    message.value = 'Network error'
  } finally {
    connecting.value = false
  }
}

const disconnect = async () => {
  try {
    const res = await fetch('/api/wifi/disconnect', { method: 'POST' })
    if (res.ok) currentSsid.value = ''
  } catch {
    message.value = 'Failed to disconnect'
  }
}

onMounted(fetchStatus)
</script>

<style scoped>
.wifi-stack { display: grid; gap: 1rem; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.connect-box { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
.actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.field { display: grid; gap: 0.4rem; max-width: 320px; }
</style>
