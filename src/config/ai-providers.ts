/**
 * AI 供应商数据源（models.dev）
 *
 * 数据由 `pnpm update:providers` 从 https://models.dev/api.json 同步生成，
 * 请勿手工编辑 models-dev-providers.json。
 */
import modelsDevProviders from './models-dev-providers.json'

export interface ModelDevProvider {
  id: string
  name: string
  /** OpenAI 兼容接口 Base URL，部分第一方供应商缺失 */
  api?: string
  /** 官方文档 / 价格页 */
  doc?: string
  npm?: string
  env?: string[]
}

export const MODELS_DEV_PROVIDERS = modelsDevProviders as unknown as ModelDevProvider[]

export const MODELS_DEV_PROVIDER_MAP: Record<string, ModelDevProvider> =
  Object.fromEntries(MODELS_DEV_PROVIDERS.map((p) => [p.id, p]))

/** 汇总 models.dev 全量供应商的默认 Base URL */
export const MODELS_DEV_BASE_URLS: Record<string, string> = Object.fromEntries(
  MODELS_DEV_PROVIDERS.filter((p) => p.api).map((p) => [p.id, p.api as string])
)

export interface ProviderOption {
  value: string
  label: string
}
