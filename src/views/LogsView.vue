<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { LogsResp } from '@/api/types'
import { useApi } from '@/composables/useApi'
import { useI18n } from '@/composables/useI18n'
import { usePolling } from '@/composables/usePolling'

const { t } = useI18n()
const { data: logs, load } = useApi<LogsResp>(api.logs, { logs: [] })
const term = ref<HTMLDivElement | null>(null)

usePolling(load, 2000)

/** 日志级别取自行文本，后端给的是渲染好的整行。 */
function levelClass(line: string): string {
  if (line.includes('DEBUG')) return 'log-debug'
  if (line.includes('WARN')) return 'log-warn'
  if (line.includes('ERROR')) return 'log-error'
  return 'log-info'
}

watch(
  () => logs.value.logs.length,
  async () => {
    await nextTick()
    if (term.value) term.value.scrollTop = term.value.scrollHeight
  },
)
</script>

<template>
  <section>
    <div class="card">
      <div class="card-head">
        <div class="card-title">
          <span>{{ t('card.liveLog') }}</span><span class="hint">{{ t('card.inMemBuf') }}</span>
        </div>
      </div>
      <div class="card-pad">
        <div ref="term" class="term">
          <div v-for="(line, i) in logs.logs" :key="i" :class="levelClass(line)">{{ line }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.term {
  background: color-mix(in srgb, var(--ground) 60%, #000 8%);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
  height: 520px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  line-height: 1.7;
}
.term div {
  margin-bottom: 2px;
  word-break: break-word;
}
.log-debug {
  color: var(--faint);
}
.log-info {
  color: var(--accent);
}
.log-warn {
  color: var(--warn);
}
.log-error {
  color: var(--crit);
}
</style>
