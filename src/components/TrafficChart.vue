<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { cssVar, fmtRateParts } from '@/utils/format'

const props = defineProps<{ up: number[]; down: number[] }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const tipEl = ref<HTMLDivElement | null>(null)
const { isDark } = useTheme()

const N = () => Math.max(props.up.length, 2)

type Geo = {
  padL: number
  padT: number
  ch: number
  cw: number
  w: number
  h: number
  X: (i: number) => number
  Y: (v: number) => number
}
let geo: Geo | null = null

function draw(hoverIndex: number | null = null) {
  const cv = canvas.value
  if (!cv) return
  const dpr = Math.min(devicePixelRatio || 1, 2)
  const w = cv.clientWidth
  const h = cv.clientHeight
  if (!w) return
  cv.width = w * dpr
  cv.height = h * dpr
  const g = cv.getContext('2d')
  if (!g) return
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, w, h)

  const n = N()
  const padL = 52
  const padR = 14
  const padT = 14
  const padB = 22
  const cw = w - padL - padR
  const ch = h - padT - padB
  // 下限 1KB/s，空闲时曲线不会贴着顶；再留 15% 顶部余量。
  const max = Math.max(...props.up, ...props.down, 1024) * 1.15
  const X = (i: number) => padL + (i / (n - 1)) * cw
  const Y = (v: number) => padT + ch - (v / max) * ch
  geo = { padL, padT, ch, cw, w, h, X, Y }

  const grid = cssVar('--grid')
  const faint = cssVar('--faint')
  g.font = '11px "JetBrains Mono",monospace'
  g.textBaseline = 'middle'
  for (let k = 0; k <= 4; k++) {
    const val = (max * k) / 4
    const y = Y(val)
    g.strokeStyle = grid
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(padL, y)
    g.lineTo(w - padR, y)
    g.stroke()
    const p = fmtRateParts(val)
    g.fillStyle = faint
    g.textAlign = 'right'
    g.fillText(p[0] + p[1][0], padL - 8, y)
  }

  g.textAlign = 'center'
  g.textBaseline = 'top'
  for (const s of [0, 30, 60, 90, 120]) {
    const i = n - 1 - (s / 120) * (n - 1)
    g.fillStyle = faint
    g.fillText(s === 0 ? 'now' : '-' + s + 's', X(i), h - padB + 6)
  }

  for (const [arr, col] of [
    [props.down, cssVar('--down')],
    [props.up, cssVar('--up')],
  ] as [number[], string][]) {
    // 填充区
    g.beginPath()
    arr.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))))
    const gr = g.createLinearGradient(0, padT, 0, padT + ch)
    gr.addColorStop(0, col + '44')
    gr.addColorStop(1, col + '00')
    g.lineTo(X(n - 1), padT + ch)
    g.lineTo(X(0), padT + ch)
    g.closePath()
    g.fillStyle = gr
    g.fill()
    // 描边
    g.beginPath()
    arr.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))))
    g.strokeStyle = col
    g.lineWidth = 2
    g.lineJoin = 'round'
    g.stroke()
    // 末端点
    const lx = X(n - 1)
    const ly = Y(arr[n - 1] ?? 0)
    g.fillStyle = cssVar('--surface')
    g.beginPath()
    g.arc(lx, ly, 4.5, 0, 7)
    g.fill()
    g.fillStyle = col
    g.beginPath()
    g.arc(lx, ly, 3, 0, 7)
    g.fill()
  }

  if (hoverIndex !== null) {
    g.strokeStyle = cssVar('--border-strong')
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(X(hoverIndex), padT)
    g.lineTo(X(hoverIndex), padT + ch)
    g.stroke()
    for (const [arr, v] of [
      [props.up, '--up'],
      [props.down, '--down'],
    ] as [number[], string][]) {
      g.fillStyle = cssVar('--surface')
      g.beginPath()
      g.arc(X(hoverIndex), Y(arr[hoverIndex] ?? 0), 4.5, 0, 7)
      g.fill()
      g.fillStyle = cssVar(v)
      g.beginPath()
      g.arc(X(hoverIndex), Y(arr[hoverIndex] ?? 0), 3, 0, 7)
      g.fill()
    }
  }
}

const hover = ref<{ index: number; left: number; top: number } | null>(null)

function onMove(e: MouseEvent) {
  const cv = canvas.value
  if (!cv || !geo) return
  const r = cv.getBoundingClientRect()
  const n = N()
  let i = Math.round(((e.clientX - r.left - geo.padL) / geo.cw) * (n - 1))
  i = Math.max(0, Math.min(n - 1, i))
  draw(i)
  hover.value = {
    index: i,
    left: Math.min(geo.w - 162, geo.X(i) + 10),
    top: geo.padT + 8,
  }
}

function onLeave() {
  hover.value = null
  draw()
}

const hoverLabel = (i: number) =>
  i === N() - 1 ? 'now' : '-' + Math.round(((N() - 1 - i) / (N() - 1)) * 120) + 's'

const onResize = () => draw(hover.value?.index ?? null)

onMounted(() => {
  draw()
  addEventListener('resize', onResize)
})
onUnmounted(() => removeEventListener('resize', onResize))

watch(() => [props.up, props.down], () => draw(hover.value?.index ?? null))
// 主题切换后 CSS 变量变了，曲线颜色要重取。
watch(isDark, () => draw(hover.value?.index ?? null))

defineExpose({ redraw: () => draw() })
</script>

<template>
  <div class="chartwrap">
    <canvas ref="canvas" @mousemove="onMove" @mouseleave="onLeave"></canvas>
    <div
      ref="tipEl"
      class="tip"
      :style="{
        opacity: hover ? 1 : 0,
        left: (hover?.left ?? 0) + 'px',
        top: (hover?.top ?? 0) + 'px',
      }"
    >
      <template v-if="hover">
        <div class="t-time">{{ hoverLabel(hover.index) }}</div>
        <div class="t-row">
          <span><i :style="{ background: 'var(--up)' }"></i>Up</span>
          <b class="mono">{{ fmtRateParts(up[hover.index]).join(' ') }}</b>
        </div>
        <div class="t-row">
          <span><i :style="{ background: 'var(--down)' }"></i>Down</span>
          <b class="mono">{{ fmtRateParts(down[hover.index]).join(' ') }}</b>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.chartwrap {
  position: relative;
  padding: 8px 12px 12px;
}
canvas {
  width: 100%;
  height: 240px;
  display: block;
}
.tip {
  position: absolute;
  pointer-events: none;
  background: var(--raised);
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 12px;
  box-shadow: var(--shadow);
  transition: opacity 0.1s;
  min-width: 150px;
}
.t-time {
  color: var(--faint);
  font-size: 11px;
  margin-bottom: 5px;
}
.t-row {
  display: flex;
  align-items: center;
  gap: 7px;
  justify-content: space-between;
}
.t-row i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
  margin-right: 5px;
}
</style>
