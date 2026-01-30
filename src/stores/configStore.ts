import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SupportedLanguage } from '../services/prompts/utils'
import type { AIProvider, AIConfig } from '../types/ai'

// 处理选项接口
interface ProcessingOptions {
  processingMode: 'summary' | 'mindmap' | 'whole-mindmap'
  bookType: 'fiction' | 'non-fiction'

  skipNonEssentialChapters: boolean
  maxSubChapterDepth: number
  outputLanguage: SupportedLanguage
  forceUseSpine: boolean
}

// 配置store状态接口
interface ConfigState {
  // AI配置
  aiConfig: AIConfig
  setAiProvider: (provider: AIProvider) => void
  setApiKey: (apiKey: string) => void
  setApiUrl: (apiUrl: string) => void
  setModel: (model: string) => void
  setTemperature: (temperature: number) => void

  // 处理选项
  processingOptions: ProcessingOptions
  setProcessingMode: (mode: 'summary' | 'mindmap' | 'whole-mindmap') => void
  setBookType: (type: 'fiction' | 'non-fiction') => void

  setSkipNonEssentialChapters: (enabled: boolean) => void
  setMaxSubChapterDepth: (depth: number) => void
  setOutputLanguage: (language: SupportedLanguage) => void
  setForceUseSpine: (enabled: boolean) => void

  // 统一导入配置
  importConfig: (config: { aiConfig?: Partial<AIConfig>, processingOptions?: Partial<ProcessingOptions> }) => void
}

// 默认配置
const defaultAIConfig: AIConfig = {
  provider: 'gemini',
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1',
  model: 'gemini-1.5-flash',
  temperature: 0.7
}

const defaultProcessingOptions: ProcessingOptions = {
  processingMode: 'mindmap',
  bookType: 'non-fiction',

  skipNonEssentialChapters: true,
  maxSubChapterDepth: 0,
  outputLanguage: 'en',
  forceUseSpine: false
}

// 创建配置store
export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      // AI配置
      aiConfig: defaultAIConfig,
      setAiProvider: (provider) => set((state) => ({
        aiConfig: { ...state.aiConfig, provider }
      })),
      setApiKey: (apiKey) => set((state) => ({
        aiConfig: { ...state.aiConfig, apiKey }
      })),
      setApiUrl: (apiUrl) => set((state) => ({
        aiConfig: { ...state.aiConfig, apiUrl }
      })),
      setModel: (model) => set((state) => ({
        aiConfig: { ...state.aiConfig, model }
      })),
      setTemperature: (temperature) => set((state) => ({
        aiConfig: { ...state.aiConfig, temperature }
      })),

      // 处理选项
      processingOptions: defaultProcessingOptions,
      setProcessingMode: (processingMode) => set((state) => ({
        processingOptions: { ...state.processingOptions, processingMode }
      })),
      setBookType: (bookType) => set((state) => ({
        processingOptions: { ...state.processingOptions, bookType }
      })),

      setSkipNonEssentialChapters: (skipNonEssentialChapters) => set((state) => ({
        processingOptions: { ...state.processingOptions, skipNonEssentialChapters }
      })),
      setMaxSubChapterDepth: (maxSubChapterDepth) => set((state) => ({
        processingOptions: { ...state.processingOptions, maxSubChapterDepth }
      })),
      setOutputLanguage: (outputLanguage) => set((state) => ({
        processingOptions: { ...state.processingOptions, outputLanguage }
      })),
      setForceUseSpine: (forceUseSpine) => set((state) => ({
        processingOptions: { ...state.processingOptions, forceUseSpine }
      })),

      // 统一导入配置
      importConfig: (config) => set((state) => ({
        aiConfig: config.aiConfig ? { ...state.aiConfig, ...config.aiConfig } : state.aiConfig,
        processingOptions: config.processingOptions ? { ...state.processingOptions, ...config.processingOptions } : state.processingOptions
      }))
    }),
    {
      name: 'ebook-mindmap-config', // localStorage中的键名
      partialize: (state) => ({
        aiConfig: state.aiConfig,
        processingOptions: state.processingOptions
      })
    }
  )
)

// Helper to get default model from model store
const getDefaultModelFromStorage = (): AIConfig | null => {
  if (typeof window === 'undefined') return null

  try {
    const modelStore = JSON.parse(localStorage.getItem('ebook-models') || '{"state":{"models":[]}}')
    const defaultModel = modelStore.state.models.find((m: { isDefault: boolean; provider: string; apiKey: string; apiUrl: string; model: string; temperature: number }) => m.isDefault)

    if (defaultModel) {
      return {
        provider: defaultModel.provider as AIConfig['provider'],
        apiKey: defaultModel.apiKey,
        apiUrl: defaultModel.apiUrl,
        model: defaultModel.model,
        temperature: defaultModel.temperature
      }
    }
  } catch (error) {
    console.error('Failed to load default model from storage:', error)
  }

  return null
}

// 导出便捷的选择器
export const useAIConfig = () => {
  const configStoreAIConfig = useConfigStore((state) => state.aiConfig)

  // Try to get default model from model store first
  const defaultModel = getDefaultModelFromStorage()

  return defaultModel || configStoreAIConfig
}

export const useProcessingOptions = () => useConfigStore((state) => state.processingOptions)