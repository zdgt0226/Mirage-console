<script setup lang="ts">
import StatBadge from './StatBadge.vue'
import type { Connection } from '@/api/types'
import { useI18n } from '@/composables/useI18n'
import { fmtAge, fmtB } from '@/utils/format'

const props = defineProps<{
  rows: Connection[]
  /** 已关闭的连接：无 process 列，出站只显示徽章，整行降透明度。 */
  closed?: boolean
  emptyText: string
}>()
const { t } = useI18n()

const routeColor = (outbound: string) =>
  outbound === 'direct' ? 'var(--muted)' : outbound === 'block' ? 'var(--crit)' : 'var(--ok)'

const colspan = () => (props.closed ? 5 : 6)
</script>

<template>
  <div class="scroll-x">
    <table class="tbl">
      <thead>
        <tr>
          <th>{{ t('th.target') }}</th>
          <th>{{ t('th.route') }}</th>
          <th>{{ t('th.proto') }}</th>
          <th v-if="!closed">{{ t('th.process') }}</th>
          <th class="r">{{ t('th.age') }}</th>
          <th class="r">↑ / ↓</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td :colspan="colspan()" class="empty">{{ emptyText }}</td>
        </tr>
        <tr v-for="(c, i) in rows" v-else :key="c.target + '_' + i" :style="closed ? { opacity: 0.6 } : undefined">
          <td class="target mono">{{ c.target }}</td>
          <td>
            <StatBadge v-if="closed" :tag="c.outbound" />
            <span v-else class="route">
              <span class="dim">{{ c.inbound }}</span>
              <span class="arrow">→</span>
              <span :style="{ color: routeColor(c.outbound), fontWeight: 600 }">{{ c.outbound }}</span>
            </span>
          </td>
          <td><StatBadge :tag="c.proto" /></td>
          <td v-if="!closed" class="dim">{{ c.process || '—' }}</td>
          <td class="r mono dim">{{ fmtAge(c.age_ms) }}</td>
          <td class="r mono">↑{{ fmtB(c.up) }} <span class="dim">/</span> ↓{{ fmtB(c.down) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.route {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12.5px;
}
.route .arrow {
  color: var(--faint);
}
</style>
