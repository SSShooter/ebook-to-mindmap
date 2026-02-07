import { useState, useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ChapterData, BookData } from '@/services/pdfProcessor'
import { PdfProcessor } from '@/services/pdfProcessor'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'

interface PdfReaderProps {
  initialChapterId: string
  chapterIds: string[]
  chapters: ChapterData[]
  bookData?: BookData
  onClose: () => void
  className?: string
}

interface PageContent {
  canvas?: HTMLCanvasElement
}

const pdfProcessor = new PdfProcessor()
export function PdfReader({
  initialChapterId,
  chapterIds,
  chapters,
  bookData,
  onClose,
  className,
}: PdfReaderProps) {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(() =>
    chapterIds.indexOf(initialChapterId)
  )
  const [chapterPages, setChapterPages] = useState<PageContent[]>([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isLoadingPages, setIsLoadingPages] = useState(false)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const chapter = chapters.find((ch) => ch.id === chapterIds[currentIndex])!
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

  // 加载章节的页面内容
  useEffect(() => {
    const loadChapterPages = async () => {
      if (!chapter || !bookData?.pdfDocument) {
        setChapterPages([])
        return
      }

      setIsLoadingPages(true)
      try {
        const pages = await pdfProcessor.getChapterPages(
          bookData.pdfDocument,
          chapter
        )
        setChapterPages(pages)
        setCurrentPageIndex(0)
      } catch (error) {
        console.error('加载PDF章节页面失败:', error)
        // 如果获取页面失败，设置空数组
        setChapterPages([])
      } finally {
        setIsLoadingPages(false)
      }
    }

    loadChapterPages()
  }, [chapter, bookData])

  // 渲染当前页面的canvas
  useEffect(() => {
    if (chapterPages[currentPageIndex]?.canvas && canvasContainerRef.current) {
      const canvas = chapterPages[currentPageIndex].canvas!
      canvasContainerRef.current.innerHTML = ''
      canvasContainerRef.current.appendChild(canvas)

      // 设置canvas样式以填满页面
      canvas.style.width = '100%'
      canvas.style.height = 'auto'
      canvas.style.display = 'block'
      canvas.style.border = '1px solid #e5e7eb'
      canvas.style.borderRadius = '8px'
      canvas.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  }, [currentPageIndex, chapterPages])

  const totalPages = chapterPages.length

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  return (
    <div className={cn('w-full h-full flex flex-col', className)}>
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
            className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Separator className="mb-3" />

      {/* Content */}
      <div className="flex-1 min-h-0 p-2">
        <ScrollArea className="h-full">
          <div className="prose prose-sm max-w-none px-1">
            {isLoadingPages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>{t('reader.pdf.loadingPages')}</span>
              </div>
            ) : (
              <div className="w-full">
                {/* Navigation */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (currentPageIndex === 0 && canGoPrevious) {
                        // 切换到上一章
                        handlePrevious()
                      } else if (currentPageIndex > 0) {
                        // 上一页
                        goToPreviousPage()
                      }
                    }}
                    disabled={currentPageIndex === 0 && !canGoPrevious}
                    className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[120px] text-center">
                    {hasMultipleChapters
                      ? `${currentIndex + 1} / ${chapterIds.length} - `
                      : ''}
                    {currentPageIndex + 1} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (currentPageIndex === totalPages - 1 && canGoNext) {
                        // 切换到下一章
                        handleNext()
                      } else if (currentPageIndex < totalPages - 1) {
                        // 下一页
                        goToNextPage()
                      }
                    }}
                    disabled={currentPageIndex === totalPages - 1 && !canGoNext}
                    className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div ref={canvasContainerRef} className="w-full" />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
