/** 字节数 → "12.3 MB"。 */
export function fmtB(n: number | undefined): string {
  const v0 = Number(n) || 0
  if (v0 < 1024) return v0 + ' B'
  const u = ['KB', 'MB', 'GB', 'TB']
  let i = -1
  let v = v0
  do {
    v /= 1024
    i++
  } while (v >= 1024 && i < u.length - 1)
  return (v < 10 ? v.toFixed(1) : Math.round(v)) + ' ' + u[i]
}

/** 速率 → ["12.3", "MB/s"]，数值与单位分开渲染 (KPI 里单位是小字号)。 */
export function fmtRateParts(n: number | undefined): [string, string] {
  const v0 = Number(n) || 0
  if (v0 < 1024) return [String(Math.round(v0)), 'B/s']
  const u = ['KB/s', 'MB/s', 'GB/s']
  let i = -1
  let v = v0
  do {
    v /= 1024
    i++
  } while (v >= 1024 && i < u.length - 1)
  return [(v < 10 ? v.toFixed(1) : Math.round(v)).toString(), u[i]]
}

/** 限速 (kbps) → "5 Mbps" / "500 kbps" / "1 Gbps"。 */
export function fmtKbps(kbps: number | null | undefined): string {
  if (kbps == null) return ''
  const k = Number(kbps) || 0
  if (k <= 0) return ''
  if (k >= 1_000_000) {
    const v = k / 1_000_000
    return `${parseFloat(v.toFixed(2))} Gbps`
  }
  if (k >= 1_000) {
    const v = k / 1_000
    return `${parseFloat(v.toFixed(2))} Mbps`
  }
  return `${k} kbps`
}

/** 连接时长: 秒 / 分秒 / 时分。 */
export function fmtAge(ms: number | undefined): string {
  const s = Math.floor((Number(ms) || 0) / 1000)
  if (s < 60) return s + 's'
  const m = Math.floor(s / 60)
  if (m < 60) return m + 'm' + (s % 60) + 's'
  const h = Math.floor(m / 60)
  return h + 'h' + (m % 60) + 'm'
}

/** 空闲时长，粒度比 fmtAge 粗一档。 */
export function fmtIdle(ms: number | undefined): string {
  const s = Math.floor((Number(ms) || 0) / 1000)
  if (s < 60) return s + 's'
  const m = Math.floor(s / 60)
  if (m < 60) return m + 'm'
  return Math.floor(m / 60) + 'h'
}

export type BadgeKind = 'direct' | 'block' | 'tcp' | 'udp' | 'proxy'

/** 出站/协议标签的配色分类，未知值一律按 proxy 渲染。 */
export function badgeKind(tag: string | undefined): BadgeKind {
  return tag === 'direct' || tag === 'block' || tag === 'tcp' || tag === 'udp' ? tag : 'proxy'
}

/** 读取当前主题下的 CSS 变量 (canvas 绘图取色用)。 */
export const cssVar = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()
