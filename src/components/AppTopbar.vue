<script setup lang="ts">
import { computed } from 'vue'
import { useAppState } from '@/composables/useAppState'
import { useI18n } from '@/composables/useI18n'
import { fmtRateParts } from '@/utils/format'

const { t } = useI18n()
const { view, engineOnline, overview, upRate, downRate } = useAppState()

const up = computed(() => fmtRateParts(upRate.value))
const down = computed(() => fmtRateParts(downRate.value))

/** 首次 /api/overview 回来之前显示"连接中…"，之后才分在线/离线。 */
const engineText = computed(() =>
  overview.value === null ? t('engine.connecting') : engineOnline.value ? t('engine.online') : t('engine.offline'),
)
</script>

<template>
  <header class="topbar">
    <div>
      <div class="view-title">{{ t('nav.' + view) }}</div>
      <div class="view-sub">{{ t('sub.' + view) }}</div>
    </div>
    <div class="top-right">
      <div class="rate-pill">
        <span class="dot up"></span><b class="mono">{{ up[0] }}</b><span class="dim">{{ up[1] }} ↑</span>
      </div>
      <div class="rate-pill">
        <span class="dot down"></span><b class="mono">{{ down[0] }}</b><span class="dim">{{ down[1] }} ↓</span>
      </div>
      <span class="status-chip" :class="engineOnline ? 'ok' : 'off'">
        <span class="dot"></span><span>{{ engineText }}</span>
      </span>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 28px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 5;
  background: color-mix(in srgb, var(--ground) 86%, transparent);
  backdrop-filter: blur(8px);
}
.view-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.3px;
}
.view-sub {
  color: var(--faint);
  font-size: 12.5px;
}
.top-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.rate-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 12.5px;
}
.rate-pill b {
  font-weight: 600;
}
</style>
