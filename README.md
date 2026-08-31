# Mirage Console

Mirage-rs 的**独立**控制 / 监控前端。跨源调用后端 `/api/v1`, 可独立部署、独立演进。

对接契约见 mirage-rs 仓的 [`docs/api-contract.md`](https://github.com/zdgt0226/Mirage-rs/blob/main/docs/api-contract.md)。
需要后端 **v0.10.7+** (提供 `/api/v1` + CORS)。

技术栈: **Vue 3 + TypeScript + Vite**。

## 开发

```bash
npm install
npm run dev          # http://localhost:5173
```

首次打开会自动弹**连接设置**:
- **Mirage API 地址**: 后端 `gui.listen` 的可达地址 (含端口, 无末尾 `/`), 如 `https://gw.example.com:9090`
- **API Token**: 后端 `gui.token` 的值 (后端没设 token 就留空)

存于浏览器 `localStorage` (`mirage_api` / `mirage_token`)。侧栏底部 ⚙ 随时改。

### 开发期免 CORS

把 API 地址**留空** (= 同源), 再用 Vite dev proxy 转发:

```bash
MIRAGE_DEV_API=https://gw.example.com:9090 npm run dev
```

`vite.config.ts` 会据此把 `/api/v1` 代理到后端, 浏览器侧无跨源, 不用配后端 CORS。

## 构建 / 校验

```bash
npm run build        # vue-tsc 类型检查 + 产物到 dist/
npm run typecheck    # 只跑类型检查
npm run verify       # build + 冒烟测试
```

`npm run smoke` 在 jsdom 里挂载 `dist/` 产物, 用 `scripts/fixtures.mjs` 的假后端跑一遍
client / server 两种模式的各视图, 抓白屏与运行时报错。改完 UI 至少跑一次。

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
- 鉴权统一走 `Authorization: Bearer <token>` (由 `src/api/client.ts` 注入), 不依赖 cookie。

## 部署

`npm run build` 后把 `dist/` 静态托管即可: nginx / Caddy / Cloudflare Pages / 与后端同机 nginx。
纯静态, 无服务端渲染。

### GitHub Pages (自动)

push 到 `main` 触发 `.github/workflows/deploy.yml`: 类型检查 → 构建 → 冒烟测试 → 发布到 Pages。
构建时带 `--base=/<仓库名>/`, 因为项目站点挂在子路径下。

**首次需在仓库 Settings → Pages 里把 Source 设为 "GitHub Actions"**, 否则部署步骤会失败。
上线后记得把 Pages 的 origin (`https://<用户名>.github.io`) 加进后端 `gui.cors_origins`。

`.github/workflows/ci.yml` 在 PR 和 push 时跑同一套检查, 不发布。

## 结构

```
src/
  api/          client.ts (统一拼 baseURL + Bearer)、types.ts (后端契约)、settings.ts (地址/token)
  components/   侧栏、顶栏、图表、KPI、连接表、规则卡片、规则/策略编辑器、连接设置弹窗
  views/        Overview / Connections / Routing / Logs / Devices / Clients
  composables/  useAppState (概览轮询 + 视图/模式)、usePolling、useApi、useI18n、useTheme、useSaveFlow
  i18n/         en.ts / zh.ts
  styles/       tokens.css (设计令牌)、app.css (跨组件公共类)
scripts/        smoke.mjs + fixtures.mjs (jsdom 冒烟测试)
```

- 轮询跟着视图组件的生命周期走: 视图卸载, 它的 `setInterval` 就停。概览轮询 (1s) 挂在 `App.vue`,
  顶栏速率、导航连接数、运行模式与图表历史都靠它, 切视图不断线。
- 运行模式 (`client` / `server`) 由 `/api/v1/overview` 的 `mode` 决定, 侧栏据此隐藏不属于本模式的入口。
