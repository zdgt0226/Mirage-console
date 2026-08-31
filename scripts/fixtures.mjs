// 冒烟测试用的假后端响应，字段照 docs/api-contract.md 的形状写。
export const fixtures = {
  '/overview': {
    mode: 'client',
    up: 1024 * 1024 * 12,
    down: 1024 * 1024 * 300,
    connections: 42,
    tunnel_count: 3,
    engine_online: true,
    bpf_success: 900,
    bpf_fallback: 100,
    xdp_attached: 1,
    brutal_cc_active: true,
  },
  '/connections': {
    active: [
      {
        target: 'example.com:443',
        inbound: 'tproxy',
        outbound: 'proxy',
        proto: 'tcp',
        process: 'curl',
        age_ms: 4200,
        up: 2048,
        down: 8192,
      },
    ],
    recent_closed: [
      { target: 'closed.test:80', outbound: 'direct', proto: 'tcp', age_ms: 91000, up: 10, down: 20 },
    ],
  },
  '/bpf/tunnels': { tunnels: [{ remote: '10.0.0.1:443', rtt_ms: 23.4, retrans: 0, cwnd: 10 }] },
  '/stats': {
    outbounds: [{ tag: 'proxy', up: 100, down: 900, live: 2 }],
    rules: [{ index: 0, outbound: 'proxy', hits: 17 }],
    default: { outbound: 'direct', hits: 5 },
  },
  '/domains': { domains: [{ host: 'example.com', conns: 3, up: 1, down: 2 }] },
  '/clients': { clients: [{ ip: '10.1.1.5', version: '0.10.1', conns: 2, up: 1, down: 2, idle_ms: 3000 }], blocked: [] },
  '/devices': { devices: [{ ip: '192.168.1.20', conns: 4, up: 5, down: 6, idle_ms: 1000 }] },
  '/logs': { logs: ['2026-09-01 INFO started', '2026-09-01 ERROR boom'] },
  '/proxies': {
    proxies: [
      {
        tag: 'auto',
        type: 'Selector',
        selected: 'hk-01',
        children: [
          { tag: 'hk-01', latency_rtt_ms: 42, latency_http_ms: 88 },
          { tag: 'jp-02', latency_rtt_ms: null, latency_http_ms: null },
        ],
      },
    ],
  },
  '/rules': {
    status: 'success',
    rules: [{ outbound: 'proxy', domain_suffix: ['example.com'], port: [443] }],
    outbounds: ['proxy', 'direct', 'block'],
  },
  '/profiles': {
    status: 'success',
    profiles: { kids: [{ outbound: 'direct', geosite: ['cn'] }] },
    device_profiles: [{ name: 'tablet', source_ip_cidr: ['192.168.1.30/32'], profile: 'kids' }],
    outbounds: ['proxy', 'direct'],
  },
}
