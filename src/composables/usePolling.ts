import { onMounted, onUnmounted } from 'vue'

/**
 * 组件挂载期间按固定间隔跑 fn。视图用 v-if 切换，所以轮询天然只在可见视图运行 —
 * 旧版全局 setInterval + `if(view==='x')` 的守卫不再需要。
 */
export function usePolling(fn: () => unknown, intervalMs: number, immediate = true) {
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false

  // 上一轮没跑完就跳过这一轮，避免后端慢时请求堆积。
  const tick = async () => {
    if (running) return
    running = true
    try {
      await fn()
    } finally {
      running = false
    }
  }

  onMounted(() => {
    if (immediate) void tick()
    timer = setInterval(tick, intervalMs)
  })
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { refresh: tick }
}
