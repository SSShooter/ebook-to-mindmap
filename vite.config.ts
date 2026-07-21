import { defineConfig } from 'vite'
import path from 'path'
// import react from '@vitejs/plugin-react-swc'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

const host = process.env.TAURI_DEV_HOST

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
