import { computed, ref, watchEffect } from 'vue'

type Theme = 'light' | 'dark'
const THEME_KEY = 'mirage_theme'

const stored = localStorage.getItem(THEME_KEY)
/** null = 跟随系统 (:root 不带 data-theme，走 prefers-color-scheme)。 */
const theme = ref<Theme | null>(stored === 'dark' || stored === 'light' ? stored : null)

const systemDark = ref(matchMedia('(prefers-color-scheme: dark)').matches)
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  systemDark.value = e.matches
})

const isDark = computed(() => (theme.value ? theme.value === 'dark' : systemDark.value))

watchEffect(() => {
  if (theme.value) {
    document.documentElement.setAttribute('data-theme', theme.value)
    localStorage.setItem(THEME_KEY, theme.value)
  } else {
    document.documentElement.removeAttribute('data-theme')
    localStorage.removeItem(THEME_KEY)
  }
})

export function useTheme() {
  return {
    isDark,
    toggleTheme: () => {
      theme.value = isDark.value ? 'light' : 'dark'
    },
  }
}
