<script setup lang="ts">
import { computed, ref } from 'vue'
import ConnectionTable from '@/components/ConnectionTable.vue'
import { api } from '@/api/client'
import type { Connection, ConnectionsResp, TunnelsResp } from '@/api/types'
import { useApi } from '@/composables/useApi'
import { useI18n } from '@/composables/useI18n'
import { usePolling } from '@/composables/usePolling'

const { t } = useI18n()
const filter = ref('')

const { data: conns, load: loadConns } = useApi<ConnectionsResp>(api.connections, {})
const { data: tunnels, load: loadTunnels } = useApi<TunnelsResp>(api.tunnels, {})

usePolling(() => Promise.all([loadConns(), loadTunnels()]), 1000)

function matches(c: Connection): boolean {
  const f = filter.value.trim().toLowerCase()
  if (!f) return true
  return [c.target, c.inbound, c.outbound, c.process, c.proto].some((x) =>
    String(x ?? '').toLowerCase().includes(f),
  )
}

const active = computed(() => (conns.value.active ?? []).filter(matches))
const activeTotal = computed(() => (conns.value.active ?? []).length)
// 后端按时间正序给，最近关闭的在末尾；只看最近 25 条。
const closed = computed(() =>
  (conns.value.recent_closed ?? []).slice().reverse().slice(0, 25).filter(matches),
)

const rttColor = (ms: number) => (ms < 50 ? 'var(--ok)' : ms < 150 ? 'var(--warn)' : 'var(--crit)')
</script>

<template>
  <section>
    <div class="toolbar">
      <div class="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
        </svg>
        <input v-model="filter" :placeholder="t('ph.filter')" />
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">
          <span>{{ t('card.active') }}</span>
          <span class="hint">{{ activeTotal }} {{ t('unit.connections') }}</span>
        </div>
      </div>
      <ConnectionTable :rows="active" :empty-text="t('empty.noConn')" />
    </div>

    <div class="sub-head">{{ t('card.recentClosed') }}</div>
    <div class="card">
      <ConnectionTable :rows="closed" closed :empty-text="t('empty.nothing')" />
    </div>

    <div class="sub-head">
      <span>{{ t('card.bpfTunnels') }}</span>
      <span class="dim hint-inline">{{ t('card.bpfHint') }}</span>
    </div>
    <div class="card">
      <div class="scroll-x">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('th.remote') }}</th>
              <th class="r">RTT</th>
              <th class="r">{{ t('th.retrans') }}</th>
              <th class="r">cwnd</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!(tunnels.tunnels ?? []).length">
              <td colspan="4" class="empty">{{ t('empty.noTun') }}</td>
            </tr>
            <tr v-for="tun in tunnels.tunnels ?? []" v-else :key="tun.remote ?? '?'">
              <td class="mono">{{ tun.remote || '?' }}</td>
              <td class="r mono" :style="{ color: rttColor(tun.rtt_ms) }">{{ tun.rtt_ms.toFixed(1) }} ms</td>
              <td class="r mono" :style="{ color: tun.retrans > 0 ? 'var(--crit)' : 'var(--faint)' }">
                {{ tun.retrans }}
              </td>
              <td class="r mono dim">{{ tun.cwnd }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hint-inline {
  text-transform: none;
  letter-spacing: 0;
  margin-left: 6px;
}
</style>
