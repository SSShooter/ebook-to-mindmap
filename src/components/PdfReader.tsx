import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ChapterData, BookData } from '@/services/pdfProcessor'
import { PdfProcessor } from '@/services/pdfProcessor'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

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

export function PdfReader({ initialChapterId, chapterIds, chapters, bookData, onClose, className }: PdfReaderProps) {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(() => 
    chapterIds.indexOf(initialChapterId)
  )
  const [chapterPages, setChapterPages] = useState<PageContent[]>([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isLoadingPages, setIsLoadingPages] = useState(false)
  const [pdfProcessor] = useState(() => new PdfProcessor())
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const chapter = chapters.find(ch => ch.id === chapterIds[currentIndex])!
  const hasMultipleChapters = chapterIds.length > 1
  const canGoPreviousChapter = hasMultipleChapters && currentIndex > 0
  const canGoNextChapter = hasMultipleChapters && currentIndex < chapterIds.length - 1

  const handlePreviousChapter = () => {
    if (canGoPreviousChapter) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNextChapter = () => {
    if (canGoNextChapter) {
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
        const pages = await pdfProcessor.getChapterPages(bookData.pdfDocument, chapter)
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
  }, [chapter, bookData, pdfProcessor])

  // 渲染当前页面的canvas
  useEffect(() => {
    if (chapterPages[currentPageIndex]?.canvas && canvasContainerRef.current) {
      const canvas = chapterPages[currentPageIndex].canvas!
      canvasContainerRef.current.innerHTML = ''
      canvasContainerRef.current.appendChild(canvas)

      // 设置canvas样式
      canvas.style.maxWidth = '100%'
      canvas.style.height = 'auto'
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
    <div className={cn("w-full", className)}>
      {/* 主要阅读区域 */}
      <Card className='gap-0'>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {chapter.title}
              {chapter.startPage && chapter.endPage && (
                <Badge variant="secondary" className="ml-2">
                  {t('reader.pdf.page', { startPage: chapter.startPage, endPage: chapter.endPage })}
                </Badge>
              )}
              {hasMultipleChapters && (
                <Badge variant="outline" className="ml-2">
                  {currentIndex + 1} / {chapterIds.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                {t('reader.pdf.close')}
              </Button>
            </div>
          </div>

          {/* 章节导航 */}
          {hasMultipleChapters && (
            <div className="flex items-center justify-between pt-2 pb-2 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousChapter}
                disabled={!canGoPreviousChapter}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('reader.pdf.previousChapter')}
              </Button>

              <div className="text-sm text-muted-foreground">
                {t('reader.pdf.chapterInfo', { current: currentIndex + 1, total: chapterIds.length })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextChapter}
                disabled={!canGoNextChapter}
                className="flex items-center gap-1"
              >
                {t('reader.pdf.nextChapter')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* 页面导航 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPageIndex === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('reader.pdf.previousPage')}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('reader.pdf.pageInfo', { current: currentPageIndex + 1, total: totalPages })}
                </span>
                {chapter.startPage && (
                  <Badge variant="outline" className="text-xs">
                    {t('reader.pdf.pdfPageInfo', { page: (chapter.startPage || 1) + currentPageIndex })}
                  </Badge>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPageIndex === totalPages - 1}
                className="flex items-center gap-1"
              >
                {t('reader.pdf.nextPage')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[80vh]">
            {isLoadingPages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>{t('reader.pdf.loadingPages')}</span>
              </div>
            ) : (
              <div className="flex justify-center">
                <div
                  ref={canvasContainerRef}
                  className="max-w-full"
                />
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}