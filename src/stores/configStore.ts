import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// AI配置接口
interface AIConfig {
  provider: 'gemini' | 'openai'
  apiKey: string
  apiUrl: string
  model: string
}

// 处理选项接口
interface ProcessingOptions {
  processingMode: 'summary' | 'mindmap'
  bookType: 'fiction' | 'non-fiction'
  useSmartDetection: boolean
  skipNonEssentialChapters: boolean
}

// 配置store状态接口
interface ConfigState {
  // AI配置
  aiConfig: AIConfig
  setAiProvider: (provider: 'gemini' | 'openai') => void
  setApiKey: (apiKey: string) => void
  setApiUrl: (apiUrl: string) => void
  setModel: (model: string) => void
  
  // 处理选项
  processingOptions: ProcessingOptions
  setProcessingMode: (mode: 'summary' | 'mindmap') => void
  setBookType: (type: 'fiction' | 'non-fiction') => void
  setUseSmartDetection: (enabled: boolean) => void
  setSkipNonEssentialChapters: (enabled: boolean) => void
}

// 默认配置
const defaultAIConfig: AIConfig = {
  provider: 'gemini',
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1',
  model: 'gemini-1.5-flash'
}

const defaultProcessingOptions: ProcessingOptions = {
  processingMode: 'summary',
  bookType: 'non-fiction',
  useSmartDetection: false,
  skipNonEssentialChapters: true
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
      
      // 处理选项
      processingOptions: defaultProcessingOptions,
      setProcessingMode: (processingMode) => set((state) => ({
        processingOptions: { ...state.processingOptions, processingMode }
      })),
      setBookType: (bookType) => set((state) => ({
        processingOptions: { ...state.processingOptions, bookType }
      })),
      setUseSmartDetection: (useSmartDetection) => set((state) => ({
        processingOptions: { ...state.processingOptions, useSmartDetection }
      })),
      setSkipNonEssentialChapters: (skipNonEssentialChapters) => set((state) => ({
        processingOptions: { ...state.processingOptions, skipNonEssentialChapters }
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

// 导出便捷的选择器
export const useAIConfig = () => useConfigStore((state) => state.aiConfig)
export const useProcessingOptions = () => useConfigStore((state) => state.processingOptions)