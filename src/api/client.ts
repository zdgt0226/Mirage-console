import { settings } from './settings'
import type {
  ApiResult,
  ClientsResp,
  ConnectionsResp,
  DeviceProfile,
  DevicesResp,
  DomainsResp,
  LogsResp,
  Overview,
  ProfilesResp,
  ProxiesResp,
  Rule,
  RulesResp,
  Stats,
  TunnelsResp,
} from './types'

const PREFIX = '/api/v1'

function url(path: string, query?: Record<string, string>): string {
  const qs = query ? '?' + new URLSearchParams(query).toString() : ''
  return settings.base + PREFIX + path + qs
}

function headers(withBody: boolean): HeadersInit {
  const h: Record<string, string> = {}
  if (withBody) {
    h['Content-Type'] = 'application/json'
    // 后端 CSRF 保护要求非简单请求头。
    h['X-Requested-With'] = 'XMLHttpRequest'
  }
  if (settings.token) h['Authorization'] = 'Bearer ' + settings.token
  return h
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(`HTTP ${res.status} ${res.statusText}`, res.status)
  return (await res.json()) as T
}

async function get<T>(path: string, query?: Record<string, string>): Promise<T> {
  return parse<T>(await fetch(url(path, query), { headers: headers(false) }))
}

async function post<T>(path: string, body: unknown, query?: Record<string, string>): Promise<T> {
  const res = await fetch(url(path, query), {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(body),
  })
  return parse<T>(res)
}

const dryQuery = (dry: boolean) => (dry ? { dry_run: '1' } : undefined)

export const api = {
  overview: () => get<Overview>('/overview'),
  connections: () => get<ConnectionsResp>('/connections'),
  tunnels: () => get<TunnelsResp>('/bpf/tunnels'),
  stats: () => get<Stats>('/stats'),
  domains: () => get<DomainsResp>('/domains'),
  clients: () => get<ClientsResp>('/clients'),
  devices: () => get<DevicesResp>('/devices'),
  logs: () => get<LogsResp>('/logs'),
  proxies: () => get<ProxiesResp>('/proxies'),
  rules: () => get<RulesResp>('/rules'),
  profiles: () => get<ProfilesResp>('/profiles'),

  blockClient: (ip: string, blocked: boolean) =>
    post<ApiResult>('/clients/block', { ip, blocked }),
  selectProxy: (group: string, target: string) =>
    post<ApiResult>('/proxies/select', { group, target }),
  saveRules: (rules: Rule[], dry: boolean) =>
    post<ApiResult>('/rules', { rules }, dryQuery(dry)),
  saveProfiles: (profiles: Record<string, Rule[]>, deviceProfiles: DeviceProfile[], dry: boolean) =>
    post<ApiResult>('/profiles', { profiles, device_profiles: deviceProfiles }, dryQuery(dry)),
}
