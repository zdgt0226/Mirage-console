import { computed, ref, watchEffect } from 'vue'
import en from '@/i18n/en'
import zh from '@/i18n/zh'

export type Lang = 'en' | 'zh'
export type MsgKey = keyof typeof en

const DICTS: Record<Lang, Record<string, string>> = { en, zh }
const LANG_KEY = 'mirage_lang'

function initialLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved === 'zh' || saved === 'en') return saved
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

const lang = ref<Lang>(initialLang())

watchEffect(() => {
  localStorage.setItem(LANG_KEY, lang.value)
  document.documentElement.lang = lang.value === 'zh' ? 'zh-CN' : 'en'
})

/** 缺失的 key 回退到英文，再回退到 key 本身 (与旧版 t() 行为一致)。 */
const t = (key: MsgKey | string): string =>
  DICTS[lang.value][key] ?? DICTS.en[key] ?? String(key)

export function useI18n() {
  return {
    lang,
    t,
    /** 语言按钮上显示的是"切到哪个语言"。 */
    otherLangLabel: computed(() => (lang.value === 'zh' ? 'EN' : '中')),
    toggleLang: () => {
      lang.value = lang.value === 'zh' ? 'en' : 'zh'
    },
  }
}
