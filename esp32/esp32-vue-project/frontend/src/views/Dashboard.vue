<template>
  <div>
    <h2>Status Dashboard</h2>
    
    <div class="status-card">
      <h3>Access Point (AP)</h3>
      <p><strong>SSID:</strong> {{ status.ap_ssid || 'Loading...' }}</p>
      <p><strong>IP Address:</strong> {{ status.ap_ip || 'Loading...' }}</p>
    </div>

    <div class="status-card">
      <h3>Station (STA)</h3>
      <p><strong>Status:</strong> 
        <span :class="status.sta_connected ? 'connected' : 'disconnected'">
          {{ status.sta_connected ? 'Connected' : 'Disconnected' }}
        </span>
      </p>
      <p v-if="status.sta_connected"><strong>SSID:</strong> {{ status.sta_ssid }}</p>
      <p v-if="status.sta_connected"><strong>IP Address:</strong> {{ status.sta_ip }}</p>
    </div>

    <div class="test-section">
      <button @click="testInternet" :disabled="!status.sta_connected || testing">
        {{ testing ? 'Testing...' : 'Test Internet Connection' }}
      </button>
      <p v-if="testResult" class="result">Result: {{ testResult }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const status = ref({})
const testResult = ref('')
const testing = ref(false)
let pollInterval

const fetchStatus = async () => {
  try {
    const res = await fetch('/api/status')
    if (res.ok) {
      status.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch status', e)
  }
}

const testInternet = async () => {
  testing.value = true
  testResult.value = ''
  try {
    const res = await fetch('/api/wifi/test')
    if (res.ok) {
      const data = await res.json()
      testResult.value = data.result
    } else {
      testResult.value = 'Error reaching device'
    }
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

onUnmounted(() => {
  clearInterval(pollInterval)
})
</script>

<style scoped>
.status-card {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  border: 1px solid #eee;
}
.status-card h3 {
  margin-top: 0;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
}
.connected {
  color: #27ae60;
  font-weight: bold;
}
.disconnected {
  color: #e74c3c;
  font-weight: bold;
}
.test-section {
  margin-top: 20px;
  text-align: center;
}
.result {
  margin-top: 10px;
  font-weight: bold;
}
</style>
