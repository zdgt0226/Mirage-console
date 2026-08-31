import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // dev 时把 /api/v1 转发到后端，避免跨源与 CORS 配置。
  // 用法: MIRAGE_DEV_API=https://gw.example.com:9090 npm run dev
  const target = env.MIRAGE_DEV_API

  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: target
        ? {
            '/api/v1': {
              target,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
    },
  }
})
