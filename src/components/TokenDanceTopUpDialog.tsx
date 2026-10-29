import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, ExternalLink, Copy, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { openExternalUrl } from '@/lib/openExternal'
import {
  TokenDanceError,
  TOP_UP_MAX_AMOUNT,
  TOP_UP_MIN_AMOUNT,
  createTopUpSession,
  fetchTopUpSession,
  type TopUpSession,
} from '@/services/tokendanceWallet'

const PRESET_AMOUNTS = [10, 30, 50, 100]

/** 支付状态轮询间隔，文档建议 3 秒 */
const POLL_INTERVAL_MS = 3000

interface TokenDanceTopUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  /** 充值到账回调，用于刷新余额 */
  onPaid?: () => void
}

export function TokenDanceTopUpDialog({
  open,
  onOpenChange,
  apiKey,
  onPaid,
}: TokenDanceTopUpDialogProps) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState<string>('10')
  const [session, setSession] = useState<TopUpSession | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  // 移动端只支持支付宝，且不应展示 payment_url —— 它是聚合码的二维码内容，不是移动网页跳转地址
  const [isMobile] = useState(() =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  )
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const onPaidRef = useRef(onPaid)
  const sessionIdRef = useRef<string | null>(null)
  // 轮询时从 ref 读取最新会话，避免把 session 对象放进 effect 依赖导致每次轮询都重建定时器
  const sessionRef = useRef<TopUpSession | null>(null)

  useEffect(() => {
    onPaidRef.current = onPaid
  }, [onPaid])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const resetState = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    abortRef.current?.abort()
    abortRef.current = null
    sessionIdRef.current = null
    setSession(null)
    setQrDataUrl(null)
    setIsPolling(false)
    setIsPaid(false)
    setIsFailed(false)
    setIsExpired(false)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    abortRef.current?.abort()
    abortRef.current = null
    setIsPolling(false)
  }, [])

  // 会话创建成功后轮询状态，直到支付成功、失败或过期
  useEffect(() => {
    if (!open || !session || session.status !== 'pending') return

    const controller = new AbortController()
    abortRef.current = controller
    setIsPolling(true)

    const tick = async () => {
      const current = sessionRef.current
      if (!current) return

      // 超过 expired_at 后停止轮询
      if (current.expiredAt && Date.now() / 1000 > current.expiredAt) {
        setIsExpired(true)
        setIsPolling(false)
        stopPolling()
        return
      }

      try {
        const updated = await fetchTopUpSession(
          apiKey,
          current.statusUrl,
          controller.signal
        )
        setSession(updated)

        if (updated.status === 'paid') {
          setIsPaid(true)
          setIsPolling(false)
          stopPolling()
          toast.success(t('tokendance.paymentPaid'))
          onPaidRef.current?.()
          return
        }

        if (
          updated.status === 'failed' ||
          updated.status === 'closed' ||
          updated.status === 'refunded'
        ) {
          setIsFailed(true)
          setIsPolling(false)
          stopPolling()
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        // 轮询过程中的偶发网络错误不中断，等下一轮继续
        console.warn('Failed to poll payment status:', error)
      }
    }

    pollTimerRef.current = setInterval(tick, POLL_INTERVAL_MS)
    void tick()

    return stopPolling
    // 这里刻意不依赖 session 对象：每次轮询 setSession 都会产生新对象，
    // 若放进依赖会导致定时器被反复重建、tick 被立即重入从而形成死循环。
    // 会话数据改由 sessionRef 读取，只依赖 id / status 两个原始值来控制启停。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.id, session?.status, apiKey, stopPolling])

  // PC 端把 payment_url 渲染成二维码供扫码支付；qrcode 体积不小，按需动态引入
  useEffect(() => {
    if (isMobile || !session?.paymentUrl) {
      setQrDataUrl(null)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const dataUrl = await QRCode.toDataURL(session.paymentUrl, {
          width: 220,
          margin: 1,
        })
        if (!cancelled) setQrDataUrl(dataUrl)
      } catch (error) {
        console.warn('Failed to generate payment QR code:', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isMobile, session?.paymentUrl])

  const handleCreateSession = async () => {
    const parsed = Number(amount)

    if (
      !Number.isInteger(parsed) ||
      parsed < TOP_UP_MIN_AMOUNT ||
      parsed > TOP_UP_MAX_AMOUNT
    ) {
      toast.error(t('tokendance.invalidAmount'))
      return
    }

    if (!apiKey.trim()) {
      toast.error(t('tokendance.noKey'))
      return
    }

    setIsCreating(true)
    setIsPaid(false)
    setIsFailed(false)
    setIsExpired(false)
    try {
      const created = await createTopUpSession(apiKey.trim(), parsed)
      sessionIdRef.current = created.id
      setSession(created)
    } catch (error) {
      toast.error(
        error instanceof TokenDanceError
          ? t(`tokendance.error.${error.code}`)
          : t('tokendance.redeemFailed')
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyLink = async () => {
    if (!session?.paymentUrl) return
    try {
      await navigator.clipboard.writeText(session.paymentUrl)
      toast.success(t('tokendance.linkCopied'))
    } catch {
      toast.error(t('tokendance.redeemFailed'))
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetState()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tokendance.topUpTitle')}</DialogTitle>
          <DialogDescription>
            {t('tokendance.topUpDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!session ? (
            <div className="space-y-2">
              <Label htmlFor="tokendance-topup-amount">
                {t('tokendance.amount')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={
                      Number(amount) === preset ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setAmount(String(preset))}>
                    ¥{preset}
                  </Button>
                ))}
              </div>
              <Input
                id="tokendance-topup-amount"
                type="number"
                min={TOP_UP_MIN_AMOUNT}
                max={TOP_UP_MAX_AMOUNT}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('tokendance.amountPlaceholder')}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t('tokendance.amount')}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  ¥{session.amount}
                </p>
              </div>

              {/* PC：payment_url 是聚合码内容，渲染成二维码扫码支付 */}
              {!isMobile && (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-52 w-52 flex items-center justify-center rounded-lg border border-border bg-white p-2">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={t('tokendance.scanToPay')}
                        className="h-full w-full"
                      />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('tokendance.scanToPay')}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {/* 移动端仅支持支付宝，且必须由用户点击唤起，不在创建会话后自动跳转 */}
                {isMobile ? (
                  session.alipayUrl ? (
                    <Button
                      type="button"
                      onClick={() => void openExternalUrl(session.alipayUrl!)}
                      className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {t('tokendance.payWithAlipay')}
                    </Button>
                  ) : (
                    <p className="text-xs text-destructive">
                      {t('tokendance.mobileAlipayMissing')}
                    </p>
                  )
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void openExternalUrl(session.paymentUrl)}
                      className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {t('tokendance.openPaymentPage')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleCopyLink()}
                      className="gap-2">
                      <Copy className="h-3.5 w-3.5" />
                      {t('tokendance.copyPaymentLink')}
                    </Button>
                  </>
                )}
              </div>

              <div className="text-sm">
                {isPaid && (
                  <p className="flex items-center gap-1.5 text-green-600 dark:text-green-500 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('tokendance.paymentPaid')}
                  </p>
                )}
                {isFailed && (
                  <p className="text-destructive">
                    {t('tokendance.paymentFailed')}
                  </p>
                )}
                {isExpired && (
                  <p className="text-destructive">
                    {t('tokendance.paymentExpired')}
                  </p>
                )}
                {isPolling && !isPaid && !isFailed && !isExpired && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('tokendance.waitingPayment')}
                  </p>
                )}
              </div>

              {!isPolling && !isPaid && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    resetState()
                  }}>
                  {t('tokendance.retry')}
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                {t('tokendance.paymentHint')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t('common.cancel')}
          </Button>
          {!session && (
            <Button
              onClick={() => void handleCreateSession()}
              disabled={isCreating || !amount}>
              {isCreating && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              {isCreating
                ? t('tokendance.creating')
                : t('tokendance.createOrder')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
