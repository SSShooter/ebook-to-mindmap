/**
 * AI Provider Types
 * 统一的 AI 提供商类型定义，避免在多个文件中重复定义
 */

export const AI_PROVIDERS = [
  'gemini',
  'openai',
  'ollama',
  '302.ai',
  'openrouter',
] as const

export type AIProvider = (typeof AI_PROVIDERS)[number]

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  apiUrl?: string
  model?: string
  temperature?: number
}

/**
 * Provider Configuration
 * 每个 AI 提供商的默认配置
 */
export interface ProviderConfig {
  defaultApiUrl: string
  defaultModel: string
  websiteUrl: string
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  gemini: {
    defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    websiteUrl: 'https://aistudio.google.com/',
  },
  openai: {
    defaultApiUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
    websiteUrl: 'https://platform.openai.com/',
  },
  ollama: {
    defaultApiUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama2',
    websiteUrl: 'https://ollama.com/',
  },
  '302.ai': {
    defaultApiUrl: 'https://api.302.ai/v1',
    defaultModel: 'gpt-3.5-turbo',
    websiteUrl: 'https://share.302.ai/BJ7iSL',
  },
  openrouter: {
    defaultApiUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-3.5-turbo',
    websiteUrl: 'https://openrouter.ai/',
  },
}
