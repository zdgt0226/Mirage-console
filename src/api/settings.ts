import { reactive, watch } from 'vue'

const BASE_KEY = 'mirage_api'
const TOKEN_KEY = 'mirage_token'

/** 后端地址与 token 存本浏览器 localStorage；base 为空 = 同源 (配合 Vite dev proxy)。 */
export const settings = reactive({
  base: localStorage.getItem(BASE_KEY) ?? '',
  token: localStorage.getItem(TOKEN_KEY) ?? '',
})

/** 首次打开未配置后端地址 → 由 App 弹设置面板，否则请求全 404/401。 */
export const isConfigured = () => localStorage.getItem(BASE_KEY) !== null

export function saveSettings(base: string, token: string) {
  settings.base = base.replace(/\/+$/, '')
  settings.token = token
}

watch(
  () => ({ ...settings }),
  (s) => {
    localStorage.setItem(BASE_KEY, s.base)
    localStorage.setItem(TOKEN_KEY, s.token)
  },
)
