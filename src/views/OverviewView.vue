<script setup lang="ts">
import { computed } from 'vue'
import KpiCard from '@/components/KpiCard.vue'
import OutboundBars from '@/components/OutboundBars.vue'
import TrafficChart from '@/components/TrafficChart.vue'
import { api } from '@/api/client'
import type { Stats } from '@/api/types'
import { useApi } from '@/composables/useApi'
import { useAppState } from '@/composables/useAppState'
import { useI18n } from '@/composables/useI18n'
import { usePolling } from '@/composables/usePolling'
import { fmtB, fmtRateParts } from '@/utils/format'

const { t } = useI18n()
const { overview, upRate, downRate, upHistory, downHistory } = useAppState()

const { data: stats, load: loadStats } = useApi<Stats>(api.stats, {})
usePolling(loadStats, 2000)

const up = computed(() => fmtRateParts(upRate.value))
const down = computed(() => fmtRateParts(downRate.value))

/** sk_lookup 劫持成功率: success / (success + fallback)。 */
const hijack = computed(() => {
  const s = overview.value?.bpf_success ?? 0
  const f = overview.value?.bpf_fallback ?? 0
  return s + f > 0 ? [((s / (s + f)) * 100).toFixed(1) + '%', ((f / (s + f)) * 100).toFixed(1) + '%'] : ['—', '0%']
})
const brutalActive = computed(() => overview.value?.brutal_cc_active === true)
const xdpAttached = computed(() => overview.value?.xdp_attached === 1)
</script>

<template>
  <section>
    <div class="grid kpis">
      <KpiCard
        :label="t('kpi.upload')"
        :value="up[0]"
        :unit="up[1]"
        :sub="fmtB(overview?.up) + ' ' + t('unit.total')"
        color="var(--up)"
      />
      <KpiCard
        :label="t('kpi.download')"
        :value="down[0]"
        :unit="down[1]"
        :sub="fmtB(overview?.down) + ' ' + t('unit.total')"
        color="var(--down)"
      />
      <KpiCard
        :label="t('kpi.conns')"
        :value="String(overview?.connections ?? 0)"
        :sub="t('kpi.liveFlows')"
        color="var(--ok)"
      />
      <KpiCard
        :label="t('kpi.tunnels')"
        :value="String(overview?.tunnel_count ?? 0)"
        :sub="brutalActive ? t('brutal.active') : t('brutal.static')"
        color="var(--accent)"
      />
    </div>

    <div class="card chart-card">
      <div class="card-head">
        <div class="card-title">
          <span>{{ t('card.throughput') }}</span><span class="hint">{{ t('card.last120') }}</span>
        </div>
        <div class="legend">
          <span><i :style="{ background: 'var(--up)' }"></i>{{ t('kpi.upload') }}</span>
          <span><i :style="{ background: 'var(--down)' }"></i>{{ t('kpi.download') }}</span>
        </div>
      </div>
      <TrafficChart :up="upHistory" :down="downHistory" />
    </div>

    <div class="grid cols-2">
      <div class="card">
        <div class="card-head"><div class="card-title">{{ t('card.byOutbound') }}</div></div>
        <div class="card-pad">
          <OutboundBars :outbounds="stats.outbounds ?? []" />
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title">{{ t('card.ebpf') }}</div></div>
        <div class="card-pad">
          <div class="health-grid">
            <div class="health-cell">
              <div class="h-l">{{ t('health.hijack') }}</div>
              <div class="h-v"><span class="mono">{{ hijack[0] }}</span></div>
            </div>
            <div class="health-cell">
              <div class="h-l">{{ t('health.fallback') }}</div>
              <div class="h-v mono">{{ hijack[1] }}</div>
            </div>
            <div class="health-cell">
              <div class="h-l">XDP DNS</div>
              <div class="h-v">
                <span class="badge" :class="xdpAttached ? 'proxy' : 'direct'">
                  {{ xdpAttached ? t('badge.attached') : t('badge.off') }}
                </span>
              </div>
            </div>
            <div class="health-cell">
              <div class="h-l">Brutal CC</div>
              <div class="h-v">
                <span class="badge" :class="brutalActive ? 'proxy' : 'direct'">
                  {{ brutalActive ? t('badge.active') : t('badge.static') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chart-card {
  margin-bottom: 16px;
}
.legend {
  display: flex;
  gap: 16px;
}
.legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--muted);
}
.legend i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.health-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.health-cell {
  background: var(--surface);
  padding: 14px 16px;
}
.health-cell .h-l {
  font-size: 11.5px;
  color: var(--muted);
}
.health-cell .h-v {
  font-size: 18px;
  font-weight: 700;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
