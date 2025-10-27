import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2 } from 'lucide-react'
import type { ChapterData, BookData } from '@/services/epubProcessor'
import { EpubProcessor } from '@/services/epubProcessor'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface EpubReaderProps {
  chapter: ChapterData
  bookData?: BookData
  onClose: () => void
  className?: string
}

export function EpubReader({ chapter, bookData, onClose, className }: EpubReaderProps) {
  const { t } = useTranslation()
  const [chapterHtmlContent, setChapterHtmlContent] = useState<string>('')
  const [isLoadingHtml, setIsLoadingHtml] = useState(false)
  const [epubProcessor] = useState(() => new EpubProcessor())
  const shadowRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 使用 Shadow DOM 来隔离 EPUB 内容样式
  useEffect(() => {
    if (!shadowRef.current) return
    
    const content = chapterHtmlContent || chapter.content
    if (!content) return

    const shadowRoot = shadowRef.current.shadowRoot || shadowRef.current.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = `<div>${content}</div>`
  }, [chapterHtmlContent, chapter.content])

  // 加载章节的HTML内容
  useEffect(() => {
    const loadChapterHtml = async () => {
      if (!chapter || !bookData) {
        setChapterHtmlContent('')
        return
      }

      setIsLoadingHtml(true)
      try {
        const htmlContent = await epubProcessor.getSingleChapterHTML(bookData.book, chapter.href || '')
        setChapterHtmlContent(htmlContent)
      } catch (error) {
        console.error('加载章节HTML失败:', error)
        // 如果获取HTML失败，回退到使用原始content
        setChapterHtmlContent(chapter.content)
      } finally {
        setIsLoadingHtml(false)
        // 章节加载完成后滚动到顶部
        if (scrollAreaRef.current) {
          const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollViewport) {
            scrollViewport.scrollTop = 0
          }
        }
      }
    }

    loadChapterHtml()
  }, [chapter, bookData, epubProcessor])

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* 主要阅读区域 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {chapter.title}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              {t('reader.epub.close')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ScrollArea ref={scrollAreaRef} className="h-[80vh]">
            <div className="prose prose-sm max-w-none">
              {isLoadingHtml ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>{t('reader.epub.loadingContent')}</span>
                </div>
              ) : (
                <div ref={shadowRef} className="w-full min-h-[200px]" />
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}