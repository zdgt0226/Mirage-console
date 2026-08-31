<script setup lang="ts">
import { computed } from 'vue'
import StatBadge from './StatBadge.vue'
import type { OutboundStat } from '@/api/types'
import { useI18n } from '@/composables/useI18n'
import { fmtB } from '@/utils/format'

const props = defineProps<{ outbounds: OutboundStat[]; withConn?: boolean }>()
const { t } = useI18n()

const max = computed(() => Math.max(...props.outbounds.map((o) => o.up + o.down), 1))

const barColor = (tag: string) =>
  tag === 'direct'
    ? 'var(--muted)'
    : tag === 'block'
      ? 'var(--crit)'
      : tag === 'proxy'
        ? 'var(--ok)'
        : 'var(--down)'
</script>

<template>
  <div v-if="!outbounds.length" class="empty">{{ t('empty.noTraffic') }}</div>
  <div v-else>
    <div v-for="o in outbounds" :key="o.tag" class="meter-row">
      <StatBadge :tag="o.tag" />
      <div class="meter">
        <i
          :style="{
            width: Math.max(4, ((o.up + o.down) / max) * 100) + '%',
            background: barColor(o.tag),
          }"
        ></i>
      </div>
      <span class="mono dim amount">
        <template v-if="withConn">{{ o.live }} live · </template>↑{{ fmtB(o.up) }} ↓{{ fmtB(o.down) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.meter-row {
  display: grid;
  grid-template-columns: 76px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
}
.meter-row + .meter-row {
  border-top: 1px solid var(--border);
}
.meter {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}
.meter > i {
  display: block;
  height: 100%;
  border-radius: 999px;
}
.amount {
  font-size: 12px;
}
</style>
