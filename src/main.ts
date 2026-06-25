import { createPinia } from 'pinia'
import { createApp } from 'vue'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import { router } from './router'
import { useUserStore } from './stores/user'
import './styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
useUserStore().hydrate()
app.use(router)
app.use(ElementPlus)
app.mount('#app')
