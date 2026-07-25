import { isTauri } from '@tauri-apps/api/core'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

/**
 * 统一的 fetch 封装：
 * - Tauri 桌面端使用 @tauri-apps/plugin-http 的 fetch（走原生请求，绕过 webview CORS 限制）
 * - 网页版回退到浏览器原生 fetch
 */
export const appFetch: typeof globalThis.fetch = (input, init) =>
  isTauri() ? tauriFetch(input, init) : globalThis.fetch(input, init)
