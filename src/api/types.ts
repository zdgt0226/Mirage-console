/** 后端 /api/v1 契约 (见 mirage-rs docs/api-contract.md)。 */

export type RunMode = 'client' | 'server'

export interface ApiResult {
  status: string
  message?: string
  /** dry_run 预检告警，不阻断保存。 */
  issues?: string[]
}

export interface Overview {
  mode?: RunMode
  /** 累计字节，速率由前端两次采样差分得出。 */
  up: number
  down: number
  connections?: number
  tunnel_count?: number
  engine_online?: boolean
  bpf_success?: number
  bpf_fallback?: number
  xdp_attached?: number
  brutal_cc_active?: boolean
}

export interface Connection {
  target: string
  inbound?: string
  outbound: string
  proto: string
  process?: string
  age_ms: number
  up: number
  down: number
}

export interface ConnectionsResp {
  active?: Connection[]
  recent_closed?: Connection[]
}

export interface Tunnel {
  remote?: string
  rtt_ms: number
  retrans: number
  cwnd: number
}

export interface TunnelsResp {
  tunnels?: Tunnel[]
}

export interface OutboundStat {
  tag: string
  up: number
  down: number
  live: number
}

export interface RuleHit {
  index: number
  outbound: string
  hits: number
}

export interface Stats {
  outbounds?: OutboundStat[]
  rules?: RuleHit[]
  default?: { outbound: string; hits: number }
}

export interface DomainStat {
  host: string
  conns: number
  up: number
  down: number
}

export interface DomainsResp {
  domains?: DomainStat[]
}

export interface ClientStat {
  ip: string
  version?: string
  conns: number
  up: number
  down: number
  idle_ms: number
  blocked?: boolean
}

export interface ClientsResp {
  clients?: ClientStat[]
  blocked?: string[]
}

export interface DeviceStat {
  ip: string
  conns: number
  up: number
  down: number
  idle_ms: number
}

export interface DevicesResp {
  devices?: DeviceStat[]
}

/** 路由规则。匹配维度均为数组，port 为数字数组，其余为字符串数组。 */
export interface Rule {
  outbound?: string
  domain_suffix?: string[]
  domain_keyword?: string[]
  domain_regex?: string[]
  geosite?: string[]
  ip_cidr?: string[]
  geoip?: string[]
  source_ip_cidr?: string[]
  process_name?: string[]
  inbound?: string[]
  protocol?: string[]
  port?: number[]
}

/** Rule 上可编辑的匹配字段名 (排除 outbound)。 */
export type RuleField = Exclude<keyof Rule, 'outbound'>

export interface RulesResp extends ApiResult {
  rules?: Rule[]
  outbounds?: string[]
}

export interface ProxyNode {
  tag: string
  latency_rtt_ms?: number | null
  latency_http_ms?: number | null
}

export interface ProxyGroup {
  tag: string
  type: string
  selected?: string
  children: ProxyNode[]
}

export interface ProxiesResp {
  proxies?: ProxyGroup[]
}

export interface LogsResp {
  logs: string[]
}

export interface DeviceProfile {
  name?: string
  source_ip_cidr: string[]
  profile: string
}

export interface ProfilesResp extends ApiResult {
  profiles?: Record<string, Rule[]>
  device_profiles?: DeviceProfile[]
  outbounds?: string[]
}
