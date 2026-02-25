<template>
  <div>
    <h2>Device Configuration</h2>
    
    <form @submit.prevent="saveConfig">
      <div class="form-group">
        <label for="token">API Token:</label>
        <input type="text" id="token" v-model="config.token" placeholder="Enter API Token" />
      </div>
      
      <div class="form-group">
        <label for="domain">Server Domain:</label>
        <input type="text" id="domain" v-model="config.domain" placeholder="e.g., api.example.com" />
      </div>
      
      <button type="submit" :disabled="saving">
        {{ saving ? 'Saving...' : 'Save Configuration' }}
      </button>
    </form>
    
    <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const config = ref({
  token: '',
  domain: ''
})
const saving = ref(false)
const message = ref('')
const isError = ref(false)

const fetchConfig = async () => {
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data = await res.json()
      config.value.token = data.token || ''
      config.value.domain = data.domain || ''
    }
  } catch (e) {
    console.error('Failed to fetch config', e)
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
    
    if (res.ok) {
      message.value = 'Configuration saved successfully!'
    } else {
      isError.value = true
      message.value = 'Failed to save configuration.'
    }
  } catch (e) {
    isError.value = true
    message.value = 'Network error while saving.'
  } finally {
    saving.value = false
    setTimeout(() => {
      message.value = ''
    }, 3000)
  }
}

onMounted(() => {
  fetchConfig()
})
</script>

<style scoped>
.message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}
.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
