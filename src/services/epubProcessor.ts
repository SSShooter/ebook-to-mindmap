import ePub, { Book, type NavItem } from '@ssshooter/epubjs'
import { SKIP_CHAPTER_KEYWORDS } from './constants'
import { htmlToMarkdown } from '../utils/htmlToMarkdown'
import type Section from '@ssshooter/epubjs/types/section'

export interface ChapterData {
  id: string
  title: string
  content: string
  // 章节定位信息，用于后续打开对应书页
  href?: string // 章节的href路径（用于定位和调试信息）
  tocItem?: NavItem // 原始的TOC项目信息
  depth?: number // 章节层级深度
}

export interface BookData {
  book: Book // epub.js Book instance
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
        author,
      }
    } catch (error) {
      throw new Error(
        `解析EPUB文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  async extractChapters(
    book: Book,
    skipNonEssentialChapters: boolean = true,
    maxSubChapterDepth: number = 0,
    forceUseSpine: boolean = false
  ): Promise<ChapterData[]> {
    try {
      const chapters: ChapterData[] = []

      try {
        const toc = book.navigation.toc.filter(
          (item) => !item.href.includes('#')
        )
        // 获取章节信息（先按原始 TOC）
        let chapterInfos = await this.extractChaptersFromToc(
          book,
          toc,
          0,
          maxSubChapterDepth
        )
        console.log(
          `📚 [DEBUG] 找到 ${chapterInfos.length} 个章节信息`,
          chapterInfos
        )

        // 回退：当 TOC 长度≤3 或强制使用 Spine 时，直接用 spineItems 生成章节信息
        if (toc.length <= 3 || forceUseSpine) {
          const fallbackChapterInfos = book.spine.spineItems
            .map((spineItem: Section, idx: number) => {
              const navItem: NavItem = {
                id: spineItem.idref || `spine-${idx + 1}`,
                href: spineItem.href,
                label: spineItem.idref || `章节 ${idx + 1}`,
                subitems: [],
              }
              return {
                title: navItem.label || `章节 ${idx + 1}`,
                href: navItem.href!,
                subitems: [],
                tocItem: navItem,
                depth: 0,
              }
            })
            .filter((item) => !!item.href)
          console.log(
            '🔁 [DEBUG] 使用 spineItems 生成章节信息',
            fallbackChapterInfos
          )

          if (forceUseSpine) {
            console.log(
              '🔁 [DEBUG] 强制使用Spine获取章节，章节数:',
              fallbackChapterInfos.length
            )
            chapterInfos = fallbackChapterInfos
          } else {
            console.log(
              '🔁 [DEBUG] TOC长度≤3，直接用 spineItems 生成章节信息，fallback 章节数:',
              fallbackChapterInfos.length
            )
            if (fallbackChapterInfos.length >= chapterInfos.length) {
              chapterInfos = fallbackChapterInfos
            }
          }
        }
        if (chapterInfos.length > 0) {
          // 根据章节信息提取内容
          for (const chapterInfo of chapterInfos) {
            // 检查是否需要跳过此章节
            if (
              skipNonEssentialChapters &&
              this.shouldSkipChapter(chapterInfo.title)
            ) {
              console.log(
                `⏭️ [DEBUG] 跳过无关键内容章节: "${chapterInfo.title}"`
              )
              continue
            }

            console.log(
              `📄 [DEBUG] 提取章节 "${chapterInfo.title}" (href: ${chapterInfo.href})`
            )

            const { title: extractedTitle, content: chapterContent } =
              await this.extractContentFromHref(
                book,
                chapterInfo.href,
                chapterInfo.subitems
              )

            if (chapterContent.trim().length > 100) {
              // 如果从HTML中提取到了h2标题，优先使用；否则保留原标题
              const finalTitle = extractedTitle || chapterInfo.title
              chapters.push({
                id: finalTitle + chapterInfo.href, // 使用href而不是title作为ID，确保唯一性
                title: finalTitle,
                content: chapterContent,
                href: chapterInfo.href,
                tocItem: chapterInfo.tocItem,
                depth: chapterInfo.depth,
              })
            }
          }
        }
      } catch (tocError) {
        console.warn(`⚠️ [DEBUG] 无法获取EPUB目录:`, tocError)
      }
      // 按 href 去重：保留最后一个出现的条目（章节标题通常比篇/部分标题更具体）
      const seenHrefs = new Set<string>()
      const deduplicatedChapters: ChapterData[] = []
      for (let i = chapters.length - 1; i >= 0; i--) {
        const ch = chapters[i]
        if (ch.href && !seenHrefs.has(ch.href)) {
          seenHrefs.add(ch.href)
          deduplicatedChapters.unshift(ch)
        }
      }
      return deduplicatedChapters
    } catch (error) {
      console.error(`❌ [DEBUG] 提取章节失败:`, error)
      throw new Error(
        `提取章节失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  private async extractChaptersFromToc(
    book: Book,
    toc: NavItem[],
    currentDepth: number = 0,
    maxDepth: number = 0
  ): Promise<
    {
      title: string
      href: string
      subitems?: NavItem[]
      tocItem: NavItem
      depth: number
    }[]
  > {
    const chapterInfos: {
      title: string
      href: string
      subitems?: NavItem[]
      tocItem: NavItem
      depth: number
    }[] = []

    for (const item of toc) {
      try {
        if (
          item.subitems &&
          item.subitems.length > 0 &&
          maxDepth > 0 &&
          currentDepth < maxDepth
        ) {
          const subChapters = await this.extractChaptersFromToc(
            book,
            item.subitems,
            currentDepth + 1,
            maxDepth
          )
          chapterInfos.push(...subChapters)
        } else if (item.href) {
          const chapterInfo: {
            title: string
            href: string
            subitems?: NavItem[]
            tocItem: NavItem
            depth: number
          } = {
            title: item.label || `章节 ${chapterInfos.length + 1}`,
            href: item.href,
            subitems: item.subitems,
            tocItem: item, // 保存原始TOC项目信息
            depth: currentDepth, // 保存章节层级深度
          }
          chapterInfos.push(chapterInfo)
        }
      } catch (error) {
        console.warn(`⚠️ [DEBUG] 跳过章节 "${item.label}":`, error)
      }
    }

    return chapterInfos
  }

  private async extractContentFromHref(
    book: Book,
    href: string,
    subitems?: NavItem[]
  ): Promise<{ title: string; content: string }> {
    try {
      console.log(`🔍 [DEBUG] 尝试通过href获取章节内容: ${href}`)

      // 清理href，移除锚点部分
      const cleanHref = href.split('#')[0]

      let allContent = ''
      let extractedTitle = ''

      // 首先获取主章节内容
      const { title: mainTitle, content: mainContent } =
        await this.getSingleChapterContent(book, cleanHref)
      if (mainContent) {
        allContent += mainContent
      }
      // 使用主章节的h2标题（如果有）
      if (mainTitle) {
        extractedTitle = mainTitle
      }

      // 如果有子项目，也要获取子项目的内容
      if (subitems && subitems.length > 0) {
        for (const subitem of subitems) {
          if (subitem.href) {
            const subCleanHref = subitem.href.split('#')[0]
            if (cleanHref === subCleanHref) {
              continue
            }
            const { content: subContent } = await this.getSingleChapterContent(
              book,
              subCleanHref
            )
            if (subContent) {
              allContent += '\n\n' + subContent
            }
          }
        }
      }
      console.log(`✅ [DEBUG] allContent`, allContent.length)

      return { title: extractedTitle, content: allContent }
    } catch (error) {
      console.warn(`❌ [DEBUG] 提取章节内容失败 (href: ${href}):`, error)
      return { title: '', content: '' }
    }
  }

  private async getSingleChapterContent(
    book: Book,
    href: string
  ): Promise<{ title: string; content: string }> {
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
        return { title: '', content: '' }
      }

      // 读取章节内容
      const chapterHTML = await section.render(book.load.bind(book))

      // 提取标题和纯文本内容（一次性解析）
      const { title, textContent } = this.extractTextFromXHTML(chapterHTML)

      // 卸载章节内容以释放内存
      section.unload()

      return { title, content: textContent }
    } catch (error) {
      console.warn(`❌ [DEBUG] 获取单个章节内容失败 (href: ${href}):`, error)
      return { title: '', content: '' }
    }
  }

  private shouldSkipChapter(title: string): boolean {
    if (!title) return false

    return SKIP_CHAPTER_KEYWORDS.some((keyword) =>
      title.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  private extractTextFromXHTML(xhtmlContent: string): {
    title: string
    textContent: string
  } {
    try {
      console.log(`🔍 [DEBUG] 开始解析XHTML内容，长度: ${xhtmlContent.length}`)

      // 创建一个临时的DOM解析器
      const parser = new DOMParser()
      const doc = parser.parseFromString(xhtmlContent, 'application/xhtml+xml')

      // 检查解析错误
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        throw new Error('DOM解析失败')
      }

      // 提取正文内容
      const body = doc.querySelector('body')
      if (!body) {
        throw new Error('未找到body元素')
      }

      // 尝试提取h1或h2标签作为标题（优先h1）
      let title = ''
      const h1Element = body.querySelector('h1')
      const h2Element = body.querySelector('h2')
      if (h1Element) {
        title = h1Element.textContent?.trim() || ''
      } else if (h2Element) {
        title = h2Element.textContent?.trim() || ''
      }

      // 移除脚本和样式标签
      const scripts = body.querySelectorAll('script, style')
      scripts.forEach((el) => el.remove())

      // 获取Markdown内容
      let textContent = htmlToMarkdown(body.innerHTML)

      console.log(`✨ [DEBUG] 转换Markdown后文本长度: ${textContent.length}`)

      return { title, textContent }
    } catch (error) {
      console.warn(`⚠️ [DEBUG] DOM解析失败，使用正则表达式备选方案:`, error)
      // 如果DOM解析失败，使用正则表达式作为备选方案
      return this.extractTextWithRegex(xhtmlContent)
    }
  }

  private extractTextWithRegex(xhtmlContent: string): {
    title: string
    textContent: string
  } {
    console.log(
      `🔧 [DEBUG] 使用正则表达式方案解析内容，长度: ${xhtmlContent.length}`
    )

    // 移除XML声明和DOCTYPE
    let cleanContent = xhtmlContent
      .replace(/<\?xml[^>]*\?>/gi, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')

    // 移除脚本和样式标签及其内容
    cleanContent = cleanContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

    // 提取标题（通常在h1-h6标签中）
    const titleMatch = cleanContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : ''

    // 移除所有HTML标签
    let textContent = cleanContent.replace(/<[^>]*>/g, ' ')

    // 解码HTML实体
    textContent = textContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    // 清理空白字符
    textContent = textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()

    console.log(
      `✨ [DEBUG] 正则表达式方案 - 标题: "${title}", 文本长度: ${textContent.length}`
    )

    return { title, textContent }
  }

  // 新增方法：获取章节的HTML内容（不影响原有功能）
  async getSingleChapterHTML(book: Book, href: string): Promise<string> {
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
        console.warn(`❌ [DEBUG] 无法获取章节HTML: ${href}`)
        return ''
      }

      // 读取章节内容
      const chapterHTML = await section.render(book.load.bind(book))

      // 卸载章节内容以释放内存
      section.unload()

      return chapterHTML
    } catch (error) {
      console.warn(`❌ [DEBUG] 获取章节HTML失败 (href: ${href}):`, error)
      return ''
    }
  }
}
