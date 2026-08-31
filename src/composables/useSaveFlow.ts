import { ref } from 'vue'
import type { ApiResult } from '@/api/types'
import { useI18n } from '@/composables/useI18n'

/**
 * 规则/策略的保存流程: 先 dry_run 预检 —— 校验失败直接停，只有告警则让用户确认，
 * 通过后才真正提交。成功后按钮文字闪 2 秒 "已保存并应用"。
 */
export function useSaveFlow() {
  const { t } = useI18n()
  const flash = ref(false)

  async function run(post: (dry: boolean) => Promise<ApiResult>, onSaved?: () => void) {
    try {
      const dry = await post(true)
      if (dry.status !== 'success') {
        alert(t('save.invalid') + '\n' + (dry.message ?? ''))
        return
      }
      const issues = dry.issues ?? []
      if (
        issues.length &&
        !confirm(t('save.warnHead') + '\n\n• ' + issues.join('\n• ') + '\n\n' + t('save.warnTail'))
      ) {
        return
      }
      const res = await post(false)
      if (res.status !== 'success') {
        alert(res.message ?? t('save.failed'))
        return
      }
      flash.value = true
      setTimeout(() => (flash.value = false), 2000)
      onSaved?.()
    } catch {
      alert(t('save.failed'))
    }
  }

  return { flash, run }
}
