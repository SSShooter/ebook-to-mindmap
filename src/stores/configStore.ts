import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SupportedLanguage } from '../services/prompts/utils'

// AI配置接口
interface AIConfig {
  provider: 'gemini' | 'openai' | 'dashscope'
  apiKey: string
  apiUrl: string
  model: string
  temperature: number
}

// 处理选项接口
interface ProcessingOptions {
  processingMode: 'summary' | 'mindmap' | 'combined-mindmap'
  bookType: 'fiction' | 'non-fiction'
  useSmartDetection: boolean
  skipNonEssentialChapters: boolean
  maxSubChapterDepth: number
  outputLanguage: SupportedLanguage
}

// 配置store状态接口
interface ConfigState {
  // AI配置
  aiConfig: AIConfig
  setAiProvider: (provider: 'gemini' | 'openai' | 'dashscope') => void
  setApiKey: (apiKey: string) => void
  setApiUrl: (apiUrl: string) => void
  setModel: (model: string) => void
  setTemperature: (temperature: number) => void
  
  // 处理选项
  processingOptions: ProcessingOptions
  setProcessingMode: (mode: 'summary' | 'mindmap' | 'combined-mindmap') => void
  setBookType: (type: 'fiction' | 'non-fiction') => void
  setUseSmartDetection: (enabled: boolean) => void
  setSkipNonEssentialChapters: (enabled: boolean) => void
  setMaxSubChapterDepth: (depth: number) => void
  setOutputLanguage: (language: SupportedLanguage) => void
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
  useSmartDetection: false,
  skipNonEssentialChapters: true,
  maxSubChapterDepth: 0,
  outputLanguage: 'en'
}

// 创建配置store
export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      // AI配置
      aiConfig: defaultAIConfig,
      setAiProvider: (provider) => set((state) => {
        // 根据提供商设置默认的API URL和模型
        let updatedConfig = { ...state.aiConfig, provider };
        
        if (provider === 'dashscope') {
          updatedConfig = {
            ...updatedConfig,
            apiUrl: 'https://dashscope.aliyuncs.com/api/v1',
            model: 'qwen-max'
          };
        } else if (provider === 'openai') {
          updatedConfig = {
            ...updatedConfig,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-3.5-turbo'
          };
        } else if (provider === 'gemini') {
          updatedConfig = {
            ...updatedConfig,
            apiUrl: '', // Gemini不需要API URL
            model: 'gemini-1.5-flash'
          };
        }
        
        return { aiConfig: updatedConfig };
      }),
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
      setUseSmartDetection: (useSmartDetection) => set((state) => ({
        processingOptions: { ...state.processingOptions, useSmartDetection }
      })),
      setSkipNonEssentialChapters: (skipNonEssentialChapters) => set((state) => ({
        processingOptions: { ...state.processingOptions, skipNonEssentialChapters }
      })),
      setMaxSubChapterDepth: (maxSubChapterDepth) => set((state) => ({
        processingOptions: { ...state.processingOptions, maxSubChapterDepth }
      })),
      setOutputLanguage: (outputLanguage) => set((state) => ({
        processingOptions: { ...state.processingOptions, outputLanguage }
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