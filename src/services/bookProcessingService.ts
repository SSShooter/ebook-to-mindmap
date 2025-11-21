import type { ChapterData } from './epubProcessor'
import type { AIService } from './aiService'
import type { CacheService } from './cacheService'
import type { SupportedLanguage } from './prompts/utils'
import type { MindElixirData } from 'mind-elixir'
import type { Summary } from 'node_modules/mind-elixir/dist/types/summary'

/**
 * 简单的字符串哈希函数（类似MD5但更轻量）
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

export interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
  mindMap?: MindElixirData
  isLoading?: boolean
  tags?: string[]
}

export interface ChapterGroup {
  groupId: string
  tag: string | null
  chapterIds: string[]
  chapterTitles: string[]
  summary?: string
  mindMap?: MindElixirData
  isLoading?: boolean
}

interface TempChapterGroup {
  tag: string | null
  chapters: ChapterData[]
  groupId: string
}

type BookType = 'fiction' | 'non-fiction'

export class BookProcessingService {
  private aiService: AIService
  private cacheService: CacheService

  constructor(aiService: AIService, cacheService: CacheService) {
    this.aiService = aiService
    this.cacheService = cacheService
  }

  /**
   * 按tag分组章节
   */
  groupChaptersByTag(
    chapters: ChapterData[],
    chapterTags: Map<string, string>
  ): TempChapterGroup[] {
    const groups: TempChapterGroup[] = []
    const processedTags = new Set<string>()

    for (const chapter of chapters) {
      const tag = chapterTags.get(chapter.id) || null

      if (tag === null) {
        // 无tag的章节单独一组
        groups.push({
          tag: null,
          chapters: [chapter],
          groupId: chapter.title
        })
      } else if (!processedTags.has(tag)) {
        // 第一次遇到这个tag，收集所有同tag的章节
        processedTags.add(tag)
        const sameTagChapters = chapters.filter(ch => chapterTags.get(ch.id) === tag)
        const groupId = hashString(sameTagChapters.map(ch => ch.id).sort().join('_'))
        groups.push({
          tag,
          chapters: sameTagChapters,
          groupId
        })
      }
    }

    return groups
  }

  /**
   * 处理文字总结模式的单个组
   */
  async processSummaryGroup(
    group: TempChapterGroup,
    fileName: string,
    bookType: BookType,
    outputLanguage: SupportedLanguage,
    customPrompt: string,
    useCustomOnly: boolean,
    abortSignal: AbortSignal
  ): Promise<{ group: ChapterGroup; chapters: Chapter[] }> {
    let summary = await this.cacheService.getString(fileName, 'summary', group.groupId)

    if (!summary) {
      const combinedTitle = group.tag
        ? `${group.tag} (${group.chapters.map(ch => ch.title).join(', ')})`
        : group.chapters[0].title
      const combinedContent = group.chapters.map(ch => `## ${ch.title}\n\n${ch.content}`).join('\n\n')

      summary = await this.aiService.summarizeChapter(
        combinedTitle,
        combinedContent,
        bookType,
        outputLanguage,
        customPrompt,
        useCustomOnly,
        abortSignal
      )
      await this.cacheService.setCache(fileName, 'summary', summary, group.groupId)
    }

    const processedGroup: ChapterGroup = {
      groupId: group.groupId,
      tag: group.tag,
      chapterIds: group.chapters.map(ch => ch.id),
      chapterTitles: group.chapters.map(ch => ch.title),
      summary,
      isLoading: false
    }

    const processedChapters: Chapter[] = group.chapters.map(chapter => ({
      ...chapter,
      summary,
      isLoading: false
    }))

    return { group: processedGroup, chapters: processedChapters }
  }

  /**
   * 处理章节思维导图模式的单个组
   */
  async processMindMapGroup(
    group: TempChapterGroup,
    fileName: string,
    outputLanguage: SupportedLanguage,
    customPrompt: string,
    abortSignal: AbortSignal
  ): Promise<{ group: ChapterGroup; chapters: Chapter[] }> {
    let mindMap = await this.cacheService.getMindMap(fileName, 'mindmap', group.groupId)

    if (!mindMap) {
      const combinedContent = group.chapters.map(ch => `## ${ch.title}\n\n${ch.content}`).join('\n\n')
      mindMap = await this.aiService.generateChapterMindMap(
        combinedContent,
        outputLanguage,
        customPrompt,
        abortSignal
      )
      await this.cacheService.setCache(fileName, 'mindmap', mindMap, group.groupId)
    }

    if (!mindMap.nodeData) {
      throw new Error('生成思维导图失败')
    }

    const processedGroup: ChapterGroup = {
      groupId: group.groupId,
      tag: group.tag,
      chapterIds: group.chapters.map(ch => ch.id),
      chapterTitles: group.chapters.map(ch => ch.title),
      mindMap,
      isLoading: false
    }

    const processedChapters: Chapter[] = group.chapters.map(chapter => ({
      ...chapter,
      mindMap,
      isLoading: false
    }))

    return { group: processedGroup, chapters: processedChapters }
  }

  /**
   * 生成章节关联分析
   */
  async generateConnections(
    fileName: string,
    chapters: Chapter[],
    outputLanguage: SupportedLanguage,
    bookType: BookType,
    abortSignal: AbortSignal
  ): Promise<string> {
    let connections = await this.cacheService.getString(fileName, 'connections')

    if (!connections) {
      console.log('🔄 [DEBUG] 缓存未命中，开始分析章节关联')
      connections = await this.aiService.analyzeConnections(
        chapters,
        outputLanguage,
        bookType,
        abortSignal
      )
      await this.cacheService.setCache(fileName, 'connections', connections)
      console.log('💾 [DEBUG] 章节关联已缓存')
    } else {
      console.log('✅ [DEBUG] 使用缓存的章节关联')
    }

    return connections
  }

  /**
   * 生成全书总结
   */
  async generateOverallSummary(
    fileName: string,
    bookTitle: string,
    chapters: Chapter[],
    outputLanguage: SupportedLanguage,
    bookType: BookType,
    abortSignal: AbortSignal
  ): Promise<string> {
    let overallSummary = await this.cacheService.getString(fileName, 'overall_summary')

    if (!overallSummary) {
      console.log('🔄 [DEBUG] 缓存未命中，开始生成全书总结')
      overallSummary = await this.aiService.generateOverallSummary(
        bookTitle,
        chapters,
        outputLanguage,
        bookType,
        abortSignal
      )
      await this.cacheService.setCache(fileName, 'overall_summary', overallSummary)
      console.log('💾 [DEBUG] 全书总结已缓存')
    } else {
      console.log('✅ [DEBUG] 使用缓存的全书总结')
    }

    return overallSummary
  }

  /**
   * 生成人物关系图
   */
  async generateCharacterRelationship(
    fileName: string,
    chapters: Chapter[],
    outputLanguage: SupportedLanguage,
    bookType: BookType,
    abortSignal: AbortSignal
  ): Promise<string> {
    let characterRelationship = await this.cacheService.getString(fileName, 'character_relationship')

    if (!characterRelationship) {
      console.log('🔄 [DEBUG] 缓存未命中，开始生成人物关系图')
      characterRelationship = await this.aiService.generateCharacterRelationship(
        chapters,
        outputLanguage,
        bookType,
        abortSignal
      )
      await this.cacheService.setCache(fileName, 'character_relationship', characterRelationship)
      console.log('💾 [DEBUG] 人物关系图已缓存')
    } else {
      console.log('✅ [DEBUG] 使用缓存的人物关系图')
    }

    return characterRelationship
  }


  /**
   * 合并章节思维导图
   */
  async mergeMindMaps(
    fileName: string,
    bookTitle: string,
    chapters: Chapter[]
  ): Promise<MindElixirData> {
    let combinedMindMap = await this.cacheService.getMindMap(fileName, 'merged_mindmap')

    if (!combinedMindMap) {
      console.log('🔄 [DEBUG] 缓存未命中，开始合并章节思维导图')

      const rootNode = {
        topic: bookTitle,
        id: '0',
        tags: ['全书'],
        children: chapters.map((chapter, index) => ({
          topic: chapter.title,
          id: `chapter_${index + 1}`,
          children: chapter.mindMap?.nodeData?.children || []
        }))
      }

      combinedMindMap = {
        nodeData: rootNode,
        arrows: [],
        summaries: chapters.reduce(
          (acc, chapter) => acc.concat(chapter.mindMap?.summaries || []),
          [] as Summary[]
        )
      }

      await this.cacheService.setCache(fileName, 'merged_mindmap', combinedMindMap)
      console.log('💾 [DEBUG] 合并思维导图已缓存')
    } else {
      console.log('✅ [DEBUG] 使用缓存的合并思维导图')
    }

    return combinedMindMap
  }

  /**
   * 生成整书思维导图
   */
  async generateCombinedMindMap(
    fileName: string,
    bookTitle: string,
    chapters: Chapter[],
    customPrompt: string,
    abortSignal: AbortSignal
  ): Promise<MindElixirData> {
    let combinedMindMap = await this.cacheService.getMindMap(fileName, 'combined_mindmap')

    if (!combinedMindMap) {
      console.log('🔄 [DEBUG] 缓存未命中，开始生成整书思维导图')
      combinedMindMap = await this.aiService.generateCombinedMindMap(
        bookTitle,
        chapters,
        customPrompt,
        abortSignal
      )
      await this.cacheService.setCache(fileName, 'combined_mindmap', combinedMindMap)
      console.log('💾 [DEBUG] 整书思维导图已缓存')
    } else {
      console.log('✅ [DEBUG] 使用缓存的整书思维导图')
    }

    return combinedMindMap
  }
}
