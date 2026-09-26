# Mirage Console ↔ Mirage-rs 对接规范 v1

本文定义 Mirage Console (独立前端) 与 Mirage-rs 内核之间的 HTTP 接口契约。前端实现见
`src/api/client.ts` / `src/api/types.ts`，本文即该实现的规范化描述 + 后端应做的调整建议。

标记约定:
- **【现状】** 前端当前已按此实现，后端保持兼容即可。
- **【建议】** 建议后端调整的点，改动需要前端同步（本文注明前端改动量）。

---

## 1. 总则

### 1.1 基址与版本

```
<base>/api/v1/<resource>
```

- `<base>` 由用户在前端「连接设置」里填写，形如 `https://gw.example.com:9090`，无末尾 `/`；留空表示同源（配合 dev proxy / 同机 nginx）。
- 版本前缀 `/api/v1` 固定。**破坏性变更必须升 `/api/v2`**，`v1` 在下一个大版本周期内保持可用。
- 非破坏性变更（新增字段、新增端点、新增枚举值）直接在 `v1` 内做，前端对未知字段一律忽略。

### 1.2 编码与格式

| 项 | 约定 |
|---|---|
| 字符集 | UTF-8 |
| 请求/响应体 | `application/json` |
| 字段命名 | `snake_case` |
| 字节数 | 整数，单位 **字节**（不要预格式化成 "1.2 MB"，格式化是前端的事） |
| 时长 | 整数，单位 **毫秒**，字段名以 `_ms` 结尾 |
| 时间点 | RFC 3339 字符串，UTC，如 `2026-09-01T12:34:56Z` |
| 延迟/RTT | 浮点，单位毫秒 |
| 布尔 | 真正的 JSON `true` / `false`，不要用 `0/1` 或 `"yes"` |

### 1.3 HTTP 方法语义

- `GET`：只读，无副作用，可安全重试。所有监控类端点均为 `GET`。
- `POST`：写操作。当前所有写操作都是**全量替换**语义（见 §5.1）。
- 暂不使用 `PUT` / `PATCH` / `DELETE`；若后续引入，须在本文补充。

---

## 2. 认证

### 2.1 方式

```http
Authorization: Bearer <token>
```

- token 即后端 config 的 `gui.token`。
- 后端未配置 token 时，前端不发 `Authorization` 头，后端应放行。**生产部署必须配 token。**
- 不使用 Cookie / Session。前端不发 `credentials`，因此不存在 CSRF-via-cookie 面。

### 2.2 CSRF 头

写操作（`POST`）额外带：

```http
X-Requested-With: XMLHttpRequest
```

【现状】前端对所有 `POST` 都发。该头无法被 `<form>` 跨源伪造，后端可据此拒绝简单请求。
【建议】后端对写操作强制校验此头存在，缺失返回 `403`。

### 2.3 认证失败语义

| 场景 | 状态码 | 响应体 |
|---|---|---|
| 缺 token / token 错 | `401` | 标准错误体（§3.2） |
| token 对但无权限 | `403` | 标准错误体 |
| 缺 `X-Requested-With`（写操作） | `403` | 标准错误体 |

【建议】`401` 响应**不要**带 `WWW-Authenticate: Basic`，否则浏览器会弹原生登录框。

### 2.4 Token 传输安全

- token 存在浏览器 `localStorage`（key `mirage_token`），跨源明文发送。
- **后端应只在 HTTPS 下暴露 `gui.listen`**，或仅监听内网 / 经反代加 TLS。文档需向用户说明这点。

---

## 3. 响应约定

### 3.1 统一信封【建议】

现状不一致：`GET` 直接返回资源对象（无信封），`POST` 及 `/rules`、`/profiles` 的 `GET` 返回带
`status` 字段的信封。建议统一为：

```jsonc
// 成功
{ "status": "success", "data": { /* 资源本体 */ } }

// 失败
{ "status": "error", "code": "invalid_rule", "message": "人类可读说明", "issues": ["..."] }
```

前端改动量：`src/api/client.ts` 的 `parse()` 里统一拆信封，各视图不动。

**若不改**，则维持现状契约，本文 §4 的响应示例即为裸对象；前端已按裸对象解析。二选一，不要混。

### 3.2 标准错误体

```jsonc
{
  "status": "error",
  "code": "rule_validation_failed",   // 机器可读，snake_case，稳定不变
  "message": "rule[2].port 必须是 1-65535 的整数",  // 面向人，可 i18n 由后端决定
  "issues": ["rule[0] geosite:cn 与 rule[3] 冲突"]  // 可选，非阻断性告警
}
```

| 状态码 | 用途 |
|---|---|
| `200` | 成功 |
| `400` | 请求体格式错误（非法 JSON、字段类型不符） |
| `401` / `403` | 见 §2.3 |
| `404` | 端点不存在 |
| `422` | 语义校验失败（规则内容非法） |
| `429` | 限流（若实现） |
| `500` | 内核内部错误 |
| `503` | 引擎未就绪 / 正在重载 |

【现状】前端对非 `2xx` 抛 `ApiError`，监控类端点静默吞掉（保留上一次数据，不闪空），
写操作弹 `alert`。因此**错误体的 `message` 会直接展示给用户**，措辞要可读。

### 3.3 CORS

跨源部署时后端必须回：

```http
Access-Control-Allow-Origin: <白名单中的具体 origin>
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
Access-Control-Max-Age: 600
```

- 白名单来自 config `gui.cors_origins`，支持 `["*"]`（回显请求 origin 或字面 `*`）。
- **不要**回 `Access-Control-Allow-Credentials: true`（前端不用 cookie，加上反而禁止 `*`）。
- 必须正确处理 `OPTIONS` 预检：带 `Authorization` 和 `X-Requested-With` 的请求一定触发预检。

---

## 4. 端点清单

前端轮询节奏（决定后端每个端点的性能预算）：

| 端点 | 频率 | 触发条件 |
|---|---|---|
| `GET /overview` | **1s** | 常驻，所有视图 |
| `GET /connections` | 1s | 仅「连接」视图 |
| `GET /bpf/tunnels` | 1s | 仅「连接」视图 |
| `GET /stats` | 2s | 「概览」「路由」视图 |
| `GET /logs` | 2s | 仅「日志」视图 |
| `GET /proxies` | 5s | 仅「路由」视图 |
| `GET /devices` + `GET /rules` | 3s | 仅「设备」视图 |
| `GET /domains` + `/clients` + `/connections` | 3s | 仅「客户端」视图（server 模式） |
| `GET /rules` / `GET /profiles` | 进入视图时一次 | 「路由」视图，保存后重拉 |

**性能要求**：`/overview` 每秒一次，单页面常驻。该端点必须是内存读 + 原子计数器快照，
**禁止**在其中做锁竞争、遍历全部连接或系统调用。目标 p99 < 5ms。

### 4.1 `GET /overview`

驱动顶栏速率、侧栏连接数、运行模式判定、概览页 KPI 与 eBPF 健康。

```jsonc
{
  "mode": "client",            // "client" | "server"，决定前端显示哪些入口，见 §6
  "up": 12582912,              // 累计上行字节，单调递增
  "down": 314572800,           // 累计下行字节，单调递增
  "connections": 42,           // 当前活跃连接数
  "tunnel_count": 3,           // 预热隧道数
  "engine_online": true,       // 引擎是否就绪
  "bpf_success": 900,          // sk_lookup 劫持成功累计次数
  "bpf_fallback": 100,         // 回落到常规路径的累计次数
  "xdp_attached": 1,           // 【建议】改成 bool xdp_attached
  "brutal_cc_active": true
}
```

**关键约束**：
- `up` / `down` 是**累计值**，前端做差分算速率（`max(0, cur - prev)`）。因此必须**单调递增**；
  进程重启导致归零时前端本轮显示 0，可接受。**不要**在这里直接给速率。
- `mode` 缺省时前端不隐藏任何入口，直到收到有效值。
- `bpf_success` / `bpf_fallback` 同为累计计数，前端算比率 `success/(success+fallback)`。
- 【建议】补 `version`（内核版本串）与 `uptime_ms`，前端侧栏当前硬编码 `v0.10.1`。

### 4.2 `GET /connections`

```jsonc
{
  "active": [
    {
      "target": "example.com:443",  // 目标，域名优先，无域名则 IP:port
      "inbound": "tproxy",          // 入站标识
      "outbound": "proxy",          // 出站 tag，或 "direct" / "block"
      "proto": "tcp",               // "tcp" | "udp"
      "process": "curl",            // 进程名，取不到给 null
      "age_ms": 4200,
      "up": 2048,
      "down": 8192
    }
  ],
  "recent_closed": [ /* 同上结构，process 可省 */ ]
}
```

- `recent_closed` 按**关闭时间正序**（老 → 新），前端倒序后取前 25 条（连接视图）/ 前 150 条（客户端视图历史）。
- 【建议】`active` 单次返回上限 500 条并加 `active_total` 字段；当前无上限，大规模下响应体会失控。
- 【建议】`outbound` 的三类语义固定：具体出站 tag、`direct`、`block`。前端据此配色。

### 4.3 `GET /bpf/tunnels`

```jsonc
{
  "tunnels": [
    { "remote": "10.0.0.1:443", "rtt_ms": 23.4, "retrans": 0, "cwnd": 10 }
  ]
}
```

`rtt_ms` 必须是数字（前端调 `.toFixed(1)`，给 `null` 会崩）。无数据时给空数组，不要给 `null`。

### 4.4 `GET /stats`

```jsonc
{
  "outbounds": [
    { "tag": "proxy", "up": 100, "down": 900, "live": 2 }   // live = 当前活跃连接数
  ],
  "rules": [
    { "index": 0, "outbound": "proxy", "hits": 17 }          // index 与 /rules 数组下标一一对应
  ],
  "default": { "outbound": "direct", "hits": 5 }             // 兜底规则命中
}
```

`rules[].index` 必须与 `GET /rules` 返回数组的下标对齐，否则「规则命中」表对不上号。

### 4.5 `GET /proxies`

```jsonc
{
  "proxies": [
    {
      "tag": "auto",
      "type": "Selector",              // "Selector" 可手切；其他类型（UrlTest 等）前端只读
      "selected": "hk-01",
      "children": [
        { "tag": "hk-01", "latency_rtt_ms": 42, "latency_http_ms": 88 },
        { "tag": "jp-02", "latency_rtt_ms": null, "latency_http_ms": null }
      ]
    }
  ]
}
```

延迟未知给 `null`（前端显示 `—`），**不要**给 `-1` 或 `0`。

### 4.6 `POST /proxies/select`

```jsonc
// 请求
{ "group": "auto", "target": "jp-02" }
// 响应
{ "status": "success" }
```

前端切换后立即重拉 `/proxies` 校正。失败时前端静默，靠 5s 轮询把真实选中态刷回。

### 4.7 `GET /logs`

```jsonc
{ "logs": ["2026-09-01T12:00:00Z INFO started", "..."] }
```

【现状】整包返回预格式化行，前端靠 `logs.length` 变化判断是否需要重渲染，靠子串匹配
`DEBUG`/`WARN`/`ERROR` 判定级别 —— 脆弱且每 2s 传全量。

【建议】改结构化 + 增量游标：

```jsonc
// GET /logs?after=<cursor>&limit=500
{
  "cursor": "17251234",          // 本批最后一条的游标，下次带上
  "entries": [
    { "ts": "2026-09-01T12:00:00Z", "level": "info", "target": "router", "msg": "matched rule 3" }
  ]
}
```

`level` 枚举：`debug` | `info` | `warn` | `error`。前端改动：`LogsView.vue` 一个文件。

### 4.8 `GET /rules` / `POST /rules`

见 §5。

### 4.9 `GET /profiles` / `POST /profiles`

见 §5.3。

### 4.10 `GET /devices`（client 模式）

```jsonc
{
  "devices": [
    { "ip": "192.168.1.20", "conns": 4, "up": 5120, "down": 60000, "idle_ms": 1000 }
  ]
}
```

【建议】补 `hostname` / `mac`，纯 IP 列表对用户不友好。

### 4.11 `GET /domains`（server 模式）

```jsonc
{ "domains": [ { "host": "example.com", "conns": 3, "up": 1024, "down": 4096 } ] }
```

按流量倒序，后端截断 top-N（建议 N=50）。

### 4.12 `GET /clients`（server 模式）

```jsonc
{
  "clients": [
    { "ip": "10.1.1.5", "version": "0.10.1", "conns": 2, "up": 1024, "down": 4096,
      "idle_ms": 3000, "blocked": false }
  ],
  "blocked": ["10.1.1.9"]        // 已屏蔽但当前无连接的也要列在这里
}
```

`version` 需要握手协议加字段，取不到给 `null`。

### 4.13 `POST /clients/block`（server 模式）

```jsonc
// 请求
{ "ip": "10.1.1.5", "blocked": true }
// 响应
{ "status": "success" }
```

屏蔽应在 accept 阶段生效，并断开该 IP 现存连接。

### 4.14 `GET /users` / `POST /users`（server 模式，多用户凭据与配额限速）

`mirage_server.users[]` 每人独立口令。**GET 绝不返 password**，只出 name + per-user 用量与配额限制。

```jsonc
// GET /users 响应
{
  "status": "success",
  "version": "…",                     // 乐观锁, 回传给 POST
  "users": [
    {
      "name": "default",
      "conns": 12,
      "up": 1048576,
      "down": 5242880,
      "active": 2,
      "in_config": true,
      "rate_limit_kbps": null,        // 限速 kbps, null=不限
      "quota_gb": null,               // 月配额 GB (上下行合计), null=不限
      "quota_reset_day": null,        // 每月重置日 1..=28 (UTC), null=默认 1
      "period_used_bytes": 1048576,   // 本周期已用字节
      "period_start": 1727308800,     // 本周期起点 unix 秒 (UTC)
      "exhausted": false              // 是否已超额
    },
    {
      "name": "alice",
      "conns": 3,
      "up": 0,
      "down": 0,
      "active": 0,
      "in_config": true,
      "rate_limit_kbps": 5000,        // 5 Mbps
      "quota_gb": 10.0,               // 10 GB
      "quota_reset_day": 1,           // 每月 1 日重置
      "period_used_bytes": 524288000, // 已用 ~500 MB
      "period_start": 1727308800,
      "exhausted": false
    },
    {
      "name": "bob",
      "conns": 5,
      "up": 999,
      "down": 8888,
      "active": 0,
      "in_config": false,             // 已从配置删除, 留历史用量
      "rate_limit_kbps": null,
      "quota_gb": null,
      "quota_reset_day": null,
      "period_used_bytes": 9887,
      "period_start": 1727308800,
      "exhausted": false
    }
  ]
}
```

`POST /users` 是 **op-based 增量**（**不是整表替换** —— GET 藏 password，前端拿不到既有密码做全量）。
`?dry_run=1` 只校验不写。

```jsonc
// 请求
{
  "ops": [
    { "action": "upsert", "name": "alice", "password": "新密码" },  // 增或改密 (需非空 password)
    { "action": "remove", "name": "bob" },                          // 按名删
    {
      "action": "set_limits",                                       // 设定限速与月配额
      "name": "alice",
      "rate_limit_kbps": 5000,                                      // 限速 kbps (>0 整数, null=不限)
      "quota_gb": 10.0,                                             // 月配额 GB (>0 有限数, null=不限)
      "quota_reset_day": 1                                          // 每月重置日 1..=28 整数 (null=默认 1)
    },
    { "action": "reset_quota", "name": "alice" }                    // 清零该用户本周期用量与超额状态
  ],
  "version": "…"   // 可选乐观锁; 不符 → 409 stale_version
}
// 响应
{ "status": "success", "written": true, "version": "新版本" }
```

- 保留名 `default`（主密码）不由此管理（op 命中 → 422 `reserved_name`，不能 `set_limits` / `reset_quota`）；`in_config=false` 的孤儿行同样不提供这些操作。
- **`set_limits` 是三字段整体替换**：某字段不传或传 null = 清空该限制。所以前端编辑限额时**必须把三个字段的最终值一起发**（没改的字段也要带上当前值），否则会被清掉。`rate_limit_kbps` 须 >0 整数；`quota_gb` 须 >0 有限数；`quota_reset_day` 须 1..=28 整数。
- **`reset_quota`**：只清零该用户本周期用量与超额状态，不改配置。
- 校验失败（空名/重名/空密码/坏 action/超出范围等）→ 422，`message` 说明，`issues[]` 明细，**未写入**。
- 写成功后原子替换 config.json + 热重载。

---

## 5. 配置写入：规则与策略

### 5.1 全量替换语义

`POST /rules` 与 `POST /profiles` 都是**整体替换**，不是增量补丁。前端把编辑后的完整数组发回。

**并发覆盖风险**：两个浏览器同时编辑，后提交者静默覆盖先提交者。

【建议】加乐观锁：

```jsonc
// GET /rules 响应加
{ "version": "cfg-17251234", "rules": [...], "outbounds": [...] }

// POST /rules 请求带
{ "version": "cfg-17251234", "rules": [...] }
// 版本不匹配 → 409 Conflict + { "code": "stale_version", "message": "配置已被他处修改，请刷新" }
```

前端改动：`RulesEditor.vue` / `ProfilesEditor.vue` 各存一个 version，`409` 时提示重载。

### 5.2 `dry_run` 预检

```
POST /rules?dry_run=1
POST /profiles?dry_run=1
```

**语义**：只校验，**不落盘、不生效**。前端保存流程固定为两步（见 `src/composables/useSaveFlow.ts`）：

1. 带 `dry_run=1` 提交 → 若 `status != "success"`，弹 `message` 并中止；
2. 若返回 `issues` 非空 → 弹确认框列出告警，用户确认才继续；
3. 不带 `dry_run` 再提交一次 → 成功则重拉最新配置。

因此后端必须保证：
- `dry_run` 与真实提交的**校验逻辑完全一致**，否则出现"预检过、正式提交失败"的坏体验；
- `issues` 是**非阻断**告警（如"规则 5 永远不会命中"），阻断性问题必须走 `status: "error"` + `message`；
- 两次提交之间配置可能被他人改动 —— 这正是 §5.1 乐观锁要解决的。

### 5.3 数据模型

**Rule**（`src/api/types.ts` 的 `Rule`）：

```jsonc
{
  "outbound": "proxy",              // 必填，命中后走的出站
  "domain_suffix": ["example.com"],
  "domain_keyword": ["ads"],
  "domain_regex": ["^cdn\\d+\\."],
  "geosite": ["cn"],
  "ip_cidr": ["10.0.0.0/8"],
  "geoip": ["cn"],
  "source_ip_cidr": ["192.168.1.20/32"],
  "process_name": ["curl"],
  "inbound": ["tproxy"],
  "protocol": ["tcp"],
  "port": [443]                     // 整数数组，1-65535，前端已做校验
}
```

- 所有匹配维度都是**数组**，同一维度内 OR，跨维度 AND。
- **空数组等价于该维度不存在** —— 前端删掉最后一个值时会移除整个 key，后端也应把空数组当作未设置。
- 数组顺序 = 优先级，**首命中即用**。前端「上移/下移」按钮直接改数组顺序。
- `port` 是数字，其余是字符串。JSON 里不要把端口写成 `"443"`。

**Profiles**（用户策略）：

```jsonc
{
  "status": "success",
  "profiles": {
    "kids": [ { "outbound": "direct", "geosite": ["cn"] } ]   // 名称 → 规则数组
  },
  "device_profiles": [
    { "name": "tablet", "source_ip_cidr": ["192.168.1.30/32"], "profile": "kids" }
  ],
  "outbounds": ["proxy", "direct"]
}
```

- profile 内的规则**不含** `source_ip_cidr` —— 来源由 `device_profiles` 注入，后端负责合成。
- profile 名是 map 的 key，重命名 = 删旧键加新键，前端会同步改 `device_profiles[].profile`。
- 【建议】明确 profile 规则与全局 `rules` 的**优先级**：建议设备命中 profile 时，profile 规则先于全局规则匹配；未命中任何 profile 的流量只走全局规则。此规则需写进后端文档，前端只做展示。

**outbounds 列表**：`GET /rules` 和 `GET /profiles` 都返回 `outbounds: string[]`，是当前配置里所有可用出站 tag，前端用作输入框的 `datalist` 候选与设备路由下拉。必须包含 `direct` 和 `block`。

### 5.4 设备快速路由

「设备」视图的「路由」按钮不走独立端点，而是：`GET /rules` → 在数组**头部**插入
`{ source_ip_cidr: ["<ip>/32"], outbound: "<选中出站>" }` → `dry_run` → 正式提交。

【建议】若要专用端点（`POST /devices/route`），需保证与直接改 rules 的语义等价，且前端要同步改
`DevicesView.vue`。当前实现无需后端新增任何东西。

---

## 6. 运行模式

`GET /overview` 的 `mode` 决定前端侧栏可见入口：

| 入口 | client | server | 说明 |
|---|---|---|---|
| 概览 / 连接 / 日志 | ✓ | ✓ | 两种模式都有 |
| 路由（规则、代理组、策略） | ✓ | ✗ | 仅客户端 |
| 设备 | ✓ | ✗ | 仅客户端 |
| 客户端管理 | ✗ | ✓ | 仅服务端 |

**约束**：server 模式下后端可以让 `/rules`、`/proxies`、`/profiles`、`/devices` 返回
`404` 或空数据 —— 前端不会调用它们。反之 client 模式下不会调 `/clients`、`/domains`。
但**不要**在错误模式下返回 `500`，前端虽然容错，日志会变脏。

---

## 7. 建议新增的端点

### 7.1 `GET /version`（低成本，建议优先做）

```jsonc
{ "version": "0.10.7", "api_version": "v1", "build": "2026-08-20T10:00:00Z", "features": ["xdp", "brutal", "profiles"] }
```

前端可据此显示真实版本（当前硬编码），并在 `features` 缺失时隐藏对应 UI，替代现在"端点 404 才知道不支持"的试探。

### 7.2 `GET /events`（SSE，替代轮询，中期目标）

当前空闲状态下前端每秒至少 1 个请求，打开「连接」视图时 3 个/秒。改 SSE 后：

```
GET /api/v1/events?streams=overview,connections
Accept: text/event-stream

event: overview
data: {"up":123,"down":456,"connections":42}

event: connections
data: {"active":[...]}
```

- 保留全部 `GET` 端点作为首屏加载与降级路径。
- 心跳 15s，前端断线自动重连（指数退避）。
- 前端改动：新增 `useEventStream.ts`，`usePolling` 保留为 fallback；视图组件不动。

**注意**：SSE 无法自定义请求头，`Authorization` 发不出去。若走 SSE，需支持
`GET /events?token=<token>` 查询串鉴权，并在文档里提示 token 会进访问日志 —— 或改用 WebSocket。

---

## 8. 兼容性与变更流程

1. **加字段**：随时可加，前端忽略未知字段。
2. **加端点**：随时可加。
3. **改字段类型 / 改语义 / 删字段**：破坏性，必须升 `/api/v2`，且 `v1` 与 `v2` 并存至少一个大版本。
4. **枚举加值**：允许，但前端对未知 `outbound` 一律按"代理"配色，对未知 `proto` 按默认样式渲染，不会崩。
5. 每次接口变更，同步更新本文与 mirage-rs 仓的 `docs/api-contract.md`，两边保持一致。

## 9. 对接自测

前端仓库带一个假后端 fixture：`scripts/fixtures.mjs`，其内容即本文各端点的**最小合法响应样例**。
后端改完接口后，最快的校验方式是把 fixture 里的样例作为契约测试的期望结构。

前端侧回归：

```bash
npm run verify     # 构建 + jsdom 冒烟测试（client / server 双模式，31 项检查）
```

---

## 10. 后端改动优先级建议

| 优先级 | 项 | 理由 | 前端改动 |
|---|---|---|---|
| P0 | `X-Requested-With` 强制校验（§2.2） | 写接口防跨源伪造 | 无 |
| P0 | 统一错误体 + 正确状态码（§3.2） | 现在错误信息直接弹给用户 | 无（已兼容） |
| P0 | CORS 预检正确处理（§3.3） | 不对就整个跨源部署不可用 | 无 |
| P1 | `GET /version`（§7.1） | 干掉硬编码版本号 | 侧栏一行 |
| P1 | 配置乐观锁 `version`（§5.1） | 多端编辑静默覆盖 | 两个编辑器组件 |
| P1 | `/connections` 分页上限（§4.2） | 大规模下响应体失控 | 表格加"仅显示前 N 条"提示 |
| P2 | 结构化日志 + 游标（§4.7） | 每 2s 全量传日志 | `LogsView.vue` |
| P2 | `xdp_attached` 改 bool（§4.1） | 类型一致性 | 一行 |
| P2 | `/devices` 补 hostname（§4.10） | 可用性 | 表格加一列 |
| P3 | SSE 推流（§7.2） | 去掉 1s 轮询 | 新增 composable |
