import { isTauri } from '@tauri-apps/api/core'
import { useAuthStore } from '@/stores/authStore'

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:7001'

const LOGIN_URL = `${baseUrl}/oauth/authme/login/eb2me`

// 桌面端 deep link 回调 scheme，需与 tauri.conf.json 的 plugins.deep-link 配置一致
const DEEP_LINK_SCHEME = 'eb2mm'

/**
 * 发起登录
 * - 网页版：整页跳转到 OAuth 登录页，登录后由后端 redirect 回来
 * - Tauri 桌面版：在系统浏览器打开登录页（?type=desktop 会作为 OAuth state 透传），
 *   后端登录成功后 redirect 到网页版 /desktop-auth 中转页，
 *   由该页面通过 eb2mm://auth?token=xxx 唤醒桌面端
 */
export async function startLogin() {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(`${LOGIN_URL}?type=desktop`)
  } else {
    window.location.href = LOGIN_URL
  }
}

/**
 * 生成唤醒桌面端的 deep link 地址（/desktop-auth 中转页使用）
 */
export function buildDesktopAuthUrl(token: string) {
  return `${DEEP_LINK_SCHEME}://auth?token=${encodeURIComponent(token)}`
}

function handleAuthUrls(urls: string[]) {
  for (const raw of urls) {
    let url: URL
    try {
      url = new URL(raw)
    } catch {
      continue
    }
    if (url.protocol !== `${DEEP_LINK_SCHEME}:`) continue
    const token = url.searchParams.get('token')
    if (token) {
      localStorage.setItem('auth_token', token)
      // connect.ts 的请求拦截器会自动带上 Bearer token
      useAuthStore.getState().fetchUser(true)
    }
  }
}

/**
 * 初始化 deep link 登录回调监听（仅 Tauri 环境生效），app 启动时调用一次
 */
export async function initDeepLinkAuth() {
  if (!isTauri()) return
  const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
  // 处理通过 deep link 冷启动的情况
  const initialUrls = await getCurrent()
  if (initialUrls) {
    handleAuthUrls(initialUrls)
  }
  await onOpenUrl(handleAuthUrls)
}
