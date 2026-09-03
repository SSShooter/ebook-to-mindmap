import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Wallet, RefreshCw, Ticket, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TokenDanceTopUpDialog } from '@/components/TokenDanceTopUpDialog'
import {
  TokenDanceError,
  fetchTokenDanceBalance,
  formatCny,
  redeemTokenDanceCode,
  type TokenDanceBalance,
} from '@/services/tokendanceWallet'

interface TokenDanceWalletProps {
  /** TokenDance API Key，与模型调用使用的是同一个 Key */
  apiKey: string
  /** 紧凑模式，用于内嵌在模型配置弹窗里 */
  compact?: boolean
  className?: string
}

export function TokenDanceWallet({
  apiKey,
  compact = false,
  className,
}: TokenDanceWalletProps) {
  const { t } = useTranslation()
  const [balance, setBalance] = useState<TokenDanceBalance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [isTopUpOpen, setIsTopUpOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const loadBalance = useCallback(async () => {
    const key = apiKey.trim()

    if (!key) {
      setBalance(null)
      setErrorKey(null)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setErrorKey(null)
    try {
      const result = await fetchTokenDanceBalance(key, controller.signal)
      setBalance(result)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setBalance(null)
      setErrorKey(
        error instanceof TokenDanceError
          ? `tokendance.error.${error.code}`
          : 'tokendance.fetchFailed'
      )
    } finally {
      // 只有当前请求仍是最新请求时才结束 loading，避免被旧请求提前关闭
      if (abortRef.current === controller) setIsLoading(false)
    }
  }, [apiKey])

  // 输入 API Key 时做防抖，避免每输入一个字符就请求一次
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBalance()
    }, 400)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [loadBalance])

  const handleRedeem = async () => {
    const code = redeemCode.trim()
    const key = apiKey.trim()

    if (!code) return

    if (!key) {
      toast.error(t('tokendance.noKey'))
      return
    }

    setIsRedeeming(true)
    try {
      const credits = await redeemTokenDanceCode(key, code)
      toast.success(t('tokendance.redeemSuccess', { amount: formatCny(credits) }))
      setRedeemCode('')
      await loadBalance()
    } catch (error) {
      toast.error(
        error instanceof TokenDanceError
          ? t(`tokendance.error.${error.code}`)
          : t('tokendance.redeemFailed')
      )
    } finally {
      setIsRedeeming(false)
    }
  }

  const content = (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {t('tokendance.balance')}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-semibold tabular-nums text-foreground ${
                compact ? 'text-xl' : 'text-3xl'
              }`}>
              {balance ? formatCny(balance.balance) : '--'}
            </span>
            {isLoading && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTopUpOpen(true)}
            disabled={!apiKey.trim()}
            className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            {t('tokendance.topUp')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void loadBalance()}
            disabled={isLoading || !apiKey.trim()}
            title={t('tokendance.refresh')}
            className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {balance && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            {t('tokendance.totalCredits')}:{' '}
            <span className="tabular-nums text-foreground/80">
              {formatCny(balance.credits)}
            </span>
          </span>
          <span>
            {t('tokendance.usedCredits')}:{' '}
            <span className="tabular-nums text-foreground/80">
              {formatCny(balance.creditsUsed)}
            </span>
          </span>
        </div>
      )}

      {!apiKey.trim() && (
        <p className="text-xs text-muted-foreground">{t('tokendance.noKey')}</p>
      )}

      {errorKey && (
        <p className="text-xs text-destructive">{t(errorKey)}</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="tokendance-redeem-code" className="text-xs">
          {t('tokendance.redeemCode')}
        </Label>
        <div className="flex gap-2">
          <Input
            id="tokendance-redeem-code"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleRedeem()
              }
            }}
            placeholder={t('tokendance.redeemCodePlaceholder')}
            disabled={isRedeeming || !apiKey.trim()}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleRedeem()}
            disabled={isRedeeming || !redeemCode.trim() || !apiKey.trim()}
            className="flex-shrink-0 gap-1">
            <Ticket className="h-3.5 w-3.5" />
            {t('tokendance.redeem')}
          </Button>
        </div>
      </div>
    </div>
  )

  const topUpDialog = (
    <TokenDanceTopUpDialog
      open={isTopUpOpen}
      onOpenChange={setIsTopUpOpen}
      apiKey={apiKey}
      onPaid={() => void loadBalance()}
    />
  )

  if (compact) {
    return (
      <div
        className={`rounded-lg border border-border bg-muted/40 p-3 ${className ?? ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {t('tokendance.wallet')}
          </span>
        </div>
        {content}
        {topUpDialog}
      </div>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            {t('tokendance.wallet')}
          </CardTitle>
          <CardDescription>{t('tokendance.walletDescription')}</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
      {topUpDialog}
    </>
  )
}
