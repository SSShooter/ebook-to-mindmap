import ePub, { Book } from '@ssshooter/epubjs'


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
  private readonly skipChapterKeywords = [
    'acknowledgments', 'acknowledgement', 'thanks', 'gratitude',
    'recommended reading', 'further reading', 'bibliography', 'references',
    'about the author', 'about author', 'author bio', 'biography',
    'praise for', 'reviews', 'testimonials', 'endorsements',
    'title page', 'copyright', 'dedication', 'contents', 'table of contents',
    'index', 'glossary', 'appendix', 'notes', 'endnotes', 'footnotes'
  ]
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

  async extractChapters(book: Book, useSmartDetection: boolean = false, skipNonEssentialChapters: boolean = true): Promise<ChapterData[]> {
    try {
      const chapters: ChapterData[] = []
      
      // 获取spine（阅读顺序）
      const spineItems = book.spine.spineItems
      console.log(`📚 [DEBUG] 找到 ${spineItems.length} 个spine项目`, spineItems)
      
      for (let i = 0; i < spineItems.length; i++) {
        const spineItem = spineItems[i]
        console.log(`📖 [DEBUG] 处理第 ${i + 1}/${spineItems.length} 个spine项目:`, {
          id: spineItem.idref,
          href: spineItem.href,
          index: spineItem.index
        })
        
        try {
          // 加载章节内容
          const section = book.spine.get(i)
          if (!section) {
            console.warn(`⚠️ [DEBUG] 无法获取第 ${i} 个章节`)
            continue
          }
          
          // 读取章节内容
          const chapterHTML = await section.render(book.load.bind(book))
          
          // section.load返回的是DOM元素，需要转换为字符串
          console.log(`📄 [DEBUG] 读取到内容长度: ${chapterHTML.length} 字符`)
          
          // 提取章节标题和纯文本内容
          const { title, textContent } = this.extractTextFromXHTML(chapterHTML)
          console.log(`📝 [DEBUG] 提取结果:`, {
            title: title,
            contentLength: textContent.trim().length,
          })
          
          // 检查是否应该跳过此章节
          if (skipNonEssentialChapters && this.shouldSkipChapter(title)) {
            console.log(`⚠️ [DEBUG] 跳过章节 "${title}" - 匹配跳过关键词`)
            continue
          }
          
          if (textContent.trim().length > 100) { // 过滤掉太短的内容
            chapters.push({
              id: spineItem.idref || `chapter-${i}`,
              title: title || `章节 ${chapters.length + 1}`,
              content: textContent
            })
            console.log(`✅ [DEBUG] 添加章节: ${title || `章节 ${chapters.length}`} (${textContent.trim().length} 字符)`)
          } else {
            console.log(`⚠️ [DEBUG] 跳过内容过短的项目: ${spineItem.idref} (${textContent.trim().length} 字符)`)
          }
          
          // 卸载章节内容以释放内存
          section.unload()
        } catch (itemError) {
          console.warn(`❌ [DEBUG] 跳过章节 ${spineItem.idref}:`, itemError)
          continue
        }
      }
      console.log(`📊 [DEBUG] 初步提取到 ${chapters.length} 个有效章节`)
      
      if (chapters.length === 0) {
        console.error(`❌ [DEBUG] 未找到有效章节内容，spine项目总数: ${spineItems.length}`)
        throw new Error('未找到有效的章节内容')
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

  private shouldSkipChapter(title: string): boolean {
    if (!title) return false
    
    const normalizedTitle = title.toLowerCase().trim()
    return this.skipChapterKeywords.some(keyword => 
      normalizedTitle.includes(keyword.toLowerCase())
    )
  }

  private extractTextFromXHTML(xhtmlContent: string): { title: string; textContent: string } {
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
      
      // 提取标题
      let title = ''
      const titleElements = doc.querySelectorAll('h1, h2, h3, title')
      console.log(`📋 [DEBUG] 找到 ${titleElements.length} 个标题元素`)
      if (titleElements.length > 0) {
        const titleTexts = []
        for (let i = 0; i < Math.min(2, titleElements.length); i++) {
          const text = titleElements[i].textContent?.trim()
          if (text) {
            titleTexts.push(text)
          }
        }
        title = titleTexts.join(' - ')
        console.log(`📋 [DEBUG] 提取到标题: "${title}"`)
      }
      
      // 提取正文内容
      const body = doc.querySelector('body')
      if (!body) {
        console.warn(`⚠️ [DEBUG] 未找到body元素，将使用整个文档`)
        throw new Error('未找到body元素')
      }
      
      console.log(`📄 [DEBUG] 找到body元素，子元素数量: ${body.children.length}`)
      
      // 移除脚本和样式标签
      const scripts = body.querySelectorAll('script, style')
      console.log(`🧹 [DEBUG] 移除 ${scripts.length} 个script/style标签`)
      scripts.forEach(el => el.remove())
      
      // 获取纯文本内容
      let textContent = body.textContent || ''
      console.log(`📝 [DEBUG] 原始文本内容长度: ${textContent.length}`)
      console.log(`📝 [DEBUG] 原始文本预览 (前100字符): "${textContent.substring(0, 100)}"`)
      
      // 清理文本：移除多余的空白字符
      textContent = textContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim()
      
      console.log(`✨ [DEBUG] 清理后文本长度: ${textContent.length}`)
      console.log(`✨ [DEBUG] 清理后文本预览 (前100字符): "${textContent}"`)
      
      return { title, textContent }
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