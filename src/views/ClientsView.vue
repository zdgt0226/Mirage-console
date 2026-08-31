<script setup lang="ts">
import { computed } from 'vue'
import ConnectionTable from '@/components/ConnectionTable.vue'
import { api } from '@/api/client'
import type { ClientsResp, ConnectionsResp, DomainsResp } from '@/api/types'
import { useApi } from '@/composables/useApi'
import { useI18n } from '@/composables/useI18n'
import { usePolling } from '@/composables/usePolling'
import { fmtB, fmtIdle } from '@/utils/format'

const { t } = useI18n()
const { data: domains, load: loadDomains } = useApi<DomainsResp>(api.domains, {})
const { data: clients, load: loadClients } = useApi<ClientsResp>(api.clients, {})
const { data: conns, load: loadConns } = useApi<ConnectionsResp>(api.connections, {})

usePolling(() => Promise.all([loadDomains(), loadClients(), loadConns()]), 3000)

/** 连接历史 = recent_closed 环形缓冲的倒序前 150 条 (轻量内存版)。 */
const history = computed(() => (conns.value.recent_closed ?? []).slice().reverse().slice(0, 150))
const historyTotal = computed(() => (conns.value.recent_closed ?? []).length)

const clientCount = computed(() => {
  const rows = clients.value.clients ?? []
  const blocked = clients.value.blocked ?? []
  return rows.length + (blocked.length ? ' · ' + blocked.length + ' ' + t('srv.blockedTag') : '')
})

async function toggleBlock(ip: string, blocked: boolean) {
  if (blocked && !confirm(t('srv.block') + ' ' + ip + ' ?')) return
  try {
    const r = await api.blockClient(ip, blocked)
    if (r.status !== 'success') alert(r.message ?? 'error')
    await loadClients()
  } catch {
    alert('failed')
  }
}
</script>

<template>
  <section>
    <div class="grid cols-2 top-row">
      <div class="card">
        <div class="card-head">
          <div class="card-title">{{ t('srv.domainRank') }}</div>
          <span class="hint dim">{{ t('srv.byTraffic') }}</span>
        </div>
        <div class="scroll-x">
          <table class="tbl">
            <thead>
              <tr>
                <th>{{ t('th.domain') }}</th>
                <th class="r">{{ t('th.conns') }}</th>
                <th class="r">↑ / ↓</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!(domains.domains ?? []).length">
                <td colspan="3" class="empty">{{ t('empty.noTraffic') }}</td>
              </tr>
              <tr v-for="d in domains.domains ?? []" v-else :key="d.host">
                <td class="target mono">{{ d.host }}</td>
                <td class="r mono dim">{{ d.conns.toLocaleString() }}</td>
                <td class="r mono">↑{{ fmtB(d.up) }} <span class="dim">/</span> ↓{{ fmtB(d.down) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">{{ t('srv.connHistory') }}</div>
          <span class="hint dim">{{ historyTotal }}</span>
        </div>
        <div class="history-scroll">
          <ConnectionTable :rows="history" closed :empty-text="t('empty.nothing')" />
        </div>
      </div>
    </div>

    <div class="card clients-card">
      <div class="card-head">
        <div class="card-title">{{ t('srv.clientMgmt') }}</div>
        <span class="hint dim">{{ clientCount }}</span>
      </div>
      <div class="scroll-x">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('th.client') }}</th>
              <th>{{ t('th.version') }}</th>
              <th class="r">{{ t('th.conns') }}</th>
              <th class="r">↑ / ↓</th>
              <th class="r">{{ t('th.idle') }}</th>
              <th class="r">{{ t('srv.block') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!(clients.clients ?? []).length">
              <td colspan="6" class="empty">{{ t('srv.noClients') }}</td>
            </tr>
            <tr v-for="c in clients.clients ?? []" v-else :key="c.ip" :style="c.blocked ? { opacity: 0.5 } : undefined">
              <td class="target mono">
                {{ c.ip }}
                <span v-if="c.blocked" class="badge block">{{ t('srv.blockedTag') }}</span>
              </td>
              <td>
                <span v-if="c.version" class="badge tcp">{{ c.version }}</span>
                <span v-else class="dim">—</span>
              </td>
              <td class="r mono dim">{{ c.conns.toLocaleString() }}</td>
              <td class="r mono">↑{{ fmtB(c.up) }} <span class="dim">/</span> ↓{{ fmtB(c.down) }}</td>
              <td class="r mono dim">{{ fmtIdle(c.idle_ms) }}</td>
              <td class="r">
                <button
                  class="btn-add"
                  :style="{
                    color: c.blocked ? 'var(--ok)' : 'var(--crit)',
                    borderColor: c.blocked ? 'var(--ok)' : 'var(--crit)',
                  }"
                  @click="toggleBlock(c.ip, !c.blocked)"
                >
                  {{ c.blocked ? t('srv.unblock') : t('srv.block') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">{{ t('srv.rateLimit') }}</div>
        <span class="soon">{{ t('soon') }}</span>
      </div>
      <div class="card-pad"><div class="stub">{{ t('srv.rateLimitDesc') }}</div></div>
    </div>
  </section>
</template>

<style scoped>
.top-row {
  margin-bottom: 16px;
}
.clients-card {
  margin-bottom: 16px;
}
.history-scroll {
  overflow-x: auto;
  max-height: 360px;
  overflow-y: auto;
}
</style>
