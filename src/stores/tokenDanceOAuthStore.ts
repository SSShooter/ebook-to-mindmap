import { create } from 'zustand'

/**
 * OAuth 授权回跳后「把新 Key 交还给发起页面」的轻量通道。
 *
 * 授权流程会触发一次整页跳转（去 TokenDance 授权页、再回跳本应用），
 * 期间组件本地状态会丢失。因此：
 * - 发起侧（模型配置弹窗）把编辑目标写进 sessionStorage（tokenDanceAuthIntent），
 * - 全局桥接组件在回跳页完成 code 交换后，把 (key + 目标) 放进本 store，
 * - 模型管理页读取本 store 并真正写入目标模型 / 用草稿重开弹窗。
 */
export interface OAuthAuthTarget {
  /** 编辑既有模型时：目标模型的 id */
  editingModelId?: string
  /** 新建模型时：授权前的完整草稿（不含 apiKey），用于回跳后重开弹窗 */
  draft?: {
    name: string
    provider: string
    apiKey: string
    apiUrl: string
    model: string
  }
}

interface TokenDanceOAuthState {
  /** 授权回跳待消费的结果；消费后置空 */
  pendingResult: { key: string; target: OAuthAuthTarget } | null
  /** 回跳过程发生的错误（例如交换失败），供页面展示 */
  pendingError: { code: string; message: string } | null
  publishResult: (result: { key: string; target: OAuthAuthTarget }) => void
  publishError: (error: { code: string; message: string }) => void
  consumeResult: () => { key: string; target: OAuthAuthTarget } | null
  consumeError: () => { code: string; message: string } | null
}

export const useTokenDanceOAuthStore = create<TokenDanceOAuthState>()(
  (set, get) => ({
    pendingResult: null,
    pendingError: null,
    publishResult: (result) => set({ pendingResult: result, pendingError: null }),
    publishError: (error) => set({ pendingError: error }),
    consumeResult: () => {
      const value = get().pendingResult
      if (value) set({ pendingResult: null })
      return value
    },
    consumeError: () => {
      const value = get().pendingError
      if (value) set({ pendingError: null })
      return value
    },
  })
)

/** sessionStorage：授权发起时暂存「编辑目标」，用于整页跳转回跳后恢复 */
const AUTH_INTENT_KEY = 'tokendance.authIntent'

export function stashOAuthIntent(target: OAuthAuthTarget): void {
  sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(target))
}

export function takeOAuthIntent(): OAuthAuthTarget | null {
  try {
    const raw = sessionStorage.getItem(AUTH_INTENT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(AUTH_INTENT_KEY)
    return JSON.parse(raw) as OAuthAuthTarget
  } catch {
    return null
  }
}
