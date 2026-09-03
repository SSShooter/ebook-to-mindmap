import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  exchangeTokenDanceCode,
  takePendingAuth,
} from '@/services/tokendanceOAuth'
import {
  takeOAuthIntent,
  useTokenDanceOAuthStore,
} from '@/stores/tokenDanceOAuthStore'
import { TokenDanceError } from '@/services/tokendanceWallet'

/**
 * TokenDance OAuth 回跳桥接组件（挂在 App 根部，始终监听）。
 *
 * 授权完成后 TokenDance 会回跳到本应用并追加 ?oauth=tokenDance&state=...&code=...，
 * 这里完成最后一步：
 *  1) 凭 state 从 sessionStorage 找回发起时保存的 code_verifier（PKCE 保护交换）；
 *  2) 用 code + verifier 到 portal 交换出新 Key；
 *  3) 把「Key + 编辑目标」发布到全局 store，模型管理页消费后写入目标模型；
 *  4) 清理 URL 上的临时查询参数，避免 code 长期留在地址栏、也避免重复触发。
 */
export function TokenDanceOAuthBridge() {
  const { t } = useTranslation()
  const publishResult = useTokenDanceOAuthStore((s) => s.publishResult)
  const publishError = useTokenDanceOAuthStore((s) => s.publishError)
  // React StrictMode 会双执行 effect，用 ref 保证同一次回调只处理一次
  const handledRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('oauth') !== 'tokenDance') return
    if (handledRef.current) return
    handledRef.current = true

    const code = params.get('code')
    const state = params.get('state')

    // 从地址栏拿掉本次回调参数（保留其它业务参数），code 只在交换前短暂存在于 URL
    const clean = new URLSearchParams(params)
    clean.delete('oauth')
    clean.delete('code')
    clean.delete('state')
    const qs = clean.toString()
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', next)

    const finish = async () => {
      const pending = state ? takePendingAuth(state) : null

      if (!code || !pending) {
        const msg = t('tokendance.oauth.exchangeFailed', {
          reason: code
            ? t('tokendance.oauth.sessionLost')
            : t('tokendance.oauth.missingCode'),
        })
        publishError({ code: 'invalid_request', message: msg })
        toast.error(msg)
        return
      }

      try {
        const key = await exchangeTokenDanceCode(code, pending.codeVerifier)
        const target = takeOAuthIntent() ?? {}
        publishResult({ key, target })
        toast.success(t('tokendance.oauth.connected'))
      } catch (error) {
        const msg =
          error instanceof TokenDanceError
            ? t(`tokendance.error.${error.code}`)
            : error instanceof Error
              ? error.message
              : t('tokendance.oauth.exchangeFailed', {
                  reason: String(error),
                })
        publishError({ code: 'unauthorized', message: msg })
        toast.error(msg)
      }
    }

    void finish()
  }, [publishResult, publishError, t])

  return null
}
