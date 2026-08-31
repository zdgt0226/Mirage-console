import { computed, ref } from 'vue'
import { api } from '@/api/client'
import type { Overview, RunMode } from '@/api/types'

export type ViewId = 'overview' | 'connections' | 'routing' | 'logs' | 'devices' | 'clients'

/** 图表窗口: 120 个 1s 采样点 = 近 120 秒。 */
export const HISTORY_LEN = 120

const view = ref<ViewId>('overview')
const mode = ref<RunMode | null>(null)
const engineOnline = ref(false)
const overview = ref<Overview | null>(null)

const upHistory = ref<number[]>(new Array(HISTORY_LEN).fill(0))
const downHistory = ref<number[]>(new Array(HISTORY_LEN).fill(0))
const upRate = ref(0)
const downRate = ref(0)

// 后端给的是累计字节，速率靠相邻两次采样差分；第一拍没有基准，记 0。
let lastUp = 0
let lastDown = 0
let first = true

/**
 * 概览轮询: 顶栏速率、导航连接数、运行模式、引擎在线状态、图表历史都出自这里。
 * 与视图无关，App 挂载后每秒跑一次，切视图不打断历史曲线。
 */
export async function pollOverview() {
  let d: Overview
  try {
    d = await api.overview()
  } catch {
    engineOnline.value = false
    return
  }

  if (d.mode && d.mode !== mode.value) mode.value = d.mode

  const us = first ? 0 : Math.max(0, d.up - lastUp)
  const ds = first ? 0 : Math.max(0, d.down - lastDown)
  lastUp = d.up
  lastDown = d.down
  first = false

  upHistory.value = [...upHistory.value.slice(1), us]
  downHistory.value = [...downHistory.value.slice(1), ds]
  upRate.value = us
  downRate.value = ds
  overview.value = d
  engineOnline.value = d.engine_online === true
}

export function useAppState() {
  return {
    view,
    mode,
    overview,
    engineOnline,
    upRate,
    downRate,
    upHistory,
    downHistory,
    connections: computed(() => overview.value?.connections ?? 0),
    pollOverview,
    setView: (v: ViewId) => {
      view.value = v
    },
  }
}
