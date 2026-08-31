<script setup lang="ts">
import type { ProxyGroup } from '@/api/types'
import { useI18n } from '@/composables/useI18n'

defineProps<{ groups: ProxyGroup[] }>()
const emit = defineEmits<{ select: [group: string, target: string] }>()
const { t } = useI18n()

/** 延迟配色阈值与连接表一致: <100ms 绿, <300ms 黄, 其余红。 */
const latColor = (ms: number) =>
  ms < 100 ? 'var(--ok)' : ms < 300 ? 'var(--warn)' : 'var(--crit)'
</script>

<template>
  <div v-if="!groups.length" class="empty">{{ t('empty.noGroups') }}</div>
  <div v-for="g in groups" v-else :key="g.tag" class="proxy-group">
    <div class="proxy-group-title">
      {{ g.tag }} <span class="badge direct">{{ g.type }}</span>
    </div>
    <div class="node-list">
      <!-- 只有 Selector 组可手动切换；UrlTest 由后端按延迟自选。 -->
      <div
        v-for="ch in g.children"
        :key="ch.tag"
        class="node-btn"
        :class="{ active: ch.tag === g.selected, clickable: g.type === 'Selector' }"
        @click="g.type === 'Selector' && emit('select', g.tag, ch.tag)"
      >
        <div class="n-tag">{{ ch.tag }}</div>
        <div v-if="ch.latency_rtt_ms != null" class="mono lat" :style="{ color: latColor(ch.latency_rtt_ms) }">
          BPF {{ ch.latency_rtt_ms }} ms
        </div>
        <div v-if="ch.latency_http_ms != null" class="mono lat" :style="{ color: latColor(ch.latency_http_ms) }">
          HTTP {{ ch.latency_http_ms }} ms
        </div>
        <div v-if="ch.latency_rtt_ms == null && ch.latency_http_ms == null" class="dim mono lat">—</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proxy-group {
  margin-bottom: 18px;
}
.proxy-group:last-child {
  margin-bottom: 0;
}
.proxy-group-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.node-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.node-btn {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 10px 12px;
  transition: 0.12s;
}
.node-btn.clickable {
  cursor: pointer;
}
.node-btn:hover {
  border-color: var(--border-strong);
}
.node-btn.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.n-tag {
  font-weight: 600;
  font-size: 13px;
}
.lat {
  font-size: 11px;
  margin-top: 4px;
}
</style>
