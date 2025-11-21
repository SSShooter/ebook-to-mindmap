import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ChevronUp } from 'lucide-react'
import { type ChapterData, type BookData as EpubBookData } from '@/services/epubProcessor'
import { type BookData as PdfBookData } from '@/services/pdfProcessor'
import { AIService } from '../services/aiService'
import { CacheService } from '../services/cacheService'
import { BookProcessingService, type Chapter, type ChapterGroup } from '../services/bookProcessingService'
import type { MindElixirData, Options } from 'mind-elixir'
import { EpubReader } from '../components/EpubReader'
import { PdfReader } from '../components/PdfReader'
import { Step1Config } from '../components/Step1Config'
import { Step2Results } from '../components/Step2Results'
import { toast } from 'sonner'
import { scrollToTop } from '../utils'
import { useConfigStore } from '../stores/configStore'

const options = { direction: 1, alignment: 'nodes' } as Options

interface BookSummary {
  title: string
  author: string
  groups: ChapterGroup[]
  connections: string
  characterRelationship: string
  overallSummary: string
}

interface BookMindMap {
  title: string
  author: string
  groups: ChapterGroup[]
  combinedMindMap: MindElixirData | null
}

const cacheService = new CacheService()

export function SummaryPage() {
  const { t } = useTranslation()
  const [currentStepIndex, setCurrentStepIndex] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [bookSummary, setBookSummary] = useState<BookSummary | null>(null)
  const [bookMindMap, setBookMindMap] = useState<BookMindMap | null>(null)
  const [extractedChapters, setExtractedChapters] = useState<ChapterData[] | null>(null)
  const [bookData, setBookData] = useState<{ title: string; author: string } | null>(null)
  const [fullBookData, setFullBookData] = useState<EpubBookData | PdfBookData | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null)
  const [readingChapterIds, setReadingChapterIds] = useState<string[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const configStore = useConfigStore()
  const { apiKey } = configStore.aiConfig
  const { processingMode, bookType } = configStore.processingOptions

  useEffect(() => {
    const scrollContainer = document.querySelector('.scroll-container')
    if (!scrollContainer) return

    const handleScroll = () => {
      setShowBackToTop(scrollContainer.scrollTop > 300)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  const handleFileChange = useCallback((selectedFile: File | null) => {
    setFile(selectedFile)
    setExtractedChapters(null)
    setBookData(null)
    setFullBookData(null)
    setBookSummary(null)
    setBookMindMap(null)
    setReadingChapterId(null)
    setReadingChapterIds([])
  }, [])

  const clearChapterCache = useCallback(async (chapterId: string) => {
    if (!file) return
    const type = processingMode === 'summary' ? 'summary' : 'mindmap'
    if (await cacheService.clearChapterCache(file.name, chapterId, type)) {
      toast.success('已清除缓存，下次处理将重新生成内容', {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [file, processingMode])

  const clearSpecificCache = useCallback(async (cacheType: 'connections' | 'overall_summary' | 'character_relationship' | 'combined_mindmap' | 'merged_mindmap') => {
    if (!file) return
    const displayNames = {
      connections: '章节关联',
      overall_summary: '全书总结',
      character_relationship: '人物关系图',
      combined_mindmap: '整书思维导图',
      merged_mindmap: '章节思维导图整合'
    }
    if (await cacheService.clearSpecificCache(file.name, cacheType)) {
      toast.success(`已清除${displayNames[cacheType]}缓存，下次处理将重新生成内容`, {
        duration: 3000,
        position: 'top-center',
      })
    } else {
      toast.info(`没有找到可清除的${displayNames[cacheType]}缓存`, {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [file])

  const handleReadChapter = useCallback((chapterId: string, chapterIds: string[]) => {
    setReadingChapterId(chapterId)
    setReadingChapterIds(chapterIds)
  }, [])

  const handleBackToConfig = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setCurrentStepIndex(1)
    setProcessing(false)
    setProgress(0)
    setCurrentStep('')
    setError(null)
  }, [])



  const handleStartProcessing = useCallback(async (selectedChapters: Set<string>, chapterTags: Map<string, string>, customPrompt: string, useCustomOnly: boolean) => {
    if (!extractedChapters || !bookData || !apiKey) {
      toast.error(t('chapters.extractAndApiKey'), {
        duration: 3000,
        position: 'top-center',
      })
      return
    }
    if (!file) return
    if (selectedChapters.size === 0) {
      toast.error(t('chapters.selectAtLeastOne'), {
        duration: 3000,
        position: 'top-center',
      })
      return
    }

    setCurrentStepIndex(2)
    setBookSummary(null)
    setBookMindMap(null)
    setProcessing(true)
    setProgress(0)
    setCurrentStep('')
    setError(null)

    abortControllerRef.current = new AbortController()
    const abortSignal = abortControllerRef.current.signal

    try {
      const aiService = new AIService(() => {
        const currentState = useConfigStore.getState()
        const currentAiConfig = currentState.aiConfig
        return {
          provider: currentAiConfig.provider,
          apiKey: currentAiConfig.apiKey,
          apiUrl: currentAiConfig.apiUrl,
          model: currentAiConfig.model || undefined,
          temperature: currentAiConfig.temperature
        }
      })

      const bookProcessingService = new BookProcessingService(aiService, cacheService)
      const chapters = extractedChapters.filter(chapter => selectedChapters.has(chapter.id))
      const groups = bookProcessingService.groupChaptersByTag(chapters, chapterTags)

      console.log('groups', groups)

      const totalGroups = groups.length
      const processedGroups: ChapterGroup[] = []
      const processedChapters: Chapter[] = []

      if (processingMode === 'summary') {
        setBookSummary({
          title: bookData.title,
          author: bookData.author,
          groups: [],
          connections: '',
          characterRelationship: '',
          overallSummary: ''
        })
      } else if (processingMode === 'mindmap' || processingMode === 'combined-mindmap') {
        setBookMindMap({
          title: bookData.title,
          author: bookData.author,
          groups: [],
          combinedMindMap: null
        })
      }

      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex]
        const groupChapters = group.chapters

        if (group.tag) {
          setCurrentStep(`正在处理标签组 "${group.tag}" (${groupIndex + 1}/${totalGroups})，包含 ${groupChapters.length} 个章节`)
        } else {
          setCurrentStep(`正在处理第 ${groupIndex + 1}/${totalGroups} 个章节: ${groupChapters[0].title}`)
        }

        const loadingGroup: ChapterGroup = {
          groupId: group.groupId,
          tag: group.tag,
          chapterIds: groupChapters.map(ch => ch.id),
          chapterTitles: groupChapters.map(ch => ch.title),
          isLoading: true
        }

        if (processingMode === 'summary') {
          setBookSummary(prevSummary => ({
            ...prevSummary!,
            groups: [...(prevSummary?.groups || []), loadingGroup]
          }))

          const result = await bookProcessingService.processSummaryGroup(
            group,
            file.name,
            bookType,
            configStore.processingOptions.outputLanguage,
            customPrompt,
            useCustomOnly,
            abortSignal
          )

          processedGroups.push(result.group)
          processedChapters.push(...result.chapters)

          setBookSummary(prevSummary => ({
            ...prevSummary!,
            groups: [...processedGroups]
          }))
        } else if (processingMode === 'mindmap') {
          setBookMindMap(prevMindMap => ({
            ...prevMindMap!,
            groups: [...(prevMindMap?.groups || []), loadingGroup]
          }))

          const result = await bookProcessingService.processMindMapGroup(
            group,
            file.name,
            configStore.processingOptions.outputLanguage,
            customPrompt,
            abortSignal
          )

          processedGroups.push(result.group)
          processedChapters.push(...result.chapters)

          setBookMindMap(prevMindMap => ({
            ...prevMindMap!,
            groups: [...processedGroups]
          }))
        } else if (processingMode === 'combined-mindmap') {
          const processedGroup: ChapterGroup = {
            groupId: group.groupId,
            tag: group.tag,
            chapterIds: groupChapters.map(ch => ch.id),
            chapterTitles: groupChapters.map(ch => ch.title),
            isLoading: false
          }
          processedGroups.push(processedGroup)

          for (const chapter of groupChapters) {
            processedChapters.push({
              ...chapter,
              isLoading: false
            })
          }

          setBookMindMap(prevMindMap => ({
            ...prevMindMap!,
            groups: [...processedGroups]
          }))
        }

        setProgress(20 + (groupIndex + 1) / totalGroups * 60)
      }

      if (processingMode === 'summary') {
        setCurrentStep('正在分析章节关联...')
        const connections = await bookProcessingService.generateConnections(
          file.name,
          processedChapters,
          configStore.processingOptions.outputLanguage,
          bookType,
          abortSignal
        )

        setBookSummary(prevSummary => ({
          ...prevSummary!,
          connections
        }))
        setProgress(80)

        if (bookType !== 'non-fiction') {
          setCurrentStep('正在生成人物关系图...')
          const characterRelationship = await bookProcessingService.generateCharacterRelationship(
            file.name,
            processedChapters,
            configStore.processingOptions.outputLanguage,
            bookType,
            abortSignal
          )

          setBookSummary(prevSummary => ({
            ...prevSummary!,
            characterRelationship
          }))
        }
        setProgress(90)

        setCurrentStep('正在生成全书总结...')
        const overallSummary = await bookProcessingService.generateOverallSummary(
          file.name,
          bookData.title,
          processedChapters,
          configStore.processingOptions.outputLanguage,
          bookType,
          abortSignal
        )

        setBookSummary(prevSummary => ({
          ...prevSummary!,
          overallSummary
        }))
      } else if (processingMode === 'mindmap') {
        setCurrentStep('正在合并章节思维导图...')
        const combinedMindMap = await bookProcessingService.mergeMindMaps(
          file.name,
          bookData.title,
          processedChapters
        )

        setProgress(85)
        setBookMindMap(prevMindMap => ({
          ...prevMindMap!,
          combinedMindMap
        }))
      } else if (processingMode === 'combined-mindmap') {
        setCurrentStep('正在生成整书思维导图...')
        const combinedMindMap = await bookProcessingService.generateCombinedMindMap(
          file.name,
          bookData.title,
          processedChapters,
          customPrompt,
          abortSignal
        )

        setBookMindMap(prevMindMap => ({
          ...prevMindMap!,
          combinedMindMap
        }))
        setProgress(85)
      }

      setProgress(100)
      setCurrentStep('处理完成！')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(t('common.generationCancelled'))
        return
      }
      const errorMessage = err instanceof Error ? err.message : t('progress.processingError')
      setError(errorMessage)
      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-center',
      })
    } finally {
      setProcessing(false)
      if (abortControllerRef.current) {
        abortControllerRef.current = null
      }
    }
  }, [extractedChapters, bookData, apiKey, file, processingMode, bookType, configStore.processingOptions.outputLanguage, t])

  const hasReader = readingChapterId && file && extractedChapters

  return (
    <div className="flex-1 flex relative overflow-hidden">
      {/* Left Module - Scrollable */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${hasReader ? 'w-full md:w-1/2' : 'w-full'}
          flex justify-center
          overflow-y-auto overflow-x-hidden
          scroll-container
        `}
      >
        <div className="w-full max-w-4xl">
          {currentStepIndex === 1 ? (
            <Step1Config
              file={file}
              onFileChange={handleFileChange}
              extractedChapters={extractedChapters}
              onChaptersExtracted={(chapters, bookData, fullBookData) => {
                setExtractedChapters(chapters)
                setBookData(bookData)
                setFullBookData(fullBookData)
              }}
              onStartProcessing={handleStartProcessing}
              processing={processing}
              onReadChapter={handleReadChapter}
              onError={setError}
            />
          ) : (
            <Step2Results
              bookData={bookData}
              processing={processing}
              progress={progress}
              currentStep={currentStep}
              error={error}
              bookSummary={bookSummary}
              bookMindMap={bookMindMap}
              processingMode={processingMode}
              extractedChapters={extractedChapters}
              onBackToConfig={handleBackToConfig}
              onClearChapterCache={clearChapterCache}
              onClearSpecificCache={clearSpecificCache}
              onReadChapter={handleReadChapter}
              mindElixirOptions={options}
            />
          )}
        </div>
      </div>

      {/* Reader - Slides in from right, fixed height 100vh */}
      <div
        className={`
          fixed lg:absolute top-0 right-0
          h-screen
          w-full lg:w-1/2
          transition-transform duration-300 ease-in-out
          ${hasReader ? 'translate-x-0' : 'translate-x-full'}
          bg-background
          z-40
          overflow-hidden
        `}
      >
        {hasReader && (
          file.name.endsWith('.epub') ? (
            <EpubReader
              className="w-full h-full"
              initialChapterId={readingChapterId}
              chapterIds={readingChapterIds}
              chapters={extractedChapters}
              bookData={fullBookData as EpubBookData || undefined}
              onClose={() => {
                setReadingChapterId(null)
                setReadingChapterIds([])
              }}
            />
          ) : file.name.endsWith('.pdf') ? (
            <PdfReader
              className="w-full h-full"
              initialChapterId={readingChapterId}
              chapterIds={readingChapterIds}
              chapters={extractedChapters}
              bookData={fullBookData as PdfBookData || undefined}
              onClose={() => {
                setReadingChapterId(null)
                setReadingChapterIds([])
              }}
            />
          ) : null
        )}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700"
          size="icon"
          aria-label={t('common.backToTop')}
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}
