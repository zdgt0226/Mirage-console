<script setup lang="ts">
import OutboundBars from '@/components/OutboundBars.vue'
import ProfilesEditor from '@/components/ProfilesEditor.vue'
import ProxyGroups from '@/components/ProxyGroups.vue'
import RulesEditor from '@/components/RulesEditor.vue'
import { api } from '@/api/client'
import type { ProxiesResp, Stats } from '@/api/types'
import { useApi } from '@/composables/useApi'
import { useI18n } from '@/composables/useI18n'
import { usePolling } from '@/composables/usePolling'

const { t } = useI18n()

const { data: stats, load: loadStats } = useApi<Stats>(api.stats, {})
const { data: proxies, loaded: proxiesLoaded, load: loadProxies } = useApi<ProxiesResp>(api.proxies, {})

usePolling(loadStats, 2000)
usePolling(loadProxies, 5000)

const hitColor = (outbound: string) =>
  outbound === 'direct' ? 'var(--muted)' : outbound === 'block' ? 'var(--crit)' : 'var(--ok)'

async function selectProxy(group: string, target: string) {
  try {
    await api.selectProxy(group, target)
    await loadProxies()
  } catch {
    // 切换失败时下一轮 5s 轮询会把真实选中态刷回来。
  }
}
</script>

<template>
  <section>
    <div class="grid cols-2 top-row">
      <div class="card">
        <div class="card-head">
          <div class="card-title">
            <span>{{ t('card.ruleHits') }}</span><span class="hint">{{ t('card.sinceLoad') }}</span>
          </div>
        </div>
        <div class="scroll-x">
          <table class="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ t('th.outbound') }}</th>
                <th class="r">{{ t('th.hits') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in stats.rules ?? []" :key="r.index" :style="r.hits === 0 ? { opacity: 0.45 } : undefined">
                <td class="mono dim">{{ r.index }}</td>
                <td><span :style="{ color: hitColor(r.outbound), fontWeight: 600 }">{{ r.outbound }}</span></td>
                <td class="r mono">{{ (r.hits ?? 0).toLocaleString() }}</td>
              </tr>
              <tr v-if="stats.default" class="default-row">
                <td class="dim">{{ t('rule.default') }}</td>
                <td class="dim">{{ stats.default.outbound }}</td>
                <td class="r mono">{{ (stats.default.hits ?? 0).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title">{{ t('card.outboundTotals') }}</div></div>
        <div class="card-pad">
          <OutboundBars :outbounds="stats.outbounds ?? []" with-conn />
        </div>
      </div>
    </div>

    <div class="card group-card">
      <div class="card-head"><div class="card-title">{{ t('card.proxyGroups') }}</div></div>
      <div class="card-pad">
        <div v-if="!proxiesLoaded" class="empty">{{ t('empty.loading') }}</div>
        <ProxyGroups v-else :groups="proxies.proxies ?? []" @select="selectProxy" />
      </div>
    </div>

    <RulesEditor />

    <div class="profiles">
      <ProfilesEditor />
    </div>
  </section>
</template>

<style scoped>
.top-row {
  margin-bottom: 20px;
}
.group-card {
  margin-bottom: 20px;
}
.profiles {
  margin-top: 20px;
}
.default-row td {
  border-top: 1px solid var(--border-strong);
}
</style>
