import { appFetch } from '@/lib/fetch'

/**
 * TokenDance 钱包 / 开放平台 API 客户端
 *
 * 开放平台接口与模型调用共用同一个 API Key，通过 Authorization: Bearer 认证。
 * 文档：https://tokendance.space/docs/open-api.md
 */

const PORTAL_BASE_URL = 'https://tokendance.space/portal/api/v1'

/**
 * TokenDance 所有额度字段的单位都是「微元」，1 元 = 1,000,000 微元。
 * 接口返回的是整数微元，展示前需要换算成元。
 */
export const MICRO_PER_CNY = 1_000_000

export interface TokenDanceBalance {
  /** 总额度（充值获得） */
  credits: number
  /** 已消耗额度 */
  creditsUsed: number
  /** 剩余可用额度（credits - credits_used） */
  balance: number
}

/** 开放平台接口统一错误码，见文档「错误处理」小节 */
export type TokenDanceErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'forbidden'
  | 'internal_error'
  | 'network_error'
  | 'unknown'

export class TokenDanceError extends Error {
  code: TokenDanceErrorCode
  status?: number

  constructor(code: TokenDanceErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'TokenDanceError'
    this.code = code
    this.status = status
  }
}

function isTokenDanceErrorCode(value: unknown): value is TokenDanceErrorCode {
  return (
    value === 'invalid_request' ||
    value === 'unauthorized' ||
    value === 'forbidden' ||
    value === 'internal_error'
  )
}

/**
 * 调用失败时 TokenDance 会在响应头里给出明确的恢复路径，只有能判断时才会携带该字段。
 * 文档：https://tokendance.space/docs/api-key-oauth#recover-key
 */
export type TokenDanceRecoveryAction =
  | 'top_up_balance'
  | 'reauthorize_api_key'
  | 'api_key_quota'

const RECOVERY_ACTION_HEADER = 'TokenDance-Recovery-Action'

const RECOVERY_ACTIONS: readonly TokenDanceRecoveryAction[] = [
  'top_up_balance',
  'reauthorize_api_key',
  'api_key_quota',
]

function isRecoveryAction(value: string): value is TokenDanceRecoveryAction {
  return (RECOVERY_ACTIONS as readonly string[]).includes(value)
}

/** 从响应头读取恢复动作，缺失或无法识别时返回 null，调用方按原有错误信息处理 */
export function parseRecoveryAction(
  response: Response
): TokenDanceRecoveryAction | null {
  try {
    const raw = response.headers?.get?.(RECOVERY_ACTION_HEADER)
    if (!raw) return null
    const action = raw.trim().toLowerCase()
    return isRecoveryAction(action) ? action : null
  } catch {
    // 某些运行时可能不允许读取该响应头
    return null
  }
}

/** 模型调用失败但 TokenDance 已给出明确恢复路径时抛出 */
export class TokenDanceRecoveryError extends Error {
  action: TokenDanceRecoveryAction

  constructor(action: TokenDanceRecoveryAction, message: string) {
    super(message)
    this.name = 'TokenDanceRecoveryError'
    this.action = action
  }
}

/**
 * 解析开放平台接口的错误响应，统一抛成 TokenDanceError
 * 响应格式：{ "error": { "code": "...", "message": "..." } }
 */
async function throwApiError(response: Response): Promise<never> {
  let code: TokenDanceErrorCode = 'unknown'
  let message = `HTTP ${response.status} ${response.statusText}`

  try {
    const body = await response.json()
    const rawCode = body?.error?.code
    if (isTokenDanceErrorCode(rawCode)) code = rawCode
    if (typeof body?.error?.message === 'string' && body.error.message) {
      message = body.error.message
    }
  } catch {
    // 响应体不是 JSON 时沿用默认描述
  }

  throw new TokenDanceError(code, message, response.status)
}

/**
 * 查询当前 API Key 所属账户的余额
 * GET /portal/api/v1/user/balance
 */
export async function fetchTokenDanceBalance(
  apiKey: string,
  signal?: AbortSignal
): Promise<TokenDanceBalance> {
  let response: Response

  try {
    response = await appFetch(`${PORTAL_BASE_URL}/user/balance`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new TokenDanceError(
      'network_error',
      error instanceof Error ? error.message : String(error)
    )
  }

  if (!response.ok) {
    await throwApiError(response)
  }

  const data = await response.json()
  const raw = data?.balance

  if (typeof raw?.balance !== 'number') {
    throw new TokenDanceError('unknown', 'Unexpected balance response')
  }

  return {
    credits: Number(raw.credits) || 0,
    creditsUsed: Number(raw.credits_used) || 0,
    balance: Number(raw.balance) || 0,
  }
}

/**
 * 使用兑换码为账户增加额度，返回本次兑换获得的额度（微元）
 * POST /portal/api/v1/redemption/redeem
 */
export async function redeemTokenDanceCode(
  apiKey: string,
  code: string
): Promise<number> {
  let response: Response

  try {
    response = await appFetch(`${PORTAL_BASE_URL}/redemption/redeem`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    })
  } catch (error) {
    throw new TokenDanceError(
      'network_error',
      error instanceof Error ? error.message : String(error)
    )
  }

  if (!response.ok) {
    await throwApiError(response)
  }

  const data = await response.json()

  if (typeof data?.credits !== 'number') {
    throw new TokenDanceError('unknown', 'Unexpected redemption response')
  }

  return data.credits
}

/** 单笔充值金额下限（元） */
export const TOP_UP_MIN_AMOUNT = 1
/** 单笔充值金额上限（元） */
export const TOP_UP_MAX_AMOUNT = 100_000

export type TopUpSessionStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'closed'
  | 'refunded'

export interface TopUpSession {
  id: string
  /** 充值金额，单位元 */
  amount: number
  status: TopUpSessionStatus
  /** 聚合码内容，PC 端用于渲染二维码，移动端不要展示 */
  paymentUrl: string
  /** 支付宝 App 深链，移动端唤起支付宝用，可能缺失 */
  alipayUrl?: string
  /** 查询支付结果的完整 URL */
  statusUrl: string
  /** 会话过期时间，Unix 秒 */
  expiredAt: number
  createdAt: number
  paidAt?: number
}

function normalizeTopUpSession(raw: Record<string, unknown>): TopUpSession {
  const status = String(raw.status ?? 'pending') as TopUpSessionStatus

  return {
    id: String(raw.id ?? ''),
    amount: Number(raw.amount) || 0,
    status,
    paymentUrl: String(raw.payment_url ?? ''),
    alipayUrl:
      typeof raw.alipay_url === 'string' && raw.alipay_url
        ? raw.alipay_url
        : undefined,
    statusUrl: String(raw.status_url ?? ''),
    expiredAt: Number(raw.expired_at) || 0,
    createdAt: Number(raw.created_at) || 0,
    paidAt: typeof raw.paid_at === 'number' ? raw.paid_at : undefined,
  }
}

/**
 * 创建充值会话
 * POST /portal/api/v1/payment/sessions
 * amount 是以元为单位的整数，最低 1 元、最高 10 万元，不支持小数
 */
export async function createTopUpSession(
  apiKey: string,
  amount: number
): Promise<TopUpSession> {
  let response: Response

  try {
    response = await appFetch(`${PORTAL_BASE_URL}/payment/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    })
  } catch (error) {
    throw new TokenDanceError(
      'network_error',
      error instanceof Error ? error.message : String(error)
    )
  }

  if (!response.ok) {
    await throwApiError(response)
  }

  const data = await response.json()

  if (!data?.session?.id) {
    throw new TokenDanceError('unknown', 'Unexpected payment session response')
  }

  return normalizeTopUpSession(data.session)
}

/**
 * 查询充值会话状态
 * 建议每 3 秒查询一次，超过 expired_at 后停止
 */
export async function fetchTopUpSession(
  apiKey: string,
  statusUrl: string,
  signal?: AbortSignal
): Promise<TopUpSession> {
  let response: Response

  try {
    response = await appFetch(statusUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new TokenDanceError(
      'network_error',
      error instanceof Error ? error.message : String(error)
    )
  }

  if (!response.ok) {
    await throwApiError(response)
  }

  const data = await response.json()
  return normalizeTopUpSession(data?.session ?? {})
}

/** 微元换算成元 */
export function microToCny(micro: number): number {
  return micro / MICRO_PER_CNY
}

/**
 * 把微元额度格式化成人民币金额
 * 小额保留 6 位小数（如 ¥0.162811），1 元以上保留 2 位（如 ¥58.00）
 */
export function formatCny(micro: number): string {
  const cny = microToCny(micro)
  return `¥${cny.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: cny >= 1 ? 2 : 6,
  })}`
}
