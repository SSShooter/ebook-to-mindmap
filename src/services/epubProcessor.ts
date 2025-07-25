import ePub, { Book } from '@ssshooter/epubjs'
import { SKIP_CHAPTER_KEYWORDS } from './constants'


export interface ChapterData {
  id: string
  title: string
  content: string
}

export interface BookData {
  book: any // epub.js Book instance
  title: string
  author: string
}

export class EpubProcessor {
  async parseEpub(file: File): Promise<BookData> {
    try {
      // 将File转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // 使用epub.js解析EPUB文件
      const book = ePub()
      await book.open(arrayBuffer)

      // 等待书籍加载完成
      await book.ready

      // 获取书籍元数据
      const title = book.packaging?.metadata?.title || '未知标题'
      const author = book.packaging?.metadata?.creator || '未知作者'

      return {
        book,
        title,
        author
      }
    } catch (error) {
      throw new Error(`解析EPUB文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async extractChapters(book: Book, useSmartDetection: boolean = false, skipNonEssentialChapters: boolean = true, maxSubChapterDepth: number = 0): Promise<ChapterData[]> {
    try {
      const chapters: ChapterData[] = []

      try {
        const toc = book.navigation.toc
        if (toc && toc.length > 0) {

          // 获取章节信息
          const chapterInfos = await this.extractChaptersFromToc(book, toc, 0, maxSubChapterDepth)
          console.log(`📚 [DEBUG] 找到 ${chapterInfos.length} 个章节信息`, chapterInfos)
          if (chapterInfos.length > 0) {
            // 根据章节信息提取内容
            for (const chapterInfo of chapterInfos) {
              // 检查是否需要跳过此章节
              if (skipNonEssentialChapters && this.shouldSkipChapter(chapterInfo.title)) {
                console.log(`⏭️ [DEBUG] 跳过无关键内容章节: "${chapterInfo.title}"`)
                continue
              }

              console.log(`📄 [DEBUG] 提取章节 "${chapterInfo.title}" (href: ${chapterInfo.href})`)

              const chapterContent = await this.extractContentFromHref(book, chapterInfo.href, chapterInfo.subitems)

              if (chapterContent.trim().length > 100) {
                chapters.push({
                  id: `chapter-${chapters.length + 1}`,
                  title: chapterInfo.title,
                  content: chapterContent
                })
              }
            }
          }
        }
      } catch (tocError) {
        console.warn(`⚠️ [DEBUG] 无法获取EPUB目录:`, tocError)
      }
      // 应用智能章节检测
      const finalChapters = this.detectChapters(chapters, useSmartDetection)
      console.log(`📊 [DEBUG] 最终提取到 ${finalChapters.length} 个章节`)

      return finalChapters
    } catch (error) {
      console.error(`❌ [DEBUG] 提取章节失败:`, error)
      throw new Error(`提取章节失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  private async extractChaptersFromToc(book: Book, toc: any[], currentDepth: number = 0, maxDepth: number = 0): Promise<{ title: string, href: string, subitems?: any[] }[]> {
    const chapterInfos: { title: string, href: string, subitems?: any[] }[] = []

    for (const item of toc) {
      try {
        if (item.subitems && item.subitems.length > 0 && maxDepth > 0 && currentDepth < maxDepth) {
          const subChapters = await this.extractChaptersFromToc(book, item.subitems, currentDepth + 1, maxDepth)
          chapterInfos.push(...subChapters)
        } else if (item.href) {
          const chapterInfo: { title: string, href: string, subitems?: any[] } = {
            title: item.label || `章节 ${chapterInfos.length + 1}`,
            href: item.href,
            subitems: item.subitems
          }
          chapterInfos.push(chapterInfo)
        }
      } catch (error) {
        console.warn(`⚠️ [DEBUG] 跳过章节 "${item.label}":`, error)
      }
    }

    return chapterInfos
  }

  private async extractContentFromHref(book: Book, href: string, subitems?: any[]): Promise<string> {
    try {
      console.log(`🔍 [DEBUG] 尝试通过href获取章节内容: ${href}`)

      // 清理href，移除锚点部分
      const cleanHref = href.split('#')[0]

      let allContent = ''

      // 首先获取主章节内容
      const mainContent = await this.getSingleChapterContent(book, cleanHref)
      if (mainContent) {
        allContent += mainContent
      }

      // 如果有子项目，也要获取子项目的内容
      if (subitems && subitems.length > 0) {

        for (const subitem of subitems) {
          if (subitem.href) {
            const subContent = await this.getSingleChapterContent(book, subitem.href.split('#')[0])
            if (subContent) {
              allContent += '\n\n' + subContent
            }
          }
        }
      }
      console.log(`✅ [DEBUG] allContent`, allContent.length)

      return allContent
    } catch (error) {
      console.warn(`❌ [DEBUG] 提取章节内容失败 (href: ${href}):`, error)
      return ''
    }
  }

  private async getSingleChapterContent(book: Book, href: string): Promise<string> {
    try {
      let section = null
      const spineItems = book.spine.spineItems

      for (let i = 0; i < spineItems.length; i++) {
        const spineItem = spineItems[i]

        if (spineItem.href === href || spineItem.href.endsWith(href)) {
          section = book.spine.get(i)
          break
        }
      }

      if (!section) {
        console.warn(`❌ [DEBUG] 无法获取章节: ${href}`)
        return ''
      }

      // 读取章节内容
      const chapterHTML = await section.render(book.load.bind(book))

      // 提取纯文本内容
      const { textContent } = this.extractTextFromXHTML(chapterHTML)

      // 卸载章节内容以释放内存
      section.unload()

      return textContent
    } catch (error) {
      console.warn(`❌ [DEBUG] 获取单个章节内容失败 (href: ${href}):`, error)
      return ''
    }
  }

  private shouldSkipChapter(title: string): boolean {
    if (!title) return false

    const normalizedTitle = title.toLowerCase().trim()
    return SKIP_CHAPTER_KEYWORDS.some(keyword =>
      normalizedTitle.includes(keyword.toLowerCase())
    )
  }

  private extractTextFromXHTML(xhtmlContent: string): { textContent: string } {
    try {
      console.log(`🔍 [DEBUG] 开始解析XHTML内容，长度: ${xhtmlContent.length}`)

      // 创建一个临时的DOM解析器
      const parser = new DOMParser()
      const doc = parser.parseFromString(xhtmlContent, 'application/xhtml+xml')

      // 检查解析错误
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        console.warn(`⚠️ [DEBUG] DOM解析出现错误，将使用正则表达式备选方案:`, parseError.textContent)
        throw new Error('DOM解析失败')
      }

      // 提取正文内容
      const body = doc.querySelector('body')
      if (!body) {
        throw new Error('未找到body元素')
      }

      // 移除脚本和样式标签
      const scripts = body.querySelectorAll('script, style')
      scripts.forEach(el => el.remove())

      // 获取纯文本内容
      let textContent = body.textContent || ''

      // 清理文本：移除多余的空白字符
      textContent = textContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim()

      console.log(`✨ [DEBUG] 清理后文本长度: ${textContent.length}`)

      return { textContent }
    } catch (error) {
      console.warn(`⚠️ [DEBUG] DOM解析失败，使用正则表达式备选方案:`, error)
      // 如果DOM解析失败，使用正则表达式作为备选方案
      return this.extractTextWithRegex(xhtmlContent)
    }
  }

  private extractTextWithRegex(xhtmlContent: string): { title: string; textContent: string } {
    console.log(`🔧 [DEBUG] 使用正则表达式方案解析内容，长度: ${xhtmlContent.length}`)

    // 移除XML声明和DOCTYPE
    let content = xhtmlContent.replace(/<\?xml[^>]*\?>/gi, '')
    content = content.replace(/<!DOCTYPE[^>]*>/gi, '')
    console.log(`🧹 [DEBUG] 移除XML声明后长度: ${content.length}`)

    // 提取标题
    let title = ''
    const titleMatch = content.match(/<(?:h[1-6]|title)[^>]*>([^<]+)<\/(?:h[1-6]|title)>/i)
    if (titleMatch) {
      title = titleMatch[1].trim()
      console.log(`📋 [DEBUG] 正则提取到标题: "${title}"`)
    } else {
      console.log(`📋 [DEBUG] 正则未找到标题`)
    }

    // 移除HTML标签
    let textContent = content.replace(/<[^>]+>/g, ' ')
    console.log(`🏷️ [DEBUG] 移除HTML标签后长度: ${textContent.length}`)

    // 解码HTML实体
    textContent = textContent
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
    console.log(`🔤 [DEBUG] 解码HTML实体后长度: ${textContent.length}`)

    // 清理空白字符
    textContent = textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()

    console.log(`✨ [DEBUG] 正则方案最终文本长度: ${textContent.length}`)
    console.log(`✨ [DEBUG] 正则方案文本预览 (前100字符): "${textContent}"`)

    return { title, textContent }
  }

  private detectChapters(chapters: ChapterData[], useSmartDetection: boolean): ChapterData[] {
    if (!useSmartDetection) {
      return chapters
    }

    console.log(`🧠 [DEBUG] 启用EPUB智能章节检测，原始章节数: ${chapters.length}`)

    const chapterPatterns = [
      /^第[一二三四五六七八九十\d]+章[\s\S]*$/m,
      /^Chapter\s+\d+[\s\S]*$/mi,
      /^第[一二三四五六七八九十\d]+节[\s\S]*$/m,
      /^\d+\.[\s\S]*$/m,
      /^[一二三四五六七八九十]、[\s\S]*$/m
    ]

    const detectedChapters: ChapterData[] = []
    let currentChapter: { id: string; title: string; content: string } | null = null
    let chapterCount = 0

    for (const chapter of chapters) {
      const content = chapter.content.trim()
      if (content.length < 100) continue // 跳过内容太少的章节

      // 检查是否是新章节的开始
      let isNewChapter = false
      let chapterTitle = chapter.title

      // 如果原标题不明确，尝试从内容中提取
      if (!chapterTitle || chapterTitle.includes('章节') || chapterTitle.includes('Chapter')) {
        for (const pattern of chapterPatterns) {
          const match = content.match(pattern)
          if (match) {
            // 提取章节标题（取前100个字符作为标题）
            const titleMatch = content.match(/^(.{1,100})/)
            chapterTitle = titleMatch ? titleMatch[1].trim() : `章节 ${chapterCount + 1}`
            isNewChapter = true
            break
          }
        }
      }

      if (isNewChapter || !currentChapter) {
        // 保存上一个章节
        if (currentChapter && currentChapter.content.trim().length > 200) {
          detectedChapters.push({
            id: currentChapter.id,
            title: currentChapter.title,
            content: currentChapter.content.trim()
          })
        }

        // 开始新章节
        chapterCount++
        currentChapter = {
          id: chapter.id || `chapter-${chapterCount}`,
          title: chapterTitle || `第 ${chapterCount} 章`,
          content: content
        }

        console.log(`📖 [DEBUG] 检测到新章节: "${chapterTitle}"`)
      } else {
        // 合并到当前章节
        currentChapter.content += '\n\n' + content
      }
    }

    // 保存最后一个章节
    if (currentChapter && currentChapter.content.trim().length > 200) {
      detectedChapters.push({
        id: currentChapter.id,
        title: currentChapter.title,
        content: currentChapter.content.trim()
      })
    }

    console.log(`🔍 [DEBUG] EPUB章节检测完成，找到 ${detectedChapters.length} 个章节`)

    return detectedChapters.length > 0 ? detectedChapters : chapters
  }
}