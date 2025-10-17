import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  getFictionChapterSummaryPrompt,
  getNonFictionChapterSummaryPrompt,
  getChapterConnectionsAnalysisPrompt,
  getOverallSummaryPrompt,
  getTestConnectionPrompt,
  getChapterMindMapPrompt,
  getMindMapArrowPrompt,
} from './prompts'
import type { MindElixirData } from 'mind-elixir'
import { getLanguageInstruction, type SupportedLanguage } from './prompts/utils'

interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
}

interface AIConfig {
  provider: 'gemini' | 'openai' | 'ollama' | '302.ai'
  apiKey: string
  apiUrl?: string // 用于OpenAI兼容的API地址
  model?: string
  temperature?: number
}

export class AIService {
  private config: AIConfig | (() => AIConfig)
  private genAI?: GoogleGenerativeAI
  private model: any

  constructor(config: AIConfig | (() => AIConfig)) {
    this.config = config
    
    const currentConfig = typeof config === 'function' ? config() : config
    
    if (currentConfig.provider === 'gemini') {
      this.genAI = new GoogleGenerativeAI(currentConfig.apiKey)
      this.model = this.genAI.getGenerativeModel({ 
        model: currentConfig.model || 'gemini-1.5-flash'
      })
    } else if (currentConfig.provider === 'openai' || currentConfig.provider === '302.ai') {
      // OpenAI兼容的配置
      this.model = {
        apiUrl: currentConfig.apiUrl || 'https://api.openai.com/v1',
        apiKey: currentConfig.apiKey,
        model: currentConfig.model || 'gpt-3.5-turbo'
      }
    } else if (currentConfig.provider === 'ollama') {
      // Ollama配置
      this.model = {
        apiUrl: currentConfig.apiUrl || 'http://localhost:11434',
        apiKey: currentConfig.apiKey || '', // Ollama通常不需要API密钥
        model: currentConfig.model || 'llama2'
      }
    }
  }

  private getCurrentConfig(): AIConfig {
    return typeof this.config === 'function' ? this.config() : this.config
  }

  async summarizeChapter(title: string, content: string, bookType: 'fiction' | 'non-fiction' = 'non-fiction', outputLanguage: SupportedLanguage = 'en', customPrompt?: string): Promise<string> {
    try {
      let prompt = bookType === 'fiction'
        ? getFictionChapterSummaryPrompt(title, content)
        : getNonFictionChapterSummaryPrompt(title, content)

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      const summary = await this.generateContent(prompt, outputLanguage)

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(`章节总结失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async analyzeConnections(chapters: Chapter[], outputLanguage: SupportedLanguage = 'en'): Promise<string> {
    try {
      // 构建章节摘要信息
      const chapterSummaries = chapters.map((chapter) => 
        `${chapter.title}:\n${chapter.summary || '无总结'}`
      ).join('\n\n')

      const prompt = getChapterConnectionsAnalysisPrompt(chapterSummaries)

      const connections = await this.generateContent(prompt, outputLanguage)

      if (!connections || connections.trim().length === 0) {
        throw new Error('AI返回了空的关联分析')
      }

      return connections.trim()
    } catch (error) {
      throw new Error(`章节关联分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateOverallSummary(
    bookTitle: string, 
    chapters: Chapter[], 
    connections: string,
    outputLanguage: SupportedLanguage = 'en'
  ): Promise<string> {
    try {
      // 构建简化的章节信息
      const chapterInfo = chapters.map((chapter, index) => 
        `第${index + 1}章：${chapter.title}，内容：${chapter.summary || '无总结'}`
      ).join('\n')

      const prompt = getOverallSummaryPrompt(bookTitle, chapterInfo, connections)

      const summary = await this.generateContent(prompt, outputLanguage)

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的全书总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(`全书总结生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateChapterMindMap(content: string, outputLanguage: SupportedLanguage = 'en', customPrompt?: string): Promise<MindElixirData> {
    try {
      const basePrompt = getChapterMindMapPrompt()
      let prompt = basePrompt + `章节内容：\n${content}`

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      const mindMapJson = await this.generateContent(prompt, outputLanguage)

      if (!mindMapJson || mindMapJson.trim().length === 0) {
        throw new Error('AI返回了空的思维导图数据')
      }
      
      // 尝试解析JSON
      try {
        return JSON.parse(mindMapJson.trim())
      } catch (parseError) {
        // 尝试从代码块中提取JSON
        const jsonMatch = mindMapJson.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1].trim())
          } catch (extractError) {
            throw new Error('AI返回的思维导图数据格式不正确')
          }
        }
        throw new Error('AI返回的思维导图数据格式不正确')
      }
    } catch (error) {
      throw new Error(`章节思维导图生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateMindMapArrows(combinedMindMapData: any, outputLanguage: SupportedLanguage = 'en'): Promise<any> {
    try {
      const basePrompt = getMindMapArrowPrompt()
      const prompt = basePrompt + `\n\n当前思维导图数据：\n${JSON.stringify(combinedMindMapData, null, 2)}`

      const arrowsJson = await this.generateContent(prompt, outputLanguage)

      if (!arrowsJson || arrowsJson.trim().length === 0) {
        throw new Error('AI返回了空的箭头数据')
      }

      // 尝试解析JSON
      try {
        return JSON.parse(arrowsJson.trim())
      } catch (parseError) {
        // 尝试从代码块中提取JSON
        const jsonMatch = arrowsJson.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1].trim())
          } catch (extractError) {
            throw new Error('AI返回的箭头数据格式不正确')
          }
        }
        throw new Error('AI返回的箭头数据格式不正确')
      }
    } catch (error) {
      throw new Error(`思维导图箭头生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateCombinedMindMap(bookTitle: string, chapters: Chapter[], customPrompt?: string): Promise<MindElixirData> {
    try {
      const basePrompt = getChapterMindMapPrompt()
      const chaptersContent = chapters.map(item=>item.content).join('\n\n ------------- \n\n')
      let prompt = `${basePrompt}
        请为整本书《${bookTitle}》生成一个完整的思维导图，将所有章节的内容整合在一起。
        章节内容：\n${chaptersContent}`

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      const mindMapJson = await this.generateContent(prompt, 'en')

      if (!mindMapJson || mindMapJson.trim().length === 0) {
        throw new Error('AI返回了空的思维导图数据')
      }
      
      // 尝试解析JSON
      try {
        return JSON.parse(mindMapJson.trim())
      } catch (parseError) {
        // 尝试从代码块中提取JSON
        const jsonMatch = mindMapJson.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1].trim())
          } catch (extractError) {
            throw new Error('AI返回的思维导图数据格式不正确')
          }
        }
        throw new Error('AI返回的思维导图数据格式不正确')
      }
    } catch (error) {
      throw new Error(`整书思维导图生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 统一的内容生成方法
  private async generateContent(prompt: string, outputLanguage?: SupportedLanguage): Promise<string> {
    const config = this.getCurrentConfig()
    const language = outputLanguage || 'en'
    const systemPrompt = getLanguageInstruction(language)
    
    if (config.provider === 'gemini') {
      // Gemini API 不直接支持系统提示，将系统提示合并到用户提示前面
      const finalPrompt = `${prompt}\n\n**${systemPrompt}**`
      const result = await this.model.generateContent(finalPrompt, {
        generationConfig: {
          temperature: config.temperature || 0.7
        }
      })
      const response = await result.response
      return response.text()
    } else if (config.provider === 'openai' || config.provider === '302.ai') {
      const messages: Array<{role: 'system' | 'user', content: string}> = [
        {
          role: 'user',
          content: prompt + '\n\n' + systemPrompt
        }
      ]
      
      const response = await fetch(`${this.model.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.model.apiKey}`
        },
        body: JSON.stringify({
          model: this.model.model,
          messages,
          temperature: config.temperature || 0.7
        })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`OpenAI API请求失败: ${response.status} ${response.statusText} - ${errorBody}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    } else if (config.provider === 'ollama') {
      // Ollama API 调用
      const messages: Array<{role: 'system' | 'user', content: string}> = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ]
      
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // 如果提供了API密钥，则添加Authorization头
      if (this.model.apiKey) {
        requestHeaders['Authorization'] = `Bearer ${this.model.apiKey}`
      }
      
      const response = await fetch(`${this.model.apiUrl}/api/chat`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          model: this.model.model,
          messages,
          stream: false,
          options: {
            temperature: config.temperature || 0.7
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API请求失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.message?.content || ''
    }
    
    throw new Error(`不支持的AI提供商: ${config.provider}`)
  }

  // 辅助方法：检查API连接
  async testConnection(): Promise<boolean> {
    try {
      const text = await this.generateContent(getTestConnectionPrompt())
      return text.includes('连接成功') || text.includes('成功')
    } catch (error) {
      return false
    }
  }
}

// 保持向后兼容性
export class AiService extends AIService {
  constructor(apiKey: string) {
    super({ provider: 'gemini', apiKey })
  }
}