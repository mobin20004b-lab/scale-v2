import { createRouter, createWebHistory } from 'vue-router'
import WifiSetup from '../views/WifiSetup.vue'
import Config from '../views/Config.vue'

const routes = [
  { path: '/', redirect: '/wifi' },
  { path: '/wifi', component: WifiSetup },
  { path: '/config', component: Config },
  { path: '/:pathMatch(.*)*', redirect: '/wifi' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
