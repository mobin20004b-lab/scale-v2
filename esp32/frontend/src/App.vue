<template>
  <div class="layout">
    <header class="hero p-card">
      <div>
        <h1>ESP32 Device Control Center</h1>
        <p>Modern PrimeVue dashboard for runtime controls, telemetry and firmware settings.</p>
      </div>
      <div class="hero-actions">
        <Button icon="pi pi-download" label="Export Config" severity="secondary" @click="exportConfig" />
        <Button icon="pi pi-send" label="Apply Settings" @click="applySettings" />
      </div>
    </header>

    <main class="grid">
      <Card>
        <template #title>Connectivity</template>
        <template #content>
          <div class="stack">
            <FloatLabel>
              <InputText id="ssid" v-model="config.wifiSsid" />
              <label for="ssid">Wi-Fi SSID</label>
            </FloatLabel>
            <FloatLabel>
              <Password id="wifiPassword" v-model="config.wifiPassword" toggleMask :feedback="false" />
              <label for="wifiPassword">Wi-Fi Password</label>
            </FloatLabel>
            <FloatLabel>
              <InputNumber id="mqttPort" v-model="config.mqttPort" :min="1" :max="65535" />
              <label for="mqttPort">MQTT Port</label>
            </FloatLabel>
            <FloatLabel>
              <InputText id="mqttHost" v-model="config.mqttHost" />
              <label for="mqttHost">MQTT Host</label>
            </FloatLabel>
            <div class="inline-control">
              <label for="secure">Use TLS</label>
              <InputSwitch id="secure" v-model="config.mqttTls" />
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Device Behavior</template>
        <template #content>
          <div class="stack">
            <label for="brightness">LED Brightness</label>
            <Slider id="brightness" v-model="config.ledBrightness" :min="0" :max="255" />
            <Tag :value="`Current: ${config.ledBrightness}`" severity="contrast" />

            <label for="sampling">Sensor Sampling (ms)</label>
            <Knob id="sampling" v-model="config.samplingMs" :min="100" :max="5000" :step="100" />

            <div class="inline-control">
              <label for="autoRestart">Auto restart on fault</label>
              <ToggleButton id="autoRestart" v-model="config.autoRestart" onLabel="Enabled" offLabel="Disabled" />
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Capabilities</template>
        <template #content>
          <div class="stack">
            <MultiSelect
              v-model="config.enabledFeatures"
              :options="featureOptions"
              optionLabel="label"
              optionValue="value"
              display="chip"
              placeholder="Select enabled features"
            />
            <DataTable :value="featureTable" size="small" tableStyle="min-width: 20rem">
              <Column field="name" header="Feature" />
              <Column field="status" header="Status">
                <template #body="slotProps">
                  <Tag :value="slotProps.data.status" :severity="slotProps.data.status === 'Enabled' ? 'success' : 'secondary'" />
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Live Device State</template>
        <template #content>
          <div class="stack">
            <Message severity="info" :closable="false">Signal Strength: {{ telemetry.rssi }} dBm</Message>
            <Message severity="success" :closable="false">Uptime: {{ telemetry.uptime }} mins</Message>
            <Message severity="warn" :closable="false">Temperature: {{ telemetry.temp }} °C</Message>
            <ProgressBar :value="telemetry.cpuLoad" />
            <small>CPU Load {{ telemetry.cpuLoad }}%</small>
          </div>
        </template>
      </Card>
    </main>

    <Toast />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useToast } from 'primevue/usetoast'

import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import FloatLabel from 'primevue/floatlabel'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import InputText from 'primevue/inputtext'
import Knob from 'primevue/knob'
import Message from 'primevue/message'
import MultiSelect from 'primevue/multiselect'
import Password from 'primevue/password'
import ProgressBar from 'primevue/progressbar'
import Slider from 'primevue/slider'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ToggleButton from 'primevue/togglebutton'

const toast = useToast()

const config = reactive({
  wifiSsid: 'FactoryNet',
  wifiPassword: '',
  mqttHost: 'broker.local',
  mqttPort: 1883,
  mqttTls: false,
  ledBrightness: 128,
  samplingMs: 1000,
  autoRestart: true,
  enabledFeatures: ['ota', 'ble']
})

const telemetry = reactive({
  rssi: -56,
  uptime: 327,
  temp: 38.4,
  cpuLoad: 28
})

const featureOptions = [
  { label: 'OTA Updates', value: 'ota' },
  { label: 'BLE Provisioning', value: 'ble' },
  { label: 'Power Saver', value: 'power' },
  { label: 'Remote Logging', value: 'log' }
]

const featureTable = computed(() =>
  featureOptions.map((feature) => ({
    name: feature.label,
    status: config.enabledFeatures.includes(feature.value) ? 'Enabled' : 'Disabled'
  }))
)

const applySettings = () => {
  toast.add({
    severity: 'success',
    summary: 'Settings applied',
    detail: 'Configuration was queued for sync to firmware API.',
    life: 3000
  })
}

const exportConfig = () => {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'esp32-config.json'
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>
