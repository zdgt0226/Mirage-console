<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { ProxyGroup } from '@/api/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  groups: ProxyGroup[]
  default?: string
  /** 切换 Selector 成员; reject 时组件回滚并显示错误。 */
  select: (group: string, target: string) => Promise<void>
}>()

const { t } = useI18n()

/** 延迟配色阈值与连接表一致: <100ms 绿, <300ms 黄, 其余红。 */
const latColor = (ms: number) =>
  ms < 100 ? 'var(--ok)' : ms < 300 ? 'var(--warn)' : 'var(--crit)'

// 乐观选中的目标: groupTag -> targetTag
const optimisticSelected = ref<Record<string, string>>({})

// 处于切换中的组: groupTag -> boolean
const pendingGroups = ref<Record<string, boolean>>({})

// 错误提示文本: groupTag -> string
const groupErrors = ref<Record<string, string>>({})
const errorTimers = new Map<string, number>()

onUnmounted(() => {
  for (const tid of errorTimers.values()) {
    window.clearTimeout(tid)
  }
  errorTimers.clear()
})

const effectiveDefault = computed(() => props.default ?? '')

/** 标出默认出站所在的组 (tag === default 时加"默认出站"标记), 默认组排在最前, 其余保持后端顺序。 */
const sortedGroups = computed(() => {
  const list = props.groups ?? []
  const def = effectiveDefault.value
  if (!def) return list
  const defGroups: ProxyGroup[] = []
  const otherGroups: ProxyGroup[] = []
  for (const g of list) {
    if (g.tag === def) {
      defGroups.push(g)
    } else {
      otherGroups.push(g)
    }
  }
  return [...defGroups, ...otherGroups]
})

function isDefaultGroup(tag: string): boolean {
  return !!effectiveDefault.value && tag === effectiveDefault.value
}

// 记录所有组 tag，用于检测子成员本身是否为组
const allGroupTags = computed(() => new Set((props.groups ?? []).map((g) => g.tag)))
function isGroupNode(tag: string): boolean {
  return allGroupTags.value.has(tag)
}

function currentSelected(g: ProxyGroup): string {
  return optimisticSelected.value[g.tag] ?? g.selected ?? ''
}

function typeLabel(type: string): string {
  switch (type?.toLowerCase()) {
    case 'selector':
      return t('group.type.selector')
    case 'urltest':
      return t('group.type.urltest')
    case 'fallback':
      return t('group.type.fallback')
    case 'loadbalance':
      return t('group.type.loadbalance')
    default:
      return type
  }
}

function typeBadgeClass(type: string): string {
  switch (type?.toLowerCase()) {
    case 'selector':
      return 'badge-selector'
    case 'urltest':
      return 'badge-urltest'
    case 'fallback':
      return 'badge-fallback'
    case 'loadbalance':
      return 'badge-loadbalance'
    default:
      return 'badge-other'
  }
}

function typeHint(type: string): string {
  switch (type?.toLowerCase()) {
    case 'urltest':
      return t('group.hint.urltest')
    case 'fallback':
      return t('group.hint.fallback')
    case 'loadbalance':
      return t('group.hint.loadbalance')
    default:
      return t('group.hint.readOnly')
  }
}

async function handleSelect(g: ProxyGroup, targetTag: string) {
  if (g.type !== 'Selector') return
  if (pendingGroups.value[g.tag]) return
  if (currentSelected(g) === targetTag) return

  pendingGroups.value[g.tag] = true
  optimisticSelected.value[g.tag] = targetTag

  if (errorTimers.has(g.tag)) {
    window.clearTimeout(errorTimers.get(g.tag))
    errorTimers.delete(g.tag)
  }
  delete groupErrors.value[g.tag]

  try {
    await props.select(g.tag, targetTag)
  } catch (err: unknown) {
    const detail = err instanceof Error && err.message ? ': ' + err.message : ''
    groupErrors.value[g.tag] = t('group.switchFailed') + detail
    const tid = window.setTimeout(() => {
      delete groupErrors.value[g.tag]
      errorTimers.delete(g.tag)
    }, 4000)
    errorTimers.set(g.tag, tid)
  } finally {
    delete optimisticSelected.value[g.tag]
    delete pendingGroups.value[g.tag]
  }
}
</script>

<template>
  <div v-if="!groups.length" class="empty">{{ t('empty.noGroups') }}</div>
  <div
    v-for="g in sortedGroups"
    v-else
    :key="g.tag"
    class="proxy-group"
    :class="{ 'is-pending': pendingGroups[g.tag] }"
  >
    <div class="proxy-group-title">
      <span class="group-tag">{{ g.tag }}</span>
      <span v-if="isDefaultGroup(g.tag)" class="badge default-badge">{{ t('group.defaultOutbound') }}</span>
      <span class="badge" :class="typeBadgeClass(g.type)">{{ typeLabel(g.type) }}</span>
      <span v-if="g.type?.toLowerCase() === 'loadbalance'" class="group-selected dim">
        ({{ t('group.roundRobin') }})
      </span>
      <span v-else-if="currentSelected(g)" class="group-selected">
        <span class="dim">{{ t('group.current') }}:</span>
        <span class="mono sel-tag">{{ currentSelected(g) }}</span>
      </span>
      <span v-if="pendingGroups[g.tag]" class="switching-indicator">
        <span class="spinner"></span>
        <span class="dim">{{ t('group.switching') }}</span>
      </span>
    </div>

    <!-- 非 Selector 组卡片简短提示说明为什么不能手切 -->
    <div v-if="g.type !== 'Selector'" class="group-hint dim">
      {{ typeHint(g.type) }}
    </div>

    <!-- 错误提示文本（几秒后自动消失） -->
    <div v-if="groupErrors[g.tag]" class="group-error">
      {{ groupErrors[g.tag] }}
    </div>

    <div class="node-list">
      <component
        :is="g.type === 'Selector' ? 'button' : 'div'"
        v-for="ch in g.children"
        :key="ch.tag"
        :type="g.type === 'Selector' ? 'button' : undefined"
        class="node-btn"
        :class="{
          active: ch.tag === currentSelected(g),
          clickable: g.type === 'Selector',
          unhealthy: ch.healthy === false,
          pending: pendingGroups[g.tag] && ch.tag === currentSelected(g),
        }"
        :aria-pressed="g.type === 'Selector' ? ch.tag === currentSelected(g) : undefined"
        :disabled="g.type === 'Selector' ? pendingGroups[g.tag] : undefined"
        @click="g.type === 'Selector' && handleSelect(g, ch.tag)"
      >
        <div class="node-head">
          <span class="n-tag" :title="ch.tag">{{ ch.tag }}</span>
          <span v-if="isGroupNode(ch.tag)" class="nested-group-badge">{{ t('group.nestedGroup') }}</span>
          <span v-if="ch.healthy === false" class="unhealthy-badge">
            <span class="dot-crit"></span>
            <span class="unhealthy-text">{{ t('group.unhealthy') }}</span>
          </span>
        </div>
        <div v-if="ch.latency_rtt_ms != null" class="mono lat" :style="{ color: latColor(ch.latency_rtt_ms) }">
          BPF {{ ch.latency_rtt_ms }} ms
        </div>
        <div v-if="ch.latency_http_ms != null" class="mono lat" :style="{ color: latColor(ch.latency_http_ms) }">
          HTTP {{ ch.latency_http_ms }} ms
        </div>
        <div v-if="ch.latency_rtt_ms == null && ch.latency_http_ms == null" class="dim mono lat">—</div>
      </component>
    </div>
  </div>
</template>

<style scoped>
.proxy-group {
  margin-bottom: 20px;
}
.proxy-group:last-child {
  margin-bottom: 0;
}
.proxy-group-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.group-tag {
  font-size: 13px;
  font-weight: 600;
}
.group-selected {
  font-size: 12px;
  font-weight: normal;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.sel-tag {
  font-weight: 600;
  color: var(--text);
}
.group-hint {
  font-size: 12px;
  margin-bottom: 8px;
}
.group-error {
  color: var(--crit);
  background: var(--crit-soft);
  border-left: 3px solid var(--crit);
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 10px;
}
.badge-selector {
  color: var(--accent);
  background: var(--accent-soft);
}
.badge-urltest {
  color: var(--ok);
  background: var(--ok-soft);
}
.badge-fallback {
  color: var(--warn);
  background: var(--warn-soft);
}
.badge-loadbalance {
  color: var(--down);
  background: color-mix(in srgb, var(--down) 14%, transparent);
}
.badge-other {
  color: var(--muted);
  background: var(--surface-2);
}
.default-badge {
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent);
}
.nested-group-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--faint);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.unhealthy-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--crit);
  margin-left: auto;
}
.dot-crit {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--crit);
  flex-shrink: 0;
}
.node-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
@media (max-width: 480px) {
  .node-list {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
  }
}
.node-btn {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 10px 12px;
  transition: 0.12s;
  cursor: default;
  min-width: 0;
  text-align: left;
}
button.node-btn {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  width: 100%;
}
.node-btn.clickable {
  cursor: pointer;
}
.node-btn.clickable:hover:not(:disabled) {
  border-color: var(--border-strong);
}
.node-btn.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.node-btn.unhealthy {
  opacity: 0.6;
}
.node-btn.unhealthy.active {
  opacity: 0.9;
}
.node-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
.node-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}
.n-tag {
  font-weight: 600;
  font-size: 13px;
  word-break: break-all;
}
.lat {
  font-size: 11px;
  margin-top: 4px;
}
.switching-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-left: auto;
}
.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
