import {
  getFictionChapterSummaryPrompt,
  getNonFictionChapterSummaryPrompt,
  getChapterConnectionsAnalysisPrompt,
  getFictionChapterConnectionsAnalysisPrompt,
  getOverallSummaryPrompt,
  getFictionOverallSummaryPrompt,
  getTestConnectionPrompt,
  getChapterMindMapPrompt,
  getChapterMindMapStreamPrompt,
  getMindMapArrowPrompt,
  getCharacterRelationshipPrompt,
  getFictionCharacterRelationshipPrompt,
} from './prompts'
import type { MindElixirData } from 'mind-elixir'
import { plaintextToMindElixir } from 'mind-elixir/plaintextConverter'
import { getLanguageInstruction, type SupportedLanguage } from './prompts/utils'
import type { AIConfig } from '../types/ai'
import { PROVIDER_CONFIGS } from '../types/ai'

interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
  reasoning?: string
}

interface ModelConfig {
  apiUrl: string
  apiKey: string
  model: string
}

export class AIService {
  private config: AIConfig | (() => AIConfig)
  private model!: ModelConfig

  constructor(config: AIConfig | (() => AIConfig)) {
    this.config = config
    const currentConfig = typeof config === 'function' ? config() : config
    this.model = this.getModelConfig(currentConfig)
  }

  private getModelConfig(config: AIConfig): ModelConfig {
    const providerConfig = PROVIDER_CONFIGS[config.provider]

    return {
      apiUrl: config.apiUrl || providerConfig.defaultApiUrl,
      apiKey: config.apiKey || '',
      model: config.model || providerConfig.defaultModel,
    }
  }

  private getCurrentConfig(): AIConfig {
    return typeof this.config === 'function' ? this.config() : this.config
  }

  async summarizeChapter(
    title: string,
    content: string,
    bookType: 'fiction' | 'non-fiction' = 'non-fiction',
    outputLanguage: SupportedLanguage = 'en',
    customPrompt?: string,
    useCustomOnly: boolean = false,
    abortSignal?: AbortSignal,
    onStreamUpdate?: (data: { content: string; reasoning?: string }) => void
  ): Promise<{ content: string; reasoning: string }> {
    try {
      const prompt =
        bookType === 'fiction'
          ? getFictionChapterSummaryPrompt(
              title,
              content,
              customPrompt,
              useCustomOnly
            )
          : getNonFictionChapterSummaryPrompt(
              title,
              content,
              customPrompt,
              useCustomOnly
            )

      let result: { content: string; reasoning: string }
      if (onStreamUpdate) {
        result = await this.generateContentStream(
          prompt,
          onStreamUpdate,
          outputLanguage,
          abortSignal
        )
      } else {
        result = await this.generateContent(
          prompt,
          outputLanguage,
          abortSignal,
          false
        )
      }

      if (!result.content || result.content.trim().length === 0) {
        throw new Error('AI返回了空的总结')
      }

      return {
        content: result.content.trim(),
        reasoning: result.reasoning.trim(),
      }
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async analyzeConnections(
    chapters: Chapter[],
    outputLanguage: SupportedLanguage = 'en',
    bookType: 'fiction' | 'non-fiction' = 'non-fiction',
    abortSignal?: AbortSignal,
    onStreamUpdate?: (data: { content: string; reasoning?: string }) => void
  ): Promise<string> {
    try {
      // 构建章节摘要信息
      const chapterSummaries = chapters
        .map((chapter) => `${chapter.title}:\n${chapter.summary || '无总结'}`)
        .join('\n\n')

      const prompt =
        bookType === 'fiction'
          ? getFictionChapterConnectionsAnalysisPrompt(chapterSummaries)
          : getChapterConnectionsAnalysisPrompt(chapterSummaries)

      let result: { content: string; reasoning: string }
      if (onStreamUpdate) {
        result = await this.generateContentStream(
          prompt,
          onStreamUpdate,
          outputLanguage,
          abortSignal
        )
      } else {
        result = await this.generateContent(prompt, outputLanguage, abortSignal)
      }
      const connections = result.content

      if (!connections || connections.trim().length === 0) {
        throw new Error('AI返回了空的关联分析')
      }

      return connections.trim()
    } catch (error) {
      throw new Error(
        `章节关联分析失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  async generateOverallSummary(
    bookTitle: string,
    chapters: Chapter[],
    outputLanguage: SupportedLanguage = 'en',
    bookType: 'fiction' | 'non-fiction' = 'non-fiction',
    abortSignal?: AbortSignal,
    onStreamUpdate?: (data: { content: string; reasoning?: string }) => void
  ): Promise<string> {
    try {
      // 构建简化的章节信息
      const chapterInfo = chapters
        .map(
          (chapter, index) =>
            `第${index + 1}章：${chapter.title}，内容：${chapter.summary || '无总结'}`
        )
        .join('\n')

      const prompt =
        bookType === 'fiction'
          ? getFictionOverallSummaryPrompt(bookTitle, chapterInfo)
          : getOverallSummaryPrompt(bookTitle, chapterInfo)

      let result: { content: string; reasoning: string }
      if (onStreamUpdate) {
        result = await this.generateContentStream(
          prompt,
          onStreamUpdate,
          outputLanguage,
          abortSignal
        )
      } else {
        result = await this.generateContent(prompt, outputLanguage, abortSignal)
      }
      const summary = result.content

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的全书总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(
        `全书总结生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  async generateCharacterRelationship(
    chapters: Chapter[],
    outputLanguage: SupportedLanguage = 'en',
    bookType: 'fiction' | 'non-fiction' = 'non-fiction',
    abortSignal?: AbortSignal
  ): Promise<string> {
    try {
      // 构建章节摘要信息
      const chapterSummaries = chapters
        .map((chapter) => `${chapter.title}:\n${chapter.summary || '无总结'}`)
        .join('\n\n')

      const prompt =
        bookType === 'fiction'
          ? getFictionCharacterRelationshipPrompt(chapterSummaries)
          : getCharacterRelationshipPrompt(chapterSummaries)

      const result = await this.generateContent(
        prompt,
        outputLanguage,
        abortSignal,
        false
      )
      const relationship = result.content

      if (!relationship || relationship.trim().length === 0) {
        throw new Error('AI返回了空的人物关系图')
      }

      // 提取mermaid代码块
      const mermaidMatch = relationship.match(/```mermaid\s*([\s\S]*?)```/)
      if (mermaidMatch && mermaidMatch[1]) {
        return mermaidMatch[1].trim()
      }

      // 如果没有代码块，返回原始内容
      return relationship.trim()
    } catch (error) {
      throw new Error(
        `人物关系图生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  async generateChapterMindMap(
    content: string,
    outputLanguage: SupportedLanguage = 'en',
    customPrompt?: string,
    abortSignal?: AbortSignal
  ) {
    try {
      const basePrompt = getChapterMindMapPrompt()
      let prompt = basePrompt + `章节内容：\n${content}`

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      const result = await this.generateContent(
        prompt,
        outputLanguage,
        abortSignal,
        true
      )
      const mindMapJson = result.content

      return this.parseJsonResponse(mindMapJson, '思维导图') as MindElixirData
    } catch (error) {
      throw new Error(
        `章节思维导图生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  async generateChapterMindMapStream(
    content: string,
    outputLanguage: SupportedLanguage = 'en',
    customPrompt?: string,
    abortSignal?: AbortSignal,
    onStreamUpdate?: (data: {
      plaintext: string
      mindMap: MindElixirData | null
    }) => void
  ): Promise<MindElixirData> {
    try {
      const basePrompt = getChapterMindMapStreamPrompt()
      let prompt = basePrompt + `章节内容：\n${content}`

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      let accumulatedPlaintext = ''
      let lastUpdateTime = 0

      const handleStreamUpdate = (data: {
        content: string
        reasoning?: string
      }) => {
        accumulatedPlaintext += data.content

        // 节流更新：每500ms更新一次
        const now = Date.now()
        if (
          onStreamUpdate &&
          (now - lastUpdateTime >= 500 || lastUpdateTime === 0)
        ) {
          try {
            // 清理可能的markdown代码块包裹
            const cleanedText = accumulatedPlaintext
              .replace(/^```[^\n]*\n?/gm, '')
              .replace(/```$/gm, '')
              .trim()

            // 尝试解析为MindElixir数据
            const mindMapData = plaintextToMindElixir(cleanedText)
            onStreamUpdate({ plaintext: cleanedText, mindMap: mindMapData })
          } catch {
            // 解析失败时仍然传递plaintext，mindMap为null
            onStreamUpdate({ plaintext: accumulatedPlaintext, mindMap: null })
          }
          lastUpdateTime = now
        }
      }

      const result = await this.generateContentStream(
        prompt,
        handleStreamUpdate,
        outputLanguage,
        abortSignal
      )

      // 最终解析
      const cleanedText = result.content
        .replace(/^```[^\n]*\n?/gm, '')
        .replace(/```$/gm, '')
        .trim()

      const mindMapData = plaintextToMindElixir(cleanedText)

      // 确保最后一次更新包含完整内容
      if (onStreamUpdate) {
        onStreamUpdate({ plaintext: cleanedText, mindMap: mindMapData })
      }

      return mindMapData
    } catch (error) {
      throw new Error(
        `章节思维导图生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  async generateMindMapArrows(
    combinedMindMapData: MindElixirData,
    outputLanguage: SupportedLanguage = 'en',
    abortSignal?: AbortSignal
  ) {
    try {
      const basePrompt = getMindMapArrowPrompt()
      const prompt =
        basePrompt +
        `\n\n当前思维导图数据：\n${JSON.stringify(combinedMindMapData, null, 2)}`

      const result = await this.generateContent(
        prompt,
        outputLanguage,
        abortSignal,
        true
      )
      const arrowsJson = result.content

      return this.parseJsonResponse(
        arrowsJson,
        '箭头'
      ) as MindElixirData['arrows']
    } catch (error) {
      throw new Error(
        `思维导图箭头生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  async generateCombinedMindMap(
    bookTitle: string,
    chapters: Chapter[],
    customPrompt?: string,
    abortSignal?: AbortSignal
  ) {
    try {
      const basePrompt = getChapterMindMapPrompt()
      const chaptersContent = chapters
        .map((item) => item.content)
        .join('\n\n ------------- \n\n')
      let prompt = `${basePrompt}
        请为整本书《${bookTitle}》生成一个完整的思维导图，将所有章节的内容整合在一起。
        章节内容：\n${chaptersContent}`

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      const result = await this.generateContent(prompt, 'en', abortSignal, true)
      const mindMapJson = result.content

      return this.parseJsonResponse(mindMapJson, '思维导图') as MindElixirData
    } catch (error) {
      throw new Error(
        `整书思维导图生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  async generateCombinedMindMapStream(
    bookTitle: string,
    chapters: Chapter[],
    customPrompt?: string,
    abortSignal?: AbortSignal,
    onStreamUpdate?: (data: {
      plaintext: string
      mindMap: MindElixirData | null
    }) => void
  ): Promise<MindElixirData> {
    try {
      const basePrompt = getChapterMindMapStreamPrompt()
      const chaptersContent = chapters
        .map((item) => item.content)
        .join('\n\n ------------- \n\n')
      let prompt = `${basePrompt}
        请为整本书《${bookTitle}》生成一个完整的思维导图，将所有章节的内容整合在一起。
        章节内容：\n${chaptersContent}`

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      let accumulatedPlaintext = ''
      let lastUpdateTime = 0

      const handleStreamUpdate = (data: {
        content: string
        reasoning?: string
      }) => {
        accumulatedPlaintext += data.content

        // 节流更新：每500ms更新一次
        const now = Date.now()
        if (
          onStreamUpdate &&
          (now - lastUpdateTime >= 500 || lastUpdateTime === 0)
        ) {
          try {
            // 清理可能的markdown代码块包裹
            const cleanedText = accumulatedPlaintext
              .replace(/^```[^\n]*\n?/gm, '')
              .replace(/```$/gm, '')
              .trim()

            // 尝试解析为MindElixir数据
            const mindMapData = plaintextToMindElixir(cleanedText)
            onStreamUpdate({ plaintext: cleanedText, mindMap: mindMapData })
          } catch {
            // 解析失败时仍然传递plaintext，mindMap为null
            onStreamUpdate({ plaintext: accumulatedPlaintext, mindMap: null })
          }
          lastUpdateTime = now
        }
      }

      const result = await this.generateContentStream(
        prompt,
        handleStreamUpdate,
        'en',
        abortSignal
      )

      // 最终解析
      const cleanedText = result.content
        .replace(/^```[^\n]*\n?/gm, '')
        .replace(/```$/gm, '')
        .trim()

      const mindMapData = plaintextToMindElixir(cleanedText)

      // 确保最后一次更新包含完整内容
      if (onStreamUpdate) {
        onStreamUpdate({ plaintext: cleanedText, mindMap: mindMapData })
      }

      return mindMapData
    } catch (error) {
      throw new Error(
        `整书思维导图生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  // 辅助方法：解析AI返回的JSON数据
  private parseJsonResponse(response: string, errorContext: string): unknown {
    if (!response || response.trim().length === 0) {
      throw new Error(`AI返回了空的${errorContext}数据`)
    }

    // 尝试直接解析JSON
    try {
      return JSON.parse(response.trim())
    } catch {
      // 尝试从代码块中提取JSON
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim())
        } catch {
          throw new Error(`AI返回的${errorContext}数据格式不正确`)
        }
      }
      throw new Error(`AI返回的${errorContext}数据格式不正确`)
    }
  }

  // 统一的内容生成方法
  private async generateContent(
    prompt: string,
    outputLanguage?: SupportedLanguage,
    abortSignal?: AbortSignal,
    requireJsonFormat: boolean = false
  ): Promise<{ content: string; reasoning: string }> {
    const config = this.getCurrentConfig()
    const language = outputLanguage || 'en'
    const systemPrompt = getLanguageInstruction(language)

    // 合并系统提示和用户提示
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'user',
        content: prompt + '\n\n' + systemPrompt,
      },
    ]

    // 检查是否已取消
    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError')
    }

    // 构建请求体，只在需要JSON格式时添加response_format
    const requestBody: {
      model: string
      messages: Array<{ role: 'system' | 'user'; content: string }>
      temperature: number
      response_format?: { type: string }
    } = {
      model: this.model.model,
      messages,
      temperature: config.temperature || 0.7,
    }

    // 只有在生成思维导图时才要求JSON格式
    if (requireJsonFormat) {
      requestBody.response_format = {
        type: 'json_object',
      }
    }

    const response = await fetch(`${this.model.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.model.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `Error: ${response.status} ${response.statusText} - ${errorBody}`
      )
    }

    const data = await response.json()

    if (data.choices?.[0]?.error) {
      const error = data.choices[0].error
      throw new Error(`AI Provider Error: ${error.code} - ${error.message}`)
    }

    return {
      content: data.choices[0]?.message?.content || '',
      reasoning: data.choices[0]?.message?.reasoning_content || '',
    }
  }

  // 流式内容生成方法
  private async generateContentStream(
    prompt: string,
    onUpdate: (data: { content: string; reasoning?: string }) => void,
    outputLanguage?: SupportedLanguage,
    abortSignal?: AbortSignal
  ): Promise<{ content: string; reasoning: string }> {
    const config = this.getCurrentConfig()
    const language = outputLanguage || 'en'
    const systemPrompt = getLanguageInstruction(language)

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'user',
        content: prompt + '\n\n' + systemPrompt,
      },
    ]

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError')
    }

    try {
      const response = await fetch(`${this.model.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.model.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model.model,
          messages,
          temperature: config.temperature || 0.7,
          stream: true, // 开启流式传输
        }),
        signal: abortSignal,
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(
          `Error: ${response.status} ${response.statusText} - ${errorBody}`
        )
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let fullContent = ''
      let fullReasoning = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // 保留最后一个可能不完整的行
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6)
              const json = JSON.parse(jsonStr)
              const delta = json.choices?.[0]?.delta
              const contentChunk = delta?.content || ''
              const reasoningChunk =
                delta?.reasoning_content || delta?.reasoning || ''

              if (contentChunk || reasoningChunk) {
                fullContent += contentChunk
                fullReasoning += reasoningChunk
                onUpdate({ content: contentChunk, reasoning: reasoningChunk })
              }
            } catch (e) {
              console.warn('Error parsing stream chunk:', e)
            }
          }
        }
      }

      return { content: fullContent, reasoning: fullReasoning }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
      throw new Error(
        `Stream generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // 辅助方法：检查API连接
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.generateContent(
        getTestConnectionPrompt(),
        undefined,
        undefined,
        false
      )
      return (
        result.content.includes('连接成功') || result.content.includes('成功')
      )
    } catch {
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
