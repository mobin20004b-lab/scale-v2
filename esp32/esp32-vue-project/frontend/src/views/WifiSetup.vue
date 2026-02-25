<template>
  <div>
    <h2>Wi-Fi Setup</h2>
    
    <div v-if="currentSsid" class="current-network">
      <p>Currently configured to connect to: <strong>{{ currentSsid }}</strong></p>
      <button @click="disconnect" class="btn-danger">Forget Network</button>
    </div>

    <div class="scan-section">
      <button @click="scanNetworks" :disabled="scanning">
        {{ scanning ? 'Scanning...' : 'Scan for Networks' }}
      </button>
    </div>

    <div v-if="networks.length > 0" class="network-list">
      <h3>Available Networks</h3>
      <ul>
        <li v-for="net in networks" :key="net.ssid" @click="selectNetwork(net)">
          <span class="ssid">{{ net.ssid }}</span>
          <span class="rssi">{{ net.rssi }} dBm</span>
          <span v-if="!net.open" class="lock">🔒</span>
        </li>
      </ul>
    </div>

    <div v-if="selectedNetwork" class="connect-form">
      <h3>Connect to {{ selectedNetwork.ssid }}</h3>
      <form @submit.prevent="connect">
        <div class="form-group" v-if="!selectedNetwork.open">
          <label>Password:</label>
          <input type="password" v-model="password" required placeholder="Enter Wi-Fi password" />
        </div>
        <div class="actions">
          <button type="submit" :disabled="connecting">
            {{ connecting ? 'Connecting...' : 'Connect' }}
          </button>
          <button type="button" @click="selectedNetwork = null" class="btn-secondary">Cancel</button>
        </div>
      </form>
      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

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
    if (res.ok) {
      const data = await res.json()
      currentSsid.value = data.sta_ssid
    }
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
      // Scanning started, poll for results
      setTimeout(scanNetworks, 2000)
      return
    }
    if (res.ok) {
      const data = await res.json()
      networks.value = data.networks || []
    }
  } catch (e) {
    console.error('Scan failed', e)
  } finally {
    if (networks.value.length > 0) {
      scanning.value = false
    }
  }
}

const selectNetwork = (net) => {
  selectedNetwork.value = net
  password.value = ''
  message.value = ''
}

const connect = async () => {
  connecting.value = true
  message.value = 'Sending credentials...'
  
  try {
    const res = await fetch('/api/wifi/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ssid: selectedNetwork.value.ssid,
        password: password.value
      })
    })
    
    if (res.ok) {
      message.value = 'Credentials saved. Device is connecting...'
      currentSsid.value = selectedNetwork.value.ssid
      setTimeout(() => {
        selectedNetwork.value = null
        connecting.value = false
        message.value = ''
      }, 3000)
    } else {
      message.value = 'Failed to send credentials.'
      connecting.value = false
    }
  } catch (e) {
    message.value = 'Network error.'
    connecting.value = false
  }
}

const disconnect = async () => {
  if (!confirm('Are you sure you want to forget the current network?')) return
  
  try {
    const res = await fetch('/api/wifi/disconnect', { method: 'POST' })
    if (res.ok) {
      currentSsid.value = ''
      alert('Network forgotten.')
    }
  } catch (e) {
    alert('Failed to disconnect.')
  }
}

onMounted(() => {
  fetchStatus()
})
</script>

<style scoped>
.current-network {
  background: #e8f4f8;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.scan-section {
  margin-bottom: 20px;
}
.network-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.network-list li {
  padding: 12px 15px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.network-list li:last-child {
  border-bottom: none;
}
.network-list li:hover {
  background: #f5f5f5;
}
.ssid {
  flex-grow: 1;
  font-weight: bold;
}
.rssi {
  color: #7f8c8d;
  font-size: 0.9em;
  margin-right: 10px;
}
.connect-form {
  margin-top: 20px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #eee;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}
.btn-secondary {
  background: #95a5a6;
}
.btn-secondary:hover {
  background: #7f8c8d;
}
.btn-danger {
  background: #e74c3c;
}
.btn-danger:hover {
  background: #c0392b;
}
.message {
  margin-top: 15px;
  font-weight: bold;
  color: #2980b9;
}
</style>
