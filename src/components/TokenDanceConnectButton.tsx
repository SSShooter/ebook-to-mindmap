import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { isTauri } from '@tauri-apps/api/core'
import { KeyRound, ExternalLink, Loader2 } from 'lucide-react'
import { useTokenDanceConnect } from '@/hooks/useTokenDanceConnect'
import type { OAuthAuthTarget } from '@/stores/tokenDanceOAuthStore'

interface TokenDanceConnectButtonProps {
  /** 授权完成后要把新 Key 写入的模型目标 */
  target: OAuthAuthTarget
  /** 是否已有 Key（决定按钮文案是「连接」还是「重新授权」） */
  hasKey?: boolean
  disabled?: boolean
  className?: string
}

/**
 * 「连接 / 重新授权 TokenDance 账号」按钮。
 * 点击后发起 PKCE 授权；回跳后 TokenDanceOAuthBridge 负责换 Key，
 * 模型管理页消费 store 结果把 Key 写入 target 指定的模型。
 */
export function TokenDanceConnectButton({
  target,
  hasKey = false,
  disabled = false,
  className,
}: TokenDanceConnectButtonProps) {
  const { t } = useTranslation()
  const { startConnect } = useTokenDanceConnect()
  const [starting, setStarting] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const handleClick = async () => {
    setStarting(true)
    setNote(null)
    try {
      const navigatedAway = await startConnect(target)
      if (navigatedAway) {
        // 网页版整页跳转，无需额外提示
        return
      }
      // Tauri 打包态：已用系统浏览器打开授权页
      setNote(t('tokendance.oauth.openInBrowser'))
    } catch {
      setNote(t('tokendance.oauth.exchangeFailed', { reason: 'start' }))
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant={hasKey ? 'outline' : 'default'}
        size="sm"
        onClick={() => void handleClick()}
        disabled={disabled || starting}
        className={`gap-1.5 ${className ?? ''}`}>
        {starting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : hasKey ? (
          <KeyRound className="h-3.5 w-3.5" />
        ) : (
          <KeyRound className="h-3.5 w-3.5" />
        )}
        {hasKey ? t('tokendance.oauth.reauthorize') : t('tokendance.oauth.connect')}
        {isTauri() && !starting && (
          <ExternalLink className="h-3 w-3 opacity-70" />
        )}
      </Button>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}
