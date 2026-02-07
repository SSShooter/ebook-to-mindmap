import localforage from 'localforage'
import type { MindElixirData } from 'mind-elixir'

// 定义缓存键类型
export type CacheKeyType =
  // 章节级缓存
  | 'summary' // 章节总结
  | 'mindmap' // 章节思维导图
  // 书籍级缓存
  | 'connections' // 章节关联分析
  | 'overall_summary' // 全书总结
  | 'character_relationship' // 人物关系图
  | 'combined_mindmap' // 整书思维导图（直接从整书内容生成）
  | 'merged_mindmap' // 合并思维导图（从章节思维导图合并生成）
  | 'mindmap_arrows' // 思维导图箭头
  | 'selected_chapters' // 选中的章节
  | 'chapter_tags' // 章节标签
  | 'custom_prompt' // 自定义提示词
  | 'use_custom_only' // 仅使用自定义提示词

// 定义缓存值的类型
export type CacheValue =
  | string
  | MindElixirData
  | string[]
  | Record<string, string>
  | boolean
  | null

export class CacheService {
  private store: LocalForage

  constructor() {
    // 配置 localForage 实例
    this.store = localforage.createInstance({
      name: 'ebook-processor',
      storeName: 'cache',
      description: 'E-book processor cache storage',
    })
  }

  // 统一的缓存键生成规则
  static generateKey(
    filename: string,
    type: CacheKeyType,
    chapterId?: string
  ): string {
    // 清理文件名，移除扩展名和特殊字符
    const cleanFilename = filename.replace(/\.[^/.]+$/, '')

    if (chapterId) {
      // 章节级缓存：book_filename_chapter_chapterId_type
      return `book_${cleanFilename}_chapter_${chapterId}_${type}`
    } else {
      // 书籍级缓存：book_filename_type
      return `book_${cleanFilename}_${type}`
    }
  }

  // 获取字符串类型的缓存值
  async getString(
    filename: string,
    type: CacheKeyType,
    chapterId?: string
  ): Promise<string | null> {
    const key = CacheService.generateKey(filename, type, chapterId)
    const value = await this.store.getItem<CacheValue>(key)
    return typeof value === 'string' ? value : null
  }

  // 获取思维导图类型的缓存值
  async getMindMap(
    filename: string,
    type: CacheKeyType,
    chapterId?: string
  ): Promise<MindElixirData | null> {
    const key = CacheService.generateKey(filename, type, chapterId)
    const value = await this.store.getItem<CacheValue>(key)
    return value && typeof value === 'object' && 'nodeData' in value
      ? (value as MindElixirData)
      : null
  }

  // 获取选中章节的缓存值
  async getSelectedChapters(filename: string): Promise<string[] | null> {
    const key = CacheService.generateKey(filename, 'selected_chapters')
    const value = await this.store.getItem<CacheValue>(key)
    return Array.isArray(value) ? value : null
  }

  // 获取章节标签的缓存值
  async getChapterTags(
    filename: string
  ): Promise<Record<string, string> | null> {
    const key = CacheService.generateKey(filename, 'chapter_tags')
    const value = await this.store.getItem<CacheValue>(key)
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !('nodeData' in value)
      ? (value as Record<string, string>)
      : null
  }

  // 设置缓存值
  async setCache(
    filename: string,
    type: CacheKeyType,
    value: CacheValue,
    chapterId?: string
  ): Promise<void> {
    const key = CacheService.generateKey(filename, type, chapterId)
    await this.store.setItem(key, value)
  }

  // 缓存选中的章节
  async setSelectedChapters(
    filename: string,
    selectedChapters: Set<string>
  ): Promise<void> {
    const key = CacheService.generateKey(filename, 'selected_chapters')
    const value = Array.from(selectedChapters)
    await this.store.setItem(key, value)
  }

  // 缓存章节标签
  async setChapterTags(
    filename: string,
    chapterTags: Map<string, string>
  ): Promise<void> {
    const key = CacheService.generateKey(filename, 'chapter_tags')
    const value = Object.fromEntries(chapterTags)
    await this.store.setItem(key, value)
  }

  // 获取自定义提示词
  async getCustomPrompt(filename: string): Promise<string | null> {
    const key = CacheService.generateKey(filename, 'custom_prompt')
    const value = await this.store.getItem<CacheValue>(key)
    return typeof value === 'string' ? value : null
  }

  // 缓存自定义提示词
  async setCustomPrompt(filename: string, customPrompt: string): Promise<void> {
    const key = CacheService.generateKey(filename, 'custom_prompt')
    await this.store.setItem(key, customPrompt)
  }

  // 获取仅使用自定义提示词选项
  async getUseCustomOnly(filename: string): Promise<boolean> {
    const key = CacheService.generateKey(filename, 'use_custom_only')
    const value = await this.store.getItem<CacheValue>(key)
    return typeof value === 'boolean' ? value : false
  }

  // 缓存仅使用自定义提示词选项
  async setUseCustomOnly(
    filename: string,
    useCustomOnly: boolean
  ): Promise<void> {
    const key = CacheService.generateKey(filename, 'use_custom_only')
    await this.store.setItem(key, useCustomOnly)
  }

  // 删除缓存
  private async deleteCache(
    filename: string,
    type: CacheKeyType,
    chapterId?: string
  ): Promise<boolean> {
    const key = CacheService.generateKey(filename, type, chapterId)
    try {
      await this.store.removeItem(key)
      return true
    } catch {
      return false
    }
  }

  // 获取所有缓存键
  private async getAllKeys(): Promise<string[]> {
    return await this.store.keys()
  }

  // 清除章节缓存
  async clearChapterCache(
    fileName: string,
    chapterId: string,
    type: 'summary' | 'mindmap'
  ): Promise<boolean> {
    const cacheType: CacheKeyType = type
    return await this.deleteCache(fileName, cacheType, chapterId)
  }

  // 清除特定类型缓存
  async clearSpecificCache(
    fileName: string,
    cacheType:
      | 'connections'
      | 'overall_summary'
      | 'character_relationship'
      | 'combined_mindmap'
      | 'merged_mindmap'
      | 'selected_chapters'
      | 'chapter_tags'
  ): Promise<boolean> {
    const type: CacheKeyType = cacheType
    return await this.deleteCache(fileName, type)
  }

  // 清除整本书缓存
  async clearBookCache(
    fileName: string,
    processingMode: 'summary' | 'mindmap' | 'combined_mindmap'
  ): Promise<number> {
    let deletedCount = 0
    const cleanFilename = fileName.replace(/\.[^/.]+$/, '')
    const bookPrefix = `book_${cleanFilename}_`

    // 清除选中章节缓存
    if (await this.deleteCache(fileName, 'selected_chapters')) deletedCount++
    // 清除章节标签缓存
    if (await this.deleteCache(fileName, 'chapter_tags')) deletedCount++

    if (processingMode === 'summary') {
      // 文字总结模式：清除章节总结、章节关联、人物关系图、全书总结相关缓存
      if (await this.deleteCache(fileName, 'connections')) deletedCount++
      if (await this.deleteCache(fileName, 'character_relationship'))
        deletedCount++
      if (await this.deleteCache(fileName, 'overall_summary')) deletedCount++

      // 清除所有章节的总结缓存
      const allKeys = await this.getAllKeys()
      const chapterKeys = allKeys.filter(
        (key) =>
          key.startsWith(bookPrefix) &&
          key.includes('_chapter_') &&
          key.endsWith('_summary')
      )

      for (const key of chapterKeys) {
        try {
          await this.store.removeItem(key)
          deletedCount++
        } catch {
          // 忽略删除失败
        }
      }
    } else if (processingMode === 'mindmap') {
      // 章节思维导图模式：清除章节思维导图、思维导图箭头、合并思维导图相关缓存
      if (await this.deleteCache(fileName, 'mindmap_arrows')) deletedCount++
      if (await this.deleteCache(fileName, 'merged_mindmap')) deletedCount++

      // 清除所有章节的思维导图缓存
      const allKeys = await this.getAllKeys()
      const chapterKeys = allKeys.filter(
        (key) =>
          key.startsWith(bookPrefix) &&
          key.includes('_chapter_') &&
          key.endsWith('_mindmap')
      )

      for (const key of chapterKeys) {
        try {
          await this.store.removeItem(key)
          deletedCount++
        } catch {
          // 忽略删除失败
        }
      }
    } else if (processingMode === 'combined_mindmap') {
      // 整书思维导图模式：清除整书思维导图相关缓存
      if (await this.deleteCache(fileName, 'combined_mindmap')) deletedCount++
    }

    return deletedCount
  }

  // 清除所有缓存
  async clearAll(): Promise<void> {
    await this.store.clear()
  }

  // 获取缓存大小估算（键的数量）
  async getCacheSize(): Promise<number> {
    const keys = await this.store.keys()
    return keys.length
  }

  // 解析缓存键，提取书籍名称和缓存类型
  static parseKey(
    key: string
  ): { bookName: string; type: CacheKeyType; chapterId?: string } | null {
    // 匹配模式: book_${cleanFilename}_chapter_${chapterId}_${type} 或 book_${cleanFilename}_${type}
    const chapterMatch = key.match(/^book_(.+)_chapter_(.+)_(summary|mindmap)$/)
    if (chapterMatch) {
      return {
        bookName: chapterMatch[1],
        chapterId: chapterMatch[2],
        type: chapterMatch[3] as CacheKeyType,
      }
    }

    const bookMatch = key.match(
      /^book_(.+)_(connections|overall_summary|character_relationship|combined_mindmap|merged_mindmap|mindmap_arrows|selected_chapters|chapter_tags|custom_prompt|use_custom_only)$/
    )
    if (bookMatch) {
      return {
        bookName: bookMatch[1],
        type: bookMatch[2] as CacheKeyType,
      }
    }

    return null
  }

  // 获取所有缓存条目
  async getAllCacheEntries(): Promise<
    { key: string; bookName: string; type: CacheKeyType; chapterId?: string }[]
  > {
    const keys = await this.store.keys()
    const entries: {
      key: string
      bookName: string
      type: CacheKeyType
      chapterId?: string
    }[] = []

    for (const key of keys) {
      const parsed = CacheService.parseKey(key)
      if (parsed) {
        entries.push({
          key,
          ...parsed,
        })
      }
    }

    return entries
  }

  // 按书籍分组获取缓存条目
  async getCacheEntriesByBook(): Promise<
    Map<string, { key: string; type: CacheKeyType; chapterId?: string }[]>
  > {
    const entries = await this.getAllCacheEntries()
    const grouped = new Map<
      string,
      { key: string; type: CacheKeyType; chapterId?: string }[]
    >()

    for (const entry of entries) {
      const existing = grouped.get(entry.bookName) || []
      existing.push({
        key: entry.key,
        type: entry.type,
        chapterId: entry.chapterId,
      })
      grouped.set(entry.bookName, existing)
    }

    return grouped
  }

  // 根据键获取缓存值
  async getCacheValueByKey(key: string): Promise<CacheValue> {
    return await this.store.getItem<CacheValue>(key)
  }

  // 根据键删除缓存
  async deleteCacheByKey(key: string): Promise<boolean> {
    try {
      await this.store.removeItem(key)
      return true
    } catch {
      return false
    }
  }

  // 删除指定书籍的所有缓存
  async deleteBookAllCache(bookName: string): Promise<number> {
    const entries = await this.getAllCacheEntries()
    let deletedCount = 0

    for (const entry of entries) {
      if (entry.bookName === bookName) {
        if (await this.deleteCacheByKey(entry.key)) {
          deletedCount++
        }
      }
    }

    return deletedCount
  }
}
