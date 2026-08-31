/**
 * 冒烟测试: 在 jsdom 里挂载打包产物，用假后端喂数据，逐个视图检查关键内容渲染出来。
 * 目的不是覆盖细节，而是抓"整页白屏 / 运行时报错"这类回归。
 * 跑法: npm run build && npm run smoke
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM, VirtualConsole } from 'jsdom'
import { fixtures } from './fixtures.mjs'

const DIST = join(process.cwd(), 'dist', 'assets')
const bundle = readdirSync(DIST).find((f) => f.endsWith('.js'))
if (!bundle) {
  console.error('no bundle in dist/assets — run `npm run build` first')
  process.exit(1)
}
const code = readFileSync(join(DIST, bundle), 'utf8')

const failed = []
function check(label, cond) {
  console.log((cond ? '  ok   ' : '  FAIL ') + label)
  if (!cond) failed.push(label)
  return cond
}

/** 起一个装好前端的 jsdom 窗口，假后端按 mode 返回 client / server 两套概览。 */
function boot(mode) {
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (e) => errors.push(String(e)))
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')))

  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    // outside-only: 页面里没有脚本，但 window.eval 会在 DOM 的 realm 里跑我们注入的 bundle。
    runScripts: 'outside-only',
    virtualConsole,
  })
  const { window } = dom

  // jsdom 没有 matchMedia，主题跟随系统那条路要用到。
  window.matchMedia = (media) => ({
    media,
    matches: false,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })

  window.localStorage.setItem('mirage_api', '')
  window.localStorage.setItem('mirage_lang', 'en')

  const seen = new Set()
  window.fetch = async (url) => {
    const path = String(url)
      .replace(/^.*\/api\/v1/, '')
      .replace(/\?.*$/, '')
    seen.add(path)
    const body = path === '/overview' ? { ...fixtures['/overview'], mode } : fixtures[path]
    if (!body) return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) }
    return { ok: true, status: 200, statusText: 'OK', json: async () => body }
  }

  window.eval(code)

  const text = () => window.document.body.textContent ?? ''
  const inputValues = () => [...window.document.querySelectorAll('input')].map((i) => i.value)

  async function clickNav(name) {
    const btn = [...window.document.querySelectorAll('.nav-item')].find((b) =>
      (b.textContent ?? '').trim().toLowerCase().startsWith(name),
    )
    if (!btn) throw new Error('nav item not found: ' + name)
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    await tick(120)
  }

  return { window, seen, errors, text, inputValues, clickNav }
}

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms))

// ── client 模式: 概览 / 连接 / 路由 / 日志 / 设备 ──
{
  const app = boot('client')
  await tick(150)

  console.log('client mode · overview')
  check('brand rendered', app.text().includes('Mirage'))
  check('engine online chip', app.text().includes('Engine online'))
  check('active connections KPI', app.text().includes('42'))
  check('total traffic formatted', app.text().includes('300 MB total'))
  check('hijack ratio', app.text().includes('90.0%'))
  check('outbound bar', app.text().includes('proxy'))
  check('overview polled', app.seen.has('/overview') && app.seen.has('/stats'))
  check('server-only nav hidden', !app.text().includes('Clients'))

  console.log('client mode · connections')
  await app.clickNav('connections')
  check('active row', app.text().includes('example.com:443'))
  check('closed row', app.text().includes('closed.test:80'))
  check('tunnel rtt', app.text().includes('23.4 ms'))

  console.log('client mode · routing')
  await app.clickNav('routing')
  check('rule hits', app.text().includes('17'))
  check('proxy group node', app.text().includes('hk-01'))
  check('rule editor tag', app.text().includes('example.com'))
  check('profile card', app.inputValues().includes('kids'))
  // 设备分配的网段在 input 里，textContent 看不到，得读控件值。
  check('device assignment', app.inputValues().includes('192.168.1.30/32'))

  console.log('client mode · logs')
  await app.clickNav('logs')
  check('log line', app.text().includes('started'))
  check('error level styled', !!app.window.document.querySelector('.log-error'))

  console.log('client mode · devices')
  await app.clickNav('devices')
  check('device row', app.text().includes('192.168.1.20'))
  check('outbound options', !!app.window.document.querySelector('.devsel option'))

  console.log('client mode · i18n')
  const langBtn = [...app.window.document.querySelectorAll('.icon-btn')].find(
    (b) => (b.textContent ?? '').trim() === '中',
  )
  langBtn?.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }))
  await tick(80)
  check('switched to zh', app.text().includes('局域网设备'))

  check('no runtime errors (client)', app.errors.length === 0)
  if (app.errors.length) console.log(app.errors.join('\n'))
  app.window.close()
}

// ── server 模式: 客户端管理视图，并确认 client 专属入口被隐藏 ──
{
  const app = boot('server')
  await tick(150)

  console.log('server mode')
  check('brand sub switched', app.text().includes('proxy server'))
  check('client-only nav hidden', !app.text().includes('Routing') && !app.text().includes('Devices'))

  await app.clickNav('clients')
  check('domain row', app.text().includes('example.com'))
  check('client row', app.text().includes('10.1.1.5'))
  check('version badge', app.text().includes('0.10.1'))
  check('block button', app.text().includes('Block client'))
  check('history from recent_closed', app.text().includes('closed.test:80'))

  check('no runtime errors (server)', app.errors.length === 0)
  if (app.errors.length) console.log(app.errors.join('\n'))
  app.window.close()
}

if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
// 轮询的 setInterval 会吊住事件循环，必须显式收摊。
process.exit(0)
