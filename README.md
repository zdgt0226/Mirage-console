# Mirage Console

Mirage-rs 的**独立**控制 / 监控前端。从 mirage 内置 WebUI (`src/api/index.html`) 平移而来 —— 同一套界面, 改为
跨源调用后端 `/api/v1`, 可独立部署、独立演进。

对接契约见 mirage-rs 仓的 [`docs/api-contract.md`](https://github.com/zdgt0226/Mirage-rs/blob/main/docs/api-contract.md)。
需要后端 **v0.10.7+** (提供 `/api/v1` + CORS)。

## 运行

纯静态页, 无需构建。任意静态服务器打开 `index.html` 即可:

```bash
# 本地预览
python3 -m http.server 5173
# 打开 http://localhost:5173 → 右下角 ⚙ 填后端地址 + token
```

首次打开会自动弹**连接设置**:
- **Mirage API 地址**: 后端 `gui.listen` 的可达地址 (含端口, 无末尾 `/`), 如 `https://gw.example.com:9090`
- **API Token**: 后端 `gui.token` 的值 (后端没设 token 就留空)

存于浏览器 `localStorage` (`mirage_api` / `mirage_token`)。右下角 ⚙ 随时改。

## 后端要放行本页 origin (CORS)

跨源访问时, 后端 config 需把本前端的 origin 加进白名单:

```jsonc
"gui": {
  "enabled": true,
  "listen": "0.0.0.0:9090",
  "token": "你的随机token",
  "cors_origins": ["https://console.example.com", "http://localhost:5173"]
}
```
- `["*"]` 可放行任意 origin (Bearer 鉴权非 cookie, 无 cookie 泄露面, 但仍建议精确白名单)。
- 鉴权统一走 `Authorization: Bearer <token>` (本前端自动注入), 不依赖 cookie。

## 开发期免 CORS (可选)

不想配后端 CORS 时, 用 dev proxy 让请求同源。设置里 **API 地址留空** (=同源), 再用任意反代把
`/api/v1` 转到后端。例 (Vite 场景可用 `server.proxy`, 或 nginx):
```
location /api/ { proxy_pass http://后端:9090; }
```

## 部署

静态托管即可: nginx / Caddy / Cloudflare Pages / GitHub Pages / 与后端同机 nginx。
只有一个 `index.html`, 传上去就行。

## 工作原理

`index.html` 顶部一段 **fetch shim** 把内嵌 UI 里所有相对 `fetch('/api/xxx')` 重写为
`<配置的后端>/api/v1/xxx` 并注入 `Authorization: Bearer`。故 UI 逻辑一行未改, 只加了这层重定向 +
连接设置面板。后续可渐进重构为 Vite + 组件化 (契约不变)。
