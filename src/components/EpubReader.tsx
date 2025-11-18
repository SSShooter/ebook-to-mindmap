import { useState, useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ChapterData, BookData } from '@/services/epubProcessor'
import { EpubProcessor } from '@/services/epubProcessor'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'

interface EpubReaderProps {
  initialChapterId: string
  chapterIds: string[]
  chapters: ChapterData[]
  bookData?: BookData
  onClose: () => void
  className?: string
}

export function EpubReader({ initialChapterId, chapterIds, chapters, bookData, onClose, className }: EpubReaderProps) {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(() => 
    chapterIds.indexOf(initialChapterId)
  )
  const [chapterHtmlContent, setChapterHtmlContent] = useState<string>('')
  const [isLoadingHtml, setIsLoadingHtml] = useState(false)
  const [epubProcessor] = useState(() => new EpubProcessor())
  const shadowRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const chapter = chapters.find(ch => ch.id === chapterIds[currentIndex])!
  const hasMultipleChapters = chapterIds.length > 1
  const canGoPrevious = hasMultipleChapters && currentIndex > 0
  const canGoNext = hasMultipleChapters && currentIndex < chapterIds.length - 1

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  // 使用 Shadow DOM 来隔离 EPUB 内容样式
  useEffect(() => {
    if (!shadowRef.current) return
    
    const content = chapterHtmlContent || chapter.content
    if (!content) return

    const shadowRoot = shadowRef.current.shadowRoot || shadowRef.current.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = `
      <style>
        * {
          max-width: 100%;
          box-sizing: border-box;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        div {
          width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
      </style>
      <div>${content}</div>
    `
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
    <div className={cn("w-full h-full flex flex-col", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-2">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{chapter.title}</h2>
            {hasMultipleChapters && (
              <Badge variant="secondary" className="text-xs">
                {currentIndex + 1} / {chapterIds.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Navigation */}
        {hasMultipleChapters && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {currentIndex + 1} / {chapterIds.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={!canGoNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <Separator className="mb-3" />

      {/* Content */}
      <div className="flex-1 min-h-0 p-2">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="prose prose-sm max-w-none px-1">
            {isLoadingHtml ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>{t('reader.epub.loadingContent')}</span>
              </div>
            ) : (
              <div ref={shadowRef} className="w-full min-h-[200px]" />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}