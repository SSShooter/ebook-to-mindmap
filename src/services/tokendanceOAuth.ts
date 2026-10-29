import { TOKENDANCE_APP_NAME, TOKENDANCE_APP_URL } from '../types/ai'
import { appFetch } from '@/lib/fetch'
import { TokenDanceError } from './tokendanceWallet'

/**
 * TokenDance「OAuth 式 API Key 授权」客户端（Authorization Code + PKCE/S256）
 *
 * 让用户无需进入 TokenDance 控制台手动复制 Key —— 跳转授权页登录确认后，
 * TokenDance 把新创建的 API Key 一次性交还给我们，全程不落地原始 Key 到浏览器地址栏。
 *
 * 文档：https://tokendance.space/docs/api-key-oauth
 */

const AUTH_BASE_URL = 'https://tokendance.space'
const EXCHANGE_ENDPOINT = `${AUTH_BASE_URL}/portal/api/v1/auth/keys`

/** 授权页地址前缀 */
export const TOKENDANCE_AUTH_URL = `${AUTH_BASE_URL}/auth`

/** PKCE verifier 允许的字符集（RFC 7636） */
const VERIFIER_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

// verifier 长度须在 43–128 之间，这里生成 64 字符已满足

/** 待授权流程在 sessionStorage 里的 key 前缀 */
const PENDING_PREFIX = 'tokendance.pending.'

/** sessionStorage 中挂起流程的字段结构 */
interface PendingAuth {
  /** 授权完成回调里带上、用于回读本流程的透明标识 */
  state: string
  /** 生成 challenge 后必须只保存在本客户端的原始 verifier */
  codeVerifier: string
  /** 用于把换来的 Key 填回到发起处（例如正在编辑的模型弹窗） */
  returnKey?: string
  createdAt: number
}

/** 生成一个 URL 安全的随机字符串，用作 code_verifier 或流程标识 */
function randomToken(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += VERIFIER_CHARSET[bytes[i] % VERIFIER_CHARSET.length]
  }
  return out
}

/** 把 Base64 编码后的摘要转成 URL 安全的 base64url（去掉补位 =） */
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface PkcePair {
  verifier: string
  challenge: string
}

/**
 * 生成 PKCE 需要的 (code_verifier, code_challenge[S256]) 对。
 * verifier 必须 43–128 个 [A-Za-z0-9-._~]，只应保存在发起授权的客户端本地。
 */
export async function generatePkcePair(): Promise<PkcePair> {
  const verifier = randomToken(64)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  )
  const challenge = toBase64Url(
    btoa(String.fromCharCode(...new Uint8Array(digest)))
  )
  return { verifier, challenge }
}

export interface BuildAuthorizeUrlOptions {
  /** 授权完成后的回调地址（返回时 TokenDance 会追加 ?code=...） */
  callbackUrl: string
  /** 可选：同一次授权中的透明流程标识；callback 模式允许为空 */
  state?: string
  /** 可选：覆盖默认 app_url / key_name */
  appUrl?: string
  keyName?: string
}

/**
 * 组装授权页 URL（Authorization Code + S256 PKCE）。
 *
 * 授权完成后 TokenDance 会「保留 callback_url 中已有的路径与查询参数，再追加 code」，
 * 因此不透明流程标识 state 应放进 callback_url 自身的查询串里才能可靠地随回调往返，
 * 而不是作为 /auth 的顶层参数（文档没有保证顶层 state 会被转发）。
 *
 * app_url 会写入新 Key 并自动继承到后续调用；单次请求仍可由 X-App-URL 覆盖。
 */
export async function buildTokenDanceAuthorizeUrl({
  callbackUrl,
  state,
  appUrl = TOKENDANCE_APP_URL,
  keyName = TOKENDANCE_APP_NAME,
}: BuildAuthorizeUrlOptions): Promise<{
  url: string
  state: string
  verifier: string
}> {
  const { verifier, challenge } = await generatePkcePair()
  const flowState = state ?? randomToken(24)

  // 把 state 并进 callback_url 的查询串
  const cb = new URL(callbackUrl, window.location.origin)
  cb.searchParams.set('state', flowState)

  const params = new URLSearchParams({
    callback_url: cb.toString(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    app_url: appUrl,
    key_name: keyName,
  })

  return {
    url: `${TOKENDANCE_AUTH_URL}?${params.toString()}`,
    state: flowState,
    verifier,
  }
}

/**
 * 在发起授权前把 (state, verifier) 暂存进 sessionStorage。
 * 这样授权完成回跳页面后能凭 state 找回本次流程对应的 verifier 去交换 Key，
 * 也能凭 returnKey 把新 Key 填回发起处。
 */
export function stashPendingAuth(
  state: string,
  verifier: string,
  returnKey?: string
): void {
  const pending: PendingAuth = {
    state,
    codeVerifier: verifier,
    ...(returnKey ? { returnKey } : {}),
    createdAt: Date.now(),
  }
  sessionStorage.setItem(`${PENDING_PREFIX}${state}`, JSON.stringify(pending))
}

/** 取出并移除指定 state 对应的挂起流程 */
export function takePendingAuth(state: string): PendingAuth | null {
  try {
    const raw = sessionStorage.getItem(`${PENDING_PREFIX}${state}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingAuth
    sessionStorage.removeItem(`${PENDING_PREFIX}${state}`)
    return parsed
  } catch {
    return null
  }
}

/**
 * 用授权码换 Key。
 * 成功响应：{ "key": "..." }；完整 Key 只在首次成功交换中出现，正确交换后 code 立即失效。
 * POST https://tokendance.space/portal/api/v1/auth/keys
 */
export async function exchangeTokenDanceCode(
  code: string,
  codeVerifier: string
): Promise<string> {
  let response: Response
  try {
    response = await appFetch(EXCHANGE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        code_challenge_method: 'S256',
      }),
    })
  } catch (error) {
    throw new TokenDanceError(
      'network_error',
      error instanceof Error ? error.message : String(error)
    )
  }

  if (!response.ok) {
    let code: TokenDanceError['code'] = 'unknown'
    let message = `HTTP ${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      const raw = body?.error?.code
      if (raw === 'invalid_request') code = 'invalid_request'
      if (raw === 'unauthorized') code = 'unauthorized'
      if (raw === 'forbidden') code = 'forbidden'
      if (raw === 'internal_error') code = 'internal_error'
      if (typeof body?.error?.message === 'string' && body.error.message) {
        message = body.error.message
      }
    } catch {
      // 非 JSON 时沿用默认描述
    }
    throw new TokenDanceError(code, message, response.status)
  }

  const data = await response.json()
  if (typeof data?.key !== 'string' || !data.key) {
    throw new TokenDanceError(
      'unknown',
      '授权交换响应缺少 key，完整 Key 无法再次获取，需重新授权'
    )
  }
  return data.key
}
