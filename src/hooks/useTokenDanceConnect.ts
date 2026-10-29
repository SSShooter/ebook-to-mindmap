import { useCallback } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import {
  buildTokenDanceAuthorizeUrl,
  stashPendingAuth,
} from '@/services/tokendanceOAuth'
import {
  stashOAuthIntent,
  type OAuthAuthTarget,
} from '@/stores/tokenDanceOAuthStore'

/**
 * 发起一次 TokenDance OAuth 授权（Authorization Code + PKCE/S256）。
 *
 * 步骤：
 *  1) 生成 code_verifier / S256 challenge，把 verifier 按 state 暂存（仅存本客户端）；
 *  2) 把「授权完成后的 Key 要写进哪个目标」暂存，整页跳转期间不会丢；
 *  3) 跳转到 TokenDance /auth 授权页；用户确认后 TokenDance 追加 ?code=... 回跳，
 *     由全局 TokenDanceOAuthBridge 完成 code 交换并把新 Key 交还给模型管理页。
 *
 * callback 指向「当前运行实例的根路径 + 查询参数 oauth=tokenDance」——
 * 因为 verifier 与要写入的模型都存在当前实例本地，回调必须落在同一实例才能闭环。
 * 因此本能力面向 http(s) 托管的网页版（含 localhost 开发态）；若在 Tauri 打包态
 * （origin 为 tauri:// 无法被外部回跳），会改为用系统浏览器打开授权页（不整页跳走）。
 */
export function useTokenDanceConnect() {
  const startConnect = useCallback(
    async (target: OAuthAuthTarget): Promise<boolean> => {
      const origin = window.location.origin
      const path = window.location.pathname || '/'
      const callbackUrl = `${origin}${path}?oauth=tokenDance`

      // 组装授权 URL（同时生成 verifier + state）
      const { url, state, verifier } = await buildTokenDanceAuthorizeUrl({
        callbackUrl,
      })

      // 暂存 verifier（凭 state 在回跳时找回）与写入目标
      stashPendingAuth(state, verifier)
      stashOAuthIntent(target)

      if (isTauri()) {
        // Tauri 打包态：tokenDance 授权无法回跳到 tauri:// 本机，
        // 交给系统浏览器打开授权页（用户需在网页版/开发态完成或改用其它方式）。
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl(url)
        return false
      }

      window.location.assign(url)
      return true
    },
    []
  )

  return { startConnect }
}
