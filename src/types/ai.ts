/**
 * AI Provider Types
 * 统一的 AI 提供商类型定义，避免在多个文件中重复定义
 */

export const AI_PROVIDERS = [
  'gemini',
  'openai',
  'openai-responses',
  'ollama',
  '302.ai',
  'openrouter',
  'tokendance',
] as const

export type AIProvider = (typeof AI_PROVIDERS)[number]

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  apiUrl?: string
  model?: string
}

/**
 * TokenDance 应用归因的 App URL（应用唯一标识，全站保持一致、勿随意变更）
 *
 * - 模型请求携带 X-App-URL 头，覆盖 API Key 上继承的 App URL
 * - OAuth 授权时作为 app_url 参数写入新建的 API Key，后续调用自动继承
 * 文档：https://tokendance.space/docs/app-attribution
 */
export const TOKENDANCE_APP_URL =
  'https://ebook2me-next.mind-elixir.com'

/**
 * TokenDance 应用展示名称
 * OAuth 授权时作为 key_name 参数传给授权页，用于 Key 命名与授权页中的应用展示名称
 */
export const TOKENDANCE_APP_NAME = '电子书转思维导图'

/**
 * Provider Configuration
 * 每个 AI 提供商的默认配置
 */
export interface ProviderConfig {
  defaultApiUrl: string
  websiteUrl: string
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  gemini: {
    defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    websiteUrl: 'https://aistudio.google.com/',
  },
  openai: {
    defaultApiUrl: 'https://api.openai.com/v1',
    websiteUrl: 'https://platform.openai.com/',
  },
  'openai-responses': {
    defaultApiUrl: 'https://api.openai.com/v1',
    websiteUrl: 'https://platform.openai.com/docs/api-reference/responses',
  },
  ollama: {
    defaultApiUrl: 'http://localhost:11434/v1',
    websiteUrl: 'https://ollama.com/',
  },
  '302.ai': {
    defaultApiUrl: 'https://api.302.ai/v1',
    websiteUrl: 'https://share.302.ai/BJ7iSL',
  },
  openrouter: {
    defaultApiUrl: 'https://openrouter.ai/api/v1',
    websiteUrl: 'https://openrouter.ai/',
  },
  // TokenDance（词元跳动）多模型网关，兼容 OpenAI Chat Completions 协议
  tokendance: {
    defaultApiUrl: 'https://tokendance.space/gateway/v1',
    websiteUrl: 'https://tokendance.space/',
  },
}
