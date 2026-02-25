import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import WifiSetup from '../views/WifiSetup.vue'
import Config from '../views/Config.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/wifi', component: WifiSetup },
  { path: '/config', component: Config },
  // Catch all route to redirect to dashboard
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  // Using WebHistory for cleaner URLs, works with captive portal due to server.onNotFound fallback
  history: createWebHistory(),
  routes
})

export default router
