import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import httpProxy from 'http-proxy'
// import react from '@vitejs/plugin-react-swc'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

const host = process.env.TAURI_DEV_HOST

function corsProxyPlugin(): Plugin {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      const proxy = httpProxy.createProxyServer({})

      proxy.on('error', (err, _req, res) => {
        console.error('Proxy error:', err)
        if ('writeHead' in res && typeof res.writeHead === 'function') {
          res.writeHead(502, { 'Content-Type': 'text/plain' })
          res.end('Proxy error: ' + err.message)
        }
      })

      server.middlewares.use('/api/proxy', (req, res) => {
        const targetUrl = req.headers['x-target-url'] as string | undefined

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Missing x-target-url header')
          return
        }

        try {
          const url = new URL(targetUrl)

          // Connect strips /api/proxy prefix, so req.url already has the rest of the path
          // e.g., request to /api/proxy/v1/chat/completions → req.url = /v1/chat/completions
          // We just proxy it as-is to the target origin

          // Remove the custom header so it doesn't get forwarded
          delete req.headers['x-target-url']

          proxy.web(req, res, {
            target: url.origin,
            changeOrigin: true,
          })
        } catch (e) {
          console.error('Invalid target URL:', targetUrl, e)
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Invalid target URL: ' + targetUrl)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Prevent Vite from clearing the terminal so Rust errors stay visible (Tauri)
  clearScreen: false,
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    corsProxyPlugin(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Env variables starting with these prefixes are exposed to the frontend
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  server: {
    // Tauri expects a fixed port; fail if unavailable
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Ignore Rust project to avoid unnecessary reloads
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    // Only apply Tauri-specific targets when building via `tauri build`
    ...(process.env.TAURI_ENV_PLATFORM
      ? {
          // Tauri uses Chromium on Windows and WebKit on macOS/Linux
          target:
            process.env.TAURI_ENV_PLATFORM === 'windows'
              ? 'chrome105'
              : 'safari13',
          // Don't minify for debug builds
          minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
          // Produce sourcemaps for debug builds
          sourcemap: !!process.env.TAURI_ENV_DEBUG,
        }
      : {}),
  },
})
