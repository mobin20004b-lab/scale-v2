<template>
  <Card>
    <template #title>Device Settings</template>
    <template #content>
      <div class="form-grid">
        <div class="field">
          <label for="token">API Token</label>
          <InputText id="token" v-model="config.token" placeholder="Token for backend API" />
        </div>

        <div class="field">
          <label for="domain">Server Domain</label>
          <InputText id="domain" v-model="config.domain" placeholder="e.g. api.example.com" />
        </div>

        <div class="field">
          <label for="device">Device Name</label>
          <InputText id="device" v-model="config.device_name" placeholder="Friendly name in dashboard" />
        </div>

        <div class="field">
          <label for="host">Wi-Fi Hostname</label>
          <InputText id="host" v-model="config.wifi_hostname" placeholder="esp32-controller" />
          <small>3-32 chars, used for router client list visibility.</small>
        </div>

        <div class="field">
          <label for="timeout">Wi-Fi Connect Timeout (ms)</label>
          <InputNumber id="timeout" v-model="config.wifi_timeout_ms" :min="5000" :max="60000" :step="1000" />
        </div>

        <div class="field">
          <label for="reconnectInterval">Reconnect Interval (ms)</label>
          <InputNumber id="reconnectInterval" v-model="config.reconnect_interval_ms" :min="3000" :max="120000" :step="1000" />
        </div>

        <div class="field">
          <label for="powerSave">Wi-Fi Power Save</label>
          <Dropdown id="powerSave" v-model="config.wifi_power_save" :options="powerOptions" optionLabel="label" optionValue="value" />
        </div>

        <div class="field-inline">
          <InputSwitch v-model="config.auto_reconnect" inputId="autoReconnect" />
          <label for="autoReconnect">Auto reconnect when Wi-Fi drops</label>
        </div>
      </div>

      <div class="actions">
        <Button :label="saving ? 'Saving...' : 'Save Settings'" icon="pi pi-save" :loading="saving" @click="saveConfig" />
        <Button label="Restart Device" icon="pi pi-refresh" severity="warning" outlined :loading="restarting" @click="restartDevice" />
      </div>

      <Message v-if="message" class="mt-3" :severity="isError ? 'error' : 'success'" :closable="false">{{ message }}</Message>
    </template>
  </Card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Dropdown from 'primevue/dropdown'

const config = ref({
  token: '',
  domain: '',
  device_name: 'ESP32 Controller',
  wifi_hostname: 'esp32-controller',
  wifi_timeout_ms: 15000,
  reconnect_interval_ms: 15000,
  auto_reconnect: true,
  wifi_power_save: 1
})

const powerOptions = [
  { label: 'None (max performance)', value: 0 },
  { label: 'Light (balanced)', value: 1 },
  { label: 'Maximum (battery)', value: 2 }
]

const saving = ref(false)
const restarting = ref(false)
const message = ref('')
const isError = ref(false)

const fetchConfig = async () => {
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data = await res.json()
      config.value = {
        token: data.token || '',
        domain: data.domain || '',
        device_name: data.device_name || 'ESP32 Controller',
        wifi_hostname: data.wifi_hostname || 'esp32-controller',
        wifi_timeout_ms: data.wifi_timeout_ms || 15000,
        reconnect_interval_ms: data.reconnect_interval_ms || 15000,
        auto_reconnect: data.auto_reconnect ?? true,
        wifi_power_save: data.wifi_power_save ?? 1
      }
    }
  } catch {
    isError.value = true
    message.value = 'Failed to fetch configuration.'
  }
}

const saveConfig = async () => {
  saving.value = true
  message.value = ''
  isError.value = false
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    if (!res.ok) throw new Error('save failed')
    message.value = 'Configuration saved successfully.'
  } catch {
    isError.value = true
    message.value = 'Failed to save configuration.'
  } finally {
    saving.value = false
  }
}

const restartDevice = async () => {
  restarting.value = true
  message.value = ''
  isError.value = false
  try {
    const res = await fetch('/api/system/restart', { method: 'POST' })
    if (!res.ok) throw new Error('restart failed')
    message.value = 'Restart command sent. Device will reboot shortly.'
  } catch {
    isError.value = true
    message.value = 'Failed to restart device.'
  } finally {
    restarting.value = false
  }
}

onMounted(fetchConfig)
</script>

<style scoped>
.form-grid { display: grid; gap: 1rem; }
.field { display: grid; gap: 0.4rem; }
.field-inline { display: flex; align-items: center; gap: 0.6rem; }
.actions { margin-top: 1rem; display: flex; gap: 0.6rem; flex-wrap: wrap; }
small { color: #6b7280; }
</style>
