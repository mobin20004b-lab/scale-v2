import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'

import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

const app = createApp(App)
app.use(PrimeVue, { ripple: true })
app.mount('#app')
