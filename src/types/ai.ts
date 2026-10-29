/**
 * AI Provider Types
 * 统一的 AI 提供商类型定义，避免在多个文件中重复定义
 */

import { MODELS_DEV_PROVIDER_MAP } from '../config/ai-providers'
import type { ProviderOption } from '../config/ai-providers'

/**
 * 内置供应商（手工维护，仅保留 models.dev 覆盖不了或需要特殊处理的）：
 *  - openai：通用「OpenAI 兼容」，URL 可编辑，作为任意自定义端点的入口
 *  - openai-responses：OpenAI Responses API 协议变体（流式解析不同）
 *  - tokendance：TokenDance 网关（公开模型目录 + OAuth + 余额体系）
 * 其余供应商（OpenRouter、Google、DeepSeek 等 190+ 家）一律来自 models.dev。
 * 顺序即下拉框中的展示顺序。
 */
export const BUILT_IN_PROVIDERS = [
  'openai',
  'openai-responses',
  'tokendance',
] as const

export type BuiltInProvider = (typeof BUILT_IN_PROVIDERS)[number]

/**
 * 供应商标识：内置供应商 + models.dev 全量 200+ 家。
 * `(string & {})` 保留内置项的编辑器补全，同时容纳 models.dev 新增项与历史持久化数据。
 */
export type AIProvider = BuiltInProvider | (string & {})

/** 内置供应商展示名 */
export const BUILT_IN_PROVIDER_LABELS: Record<BuiltInProvider, string> = {
  openai: 'OpenAI Compatible',
  'openai-responses': 'OpenAI Compatible Responses',
  tokendance: 'TokenDance',
}

/**
 * 历史版本内置、现已改由 models.dev 提供的旧 provider id → 现行 id。
 * 用于兼容 localStorage 中已持久化的模型配置。
 */
const LEGACY_PROVIDER_ALIASES: Record<string, string> = {
  gemini: 'google',
  '302.ai': '302ai',
}

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

export const PROVIDER_CONFIGS: Record<BuiltInProvider, ProviderConfig> = {
  openai: {
    defaultApiUrl: 'https://api.openai.com/v1',
    websiteUrl: 'https://platform.openai.com/',
  },
  'openai-responses': {
    defaultApiUrl: 'https://api.openai.com/v1',
    websiteUrl: 'https://platform.openai.com/docs/api-reference/responses',
  },
  // TokenDance（词元跳动）多模型网关，兼容 OpenAI Chat Completions 协议
  tokendance: {
    defaultApiUrl: 'https://tokendance.space/gateway/v1',
    websiteUrl: 'https://tokendance.space/',
  },
}

/**
 * URL 可编辑的供应商：仅通用 OpenAI 兼容项（含 Responses 变体）与本地 Ollama
 * （历史配置）。models.dev 供应商锁定官方域名，防止误改；需要自定义端点时
 * 请选择「OpenAI 兼容」。
 */
const URL_EDITABLE_PROVIDERS = new Set<string>(['openai', 'openai-responses', 'ollama'])

export const isApiUrlEditable = (provider: AIProvider): boolean =>
  URL_EDITABLE_PROVIDERS.has(provider)

/** 解析历史 provider id 的现行 id */
function resolveProviderId(provider: AIProvider): string {
  return LEGACY_PROVIDER_ALIASES[provider] ?? provider
}

/**
 * 解析任意供应商（内置 / models.dev / 历史自定义）的默认配置。
 * 未收录的供应商返回空串，交由调用方回退到用户填写的 apiUrl。
 */
export function getProviderConfig(provider: AIProvider): ProviderConfig {
  const id = resolveProviderId(provider)

  const builtIn = PROVIDER_CONFIGS[id as BuiltInProvider]
  if (builtIn) return builtIn

  const fromModelsDev = MODELS_DEV_PROVIDER_MAP[id]
  if (fromModelsDev) {
    return {
      defaultApiUrl: fromModelsDev.api ?? '',
      websiteUrl: fromModelsDev.doc ?? '',
    }
  }

  return { defaultApiUrl: '', websiteUrl: '' }
}

/** 供应商展示名：内置 → models.dev → 原始 id */
export function getProviderLabel(provider: AIProvider): string {
  const id = resolveProviderId(provider)
  const builtInLabel = BUILT_IN_PROVIDER_LABELS[id as BuiltInProvider]
  if (builtInLabel) return builtInLabel
  return MODELS_DEV_PROVIDER_MAP[id]?.name ?? provider
}

/**
 * 下拉框选项：内置供应商置顶（含 i18n 文案），其后为 models.dev 全量供应商。
 */
export function getProviderOptions(
  t: (key: string) => string
): ProviderOption[] {
  const builtInOptions: ProviderOption[] = [
    { value: 'openai', label: t('config.openaiCompatible') },
    {
      value: 'openai-responses',
      label: `${t('config.openaiCompatible')} Responses`,
    },
    { value: 'tokendance', label: BUILT_IN_PROVIDER_LABELS.tokendance },
  ]

  return [
    ...builtInOptions,
    ...Object.values(MODELS_DEV_PROVIDER_MAP).map((p) => ({
      value: p.id,
      label: p.name,
    })),
  ]
}
