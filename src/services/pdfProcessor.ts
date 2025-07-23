import * as pdfjsLib from 'pdfjs-dist'
import { SKIP_CHAPTER_KEYWORDS } from './constants'

// 设置 PDF.js worker - 使用本地文件
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/src/lib/pdf.worker.min.mjs';
}

export interface ChapterData {
  id: string
  title: string
  content: string
}

export interface BookData {
  title: string
  author: string
  totalPages: number
}

export class PdfProcessor {

  async parsePdf(file: File): Promise<BookData> {
    try {
      // 将File转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      // 使用PDF.js解析PDF文件
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      // 获取PDF元数据
      const metadata = await pdf.getMetadata()
      console.log('metadata', metadata)
      const title = (metadata.info as any)?.Title || file.name.replace('.pdf', '') || '未知标题'
      const author = (metadata.info as any)?.Author || '未知作者'
      
      console.log(`📚 [DEBUG] PDF解析完成:`, {
        title,
        author,
        totalPages: pdf.numPages
      })
      
      return {
        title,
        author,
        totalPages: pdf.numPages
      }
    } catch (error) {
      throw new Error(`解析PDF文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async extractChapters(file: File, useSmartDetection: boolean = false, skipNonEssentialChapters: boolean = true, maxSubChapterDepth: number = 0): Promise<ChapterData[]> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      const chapters: ChapterData[] = []
      const totalPages = pdf.numPages
      
      console.log(`📚 [DEBUG] 开始提取PDF内容，总页数: ${totalPages}`)
      
      // 首先尝试使用PDF的outline（书签/目录）来获取章节
      try {
        const outline = await pdf.getOutline()
        console.log('outline', outline)
        if (outline && outline.length > 0) {
          console.log(`📖 [DEBUG] 找到PDF目录，共 ${outline.length} 个条目`)
          
          // 获取章节信息
          const chapterInfos = await this.extractChaptersFromOutline(pdf, outline, 0, maxSubChapterDepth)
          
          if (chapterInfos.length > 0) {
            // 根据章节信息提取内容
            for (let i = 0; i < chapterInfos.length; i++) {
              const chapterInfo = chapterInfos[i]
              
              // 检查是否需要跳过此章节
              if (skipNonEssentialChapters && this.shouldSkipChapter(chapterInfo.title)) {
                console.log(`⏭️ [DEBUG] 跳过无关键内容章节: "${chapterInfo.title}"`)
                continue
              }
              
              const nextChapterInfo = chapterInfos[i + 1]
              
              const startPage = chapterInfo.pageIndex + 1
              const endPage = nextChapterInfo ? nextChapterInfo.pageIndex : totalPages
              
              console.log(`📄 [DEBUG] 提取章节 "${chapterInfo.title}" (第${startPage}-${endPage}页)`)
              
              const chapterContent = await this.extractTextFromPages(pdf, startPage, endPage)
              
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
      } catch (outlineError) {
        console.warn(`⚠️ [DEBUG] 无法获取PDF目录:`, outlineError)
      }
      
      // 如果没有从outline获取到章节，使用备用方法
      if (chapters.length === 0) {
        console.log(`📖 [DEBUG] 使用备用分章节方法，智能检测: ${useSmartDetection}`)
        
        // 获取所有页面的文本内容
        const allPageTexts: string[] = []
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          console.log(`📖 [DEBUG] 处理第 ${pageNum}/${totalPages} 页`)
          
          try {
            const page = await pdf.getPage(pageNum)
            const textContent = await page.getTextContent()
            
            // 提取页面文本
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
              .trim()
            
            allPageTexts.push(pageText)
            console.log(`📄 [DEBUG] 第${pageNum}页文本长度: ${pageText.length} 字符`)
          } catch (pageError) {
            console.warn(`❌ [DEBUG] 跳过第${pageNum}页:`, pageError)
            allPageTexts.push('')
          }
        }
        
        let detectedChapters: ChapterData[] = []
        
        // 只有在用户启用智能检测时才使用
        if (useSmartDetection) {
          console.log(`🧠 [DEBUG] 启用智能章节检测`)
          detectedChapters = this.detectChapters(allPageTexts)
        }
        
        if (detectedChapters.length === 0) {
          // 如果没有检测到章节，按页面分组
          const pagesPerChapter = Math.max(1, Math.floor(totalPages / 10)) // 每章最多10页
          
          for (let i = 0; i < totalPages; i += pagesPerChapter) {
            const endPage = Math.min(i + pagesPerChapter, totalPages)
            const chapterContent = allPageTexts
              .slice(i, endPage)
              .join('\n\n')
              .trim()
            
            if (chapterContent.length > 100) {
              chapters.push({
                id: `chapter-${Math.floor(i / pagesPerChapter) + 1}`,
                title: `第 ${Math.floor(i / pagesPerChapter) + 1} 部分 (第${i + 1}-${endPage}页)`,
                content: chapterContent
              })
            }
          }
        } else {
          // 使用检测到的章节
          chapters.push(...detectedChapters)
        }
      }
      
      console.log(`📊 [DEBUG] 最终提取到 ${chapters.length} 个章节`)
      
      if (chapters.length === 0) {
        throw new Error('未找到有效的章节内容')
      }
      
      return chapters
    } catch (error) {
      console.error(`❌ [DEBUG] 提取章节失败:`, error)
      throw new Error(`提取章节失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  private async extractChaptersFromOutline(pdf: any, outline: any[], currentDepth: number = 0, maxDepth: number = 0): Promise<{title: string, pageIndex: number}[]> {
    const chapterInfos: {title: string, pageIndex: number}[] = []
    
    for (const item of outline) {
      try {
        if (item.dest) {
          // 处理目标引用
          let destArray
          if (typeof item.dest === 'string') {
            destArray = await pdf.getDestination(item.dest)
          } else {
            destArray = item.dest
          }
          
          if (destArray && destArray[0]) {
            const ref = destArray[0]
            const pageIndex = await pdf.getPageIndex(ref)
            
            chapterInfos.push({
              title: item.title || `章节 ${chapterInfos.length + 1}`,
              pageIndex: pageIndex
            })
            
            console.log(`📖 [DEBUG] 章节: "${item.title}" -> 第${pageIndex + 1}页`)
          }
        }
        
        // 递归处理子章节
        if (item.items && item.items.length > 0) {
          // 只有当maxDepth大于0且当前深度小于最大深度时才递归处理子章节
          if (maxDepth > 0 && currentDepth < maxDepth) {
            const subChapters = await this.extractChaptersFromOutline(pdf, item.items, currentDepth + 1, maxDepth)
            chapterInfos.push(...subChapters)
          }
        }
      } catch (error) {
        console.warn(`⚠️ [DEBUG] 跳过章节 "${item.title}":`, error)
      }
    }
    
    // 按页面索引排序
    chapterInfos.sort((a, b) => a.pageIndex - b.pageIndex)
    
    return chapterInfos
  }

  private async extractTextFromPages(pdf: any, startPage: number, endPage: number): Promise<string> {
    const pageTexts: string[] = []
    
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim()
        
        if (pageText.length > 0) {
          pageTexts.push(pageText)
        }
      } catch (error) {
        console.warn(`⚠️ [DEBUG] 跳过第${pageNum}页:`, error)
      }
    }
    
    return pageTexts.join('\n\n')
  }

  private detectChapters(pageTexts: string[]): ChapterData[] {
    const chapters: ChapterData[] = []
    const chapterPatterns = [
      /^第[一二三四五六七八九十\d]+章[\s\S]*$/m,
      /^Chapter\s+\d+[\s\S]*$/mi,
      /^第[一二三四五六七八九十\d]+节[\s\S]*$/m,
      /^\d+\.[\s\S]*$/m,
      /^[一二三四五六七八九十]、[\s\S]*$/m
    ]
    
    let currentChapter: { title: string; content: string; startPage: number } | null = null
    let chapterCount = 0
    
    for (let i = 0; i < pageTexts.length; i++) {
      const pageText = pageTexts[i].trim()
      if (pageText.length < 50) continue // 跳过内容太少的页面
      
      // 检查是否是新章节的开始
      let isNewChapter = false
      let chapterTitle = ''
      
      for (const pattern of chapterPatterns) {
        const match = pageText.match(pattern)
        if (match) {
          // 提取章节标题（取前100个字符作为标题）
          const titleMatch = pageText.match(/^(.{1,100})/)
          chapterTitle = titleMatch ? titleMatch[1].trim() : `章节 ${chapterCount + 1}`
          isNewChapter = true
          break
        }
      }
      
      if (isNewChapter) {
        // 保存上一个章节
        if (currentChapter && currentChapter.content.trim().length > 200) {
          chapters.push({
            id: `chapter-${chapterCount}`,
            title: currentChapter.title,
            content: currentChapter.content.trim()
          })
        }
        
        // 开始新章节
        chapterCount++
        currentChapter = {
          title: chapterTitle,
          content: pageText,
          startPage: i + 1
        }
        
        console.log(`📖 [DEBUG] 检测到新章节: "${chapterTitle}" (第${i + 1}页)`)
      } else if (currentChapter) {
        // 添加到当前章节
        currentChapter.content += '\n\n' + pageText
      } else {
        // 如果还没有章节，创建第一个章节
        chapterCount++
        currentChapter = {
          title: `第 ${chapterCount} 章`,
          content: pageText,
          startPage: i + 1
        }
      }
    }
    
    // 保存最后一个章节
    if (currentChapter && currentChapter.content.trim().length > 200) {
      chapters.push({
        id: `chapter-${chapterCount}`,
        title: currentChapter.title,
        content: currentChapter.content.trim()
      })
    }
    
    console.log(`🔍 [DEBUG] 章节检测完成，找到 ${chapters.length} 个章节`)
    
    return chapters
  }

  // 检查是否应该跳过某个章节
  private shouldSkipChapter(title: string): boolean {
    const normalizedTitle = title.toLowerCase().trim()
    
    return SKIP_CHAPTER_KEYWORDS.some(keyword => 
      normalizedTitle.includes(keyword)
    )
  }

}