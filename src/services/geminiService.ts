import { GoogleGenerativeAI } from '@google/generative-ai'

interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
}

interface AIConfig {
  provider: 'gemini' | 'openai'
  apiKey: string
  apiUrl?: string // 用于OpenAI兼容的API地址
  model?: string
}

export class AIService {
  private config: AIConfig
  private genAI?: GoogleGenerativeAI
  private model: any

  constructor(config: AIConfig) {
    this.config = config
    
    if (config.provider === 'gemini') {
      this.genAI = new GoogleGenerativeAI(config.apiKey)
      this.model = this.genAI.getGenerativeModel({ model: config.model || 'gemini-1.5-flash' })
    } else if (config.provider === 'openai') {
      // OpenAI兼容的配置
      this.model = {
        apiUrl: config.apiUrl || 'https://api.openai.com/v1',
        apiKey: config.apiKey,
        model: config.model || 'gpt-3.5-turbo'
      }
    }
  }

  async summarizeChapter(title: string, content: string): Promise<string> {
    try {
      const prompt = `请为以下章节内容生成一个详细的中文总结：

章节标题：${title}

章节内容：
${content}

请提供一个结构化的总结，包括：
1. 主要内容概述
2. 关键观点或情节
3. 重要人物或概念
4. 本章的意义或作用

总结应该详细但简洁，大约200-300字。`

      const summary = await this.generateContent(prompt)

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(`章节总结失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async analyzeConnections(chapters: Chapter[]): Promise<string> {
    try {
      // 构建章节摘要信息
      const chapterSummaries = chapters.map((chapter, index) => 
        `第${index + 1}章 - ${chapter.title}:\n${chapter.summary || '无总结'}`
      ).join('\n\n')

      const prompt = `请分析以下各章节之间的关联性和逻辑关系：

${chapterSummaries}

请从以下角度进行分析：
1. 章节间的逻辑递进关系
2. 主题和概念的发展脉络
3. 人物或情节的连贯性
4. 重要观点的呼应和深化
5. 整体结构的安排意图

请提供一个详细的关联性分析，帮助读者理解各章节如何共同构建整本书的主题。`

      const connections = await this.generateContent(prompt)

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
    connections: string
  ): Promise<string> {
    try {
      // 构建简化的章节信息
      const chapterInfo = chapters.map((chapter, index) => 
        `第${index + 1}章：${chapter.title}`
      ).join('\n')

      const prompt = `请为《${bookTitle}》这本书生成一个全面的总结报告：

书籍章节结构：
${chapterInfo}

章节关联分析：
${connections}

请生成一个包含以下内容的全书总结：

1. **核心主题**：书籍的主要思想和核心观点
2. **内容架构**：全书的逻辑结构和组织方式
3. **关键洞察**：最重要的观点、发现或启示
4. **实用价值**：对读者的意义和应用价值
5. **阅读建议**：如何更好地理解和应用书中内容

总结应该全面而深入，大约500-800字，帮助读者快速掌握全书精髓。`

      const summary = await this.generateContent(prompt)

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的全书总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(`全书总结生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 统一的内容生成方法
  private async generateContent(prompt: string): Promise<string> {
    if (this.config.provider === 'gemini') {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } else if (this.config.provider === 'openai') {
      const response = await fetch(`${this.model.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.model.apiKey}`
        },
        body: JSON.stringify({
          model: this.model.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API请求失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    }
    
    throw new Error('不支持的AI提供商')
  }

  // 辅助方法：检查API连接
  async testConnection(): Promise<boolean> {
    try {
      const text = await this.generateContent('请回复"连接成功"')
      return text.includes('连接成功') || text.includes('成功')
    } catch (error) {
      return false
    }
  }
}

// 保持向后兼容性
export class GeminiService extends AIService {
  constructor(apiKey: string) {
    super({ provider: 'gemini', apiKey })
  }
}