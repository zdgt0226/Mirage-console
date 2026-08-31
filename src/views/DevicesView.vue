<script setup lang="ts">
import { reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { DevicesResp } from '@/api/types'
import { useApi } from '@/composables/useApi'
import { useI18n } from '@/composables/useI18n'
import { usePolling } from '@/composables/usePolling'
import { fmtB, fmtIdle } from '@/utils/format'

const { t } = useI18n()
const { data: devices, load: loadDevices } = useApi<DevicesResp>(api.devices, {})
const outbounds = ref<string[]>([])
/** 每台设备下拉框选中的出站，key 是设备 IP。 */
const picked = reactive<Record<string, string>>({})

async function load() {
  await loadDevices()
  // 出站列表来自 /rules，用于"路由到"下拉。
  try {
    const r = await api.rules()
    if (r.status === 'success') outbounds.value = r.outbounds ?? []
  } catch {
    // 拿不到就保持上一次的下拉选项。
  }
}
usePolling(load, 3000)

async function routeDevice(ip: string) {
  const outbound = picked[ip] || outbounds.value[0]
  if (!outbound) {
    alert(t('dev.noOutbound'))
    return
  }
  try {
    const cur = await api.rules()
    if (cur.status !== 'success') {
      alert(t('save.failed'))
      return
    }
    // 前插: 首命中即用，设备规则要盖过通用规则。
    const rules = [{ source_ip_cidr: [ip + '/32'], outbound }, ...(cur.rules ?? [])]
    const dry = await api.saveRules(rules, true)
    if (dry.status !== 'success') {
      alert(t('save.invalid') + '\n' + (dry.message ?? ''))
      return
    }
    const res = await api.saveRules(rules, false)
    if (res.status === 'success') alert(t('dev.routed') + outbound + ' (' + ip + '/32)')
    else alert(res.message ?? t('save.failed'))
  } catch {
    alert(t('save.failed'))
  }
}
</script>

<template>
  <section>
    <div class="card devices-card">
      <div class="card-head">
        <div class="card-title">{{ t('dev.lanDevices') }}</div>
        <span class="hint dim">{{ t('dev.byActivity') }}</span>
      </div>
      <div class="scroll-x">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('th.device') }}</th>
              <th class="r">{{ t('th.conns') }}</th>
              <th class="r">↑ / ↓</th>
              <th class="r">{{ t('th.idle') }}</th>
              <th class="r">{{ t('dev.route') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!(devices.devices ?? []).length">
              <td colspan="5" class="empty">{{ t('dev.none') }}</td>
            </tr>
            <tr v-for="d in devices.devices ?? []" v-else :key="d.ip">
              <td class="target mono">{{ d.ip }}</td>
              <td class="r mono dim">{{ d.conns.toLocaleString() }}</td>
              <td class="r mono">↑{{ fmtB(d.up) }} <span class="dim">/</span> ↓{{ fmtB(d.down) }}</td>
              <td class="r mono dim">{{ fmtIdle(d.idle_ms) }}</td>
              <td class="r">
                <span class="route-cell">
                  <select v-model="picked[d.ip]" class="devsel">
                    <option v-for="o in outbounds" :key="o" :value="o">{{ o }}</option>
                  </select>
                  <button class="btn-add" @click="routeDevice(d.ip)">{{ t('dev.route') }}</button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">{{ t('dev.perDeviceSpeed') }}</div>
        <span class="soon">{{ t('soon') }}</span>
      </div>
      <div class="card-pad"><div class="stub">{{ t('dev.perDeviceSpeedDesc') }}</div></div>
    </div>
  </section>
</template>

<style scoped>
.devices-card {
  margin-bottom: 16px;
}
.route-cell {
  display: inline-flex;
  gap: 5px;
  justify-content: flex-end;
}
</style>
