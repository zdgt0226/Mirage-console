<script setup lang="ts">
defineProps<{
  label: string
  /** 主数值，已格式化。 */
  value: string
  /** 数值后的小字单位，如 MB/s。 */
  unit?: string
  /** 底部副行，如 "1.2 GB total"。 */
  sub?: string
  /** 标签前的色块，传 CSS 颜色值。 */
  color: string
}>()
</script>

<template>
  <div class="kpi">
    <div class="kpi-label"><span class="g" :style="{ background: color }"></span><span>{{ label }}</span></div>
    <div class="kpi-val mono">
      <span>{{ value }}</span>
      <small v-if="unit">{{ unit }}</small>
    </div>
    <div class="kpi-delta">{{ sub || '—' }}</div>
  </div>
</template>

<style scoped>
.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: var(--shadow);
}
.kpi-label {
  font-size: 11.5px;
  color: var(--muted);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 7px;
}
.kpi-label .g {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.kpi-val {
  font-size: 27px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.kpi-val small {
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}
.kpi-delta {
  font-size: 12px;
  margin-top: 5px;
  color: var(--faint);
}
</style>
