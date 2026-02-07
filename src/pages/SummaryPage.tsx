import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ChapterData,
  type BookData as EpubBookData,
} from '@/services/epubProcessor'
import { type BookData as PdfBookData } from '@/services/pdfProcessor'
import { AIService } from '../services/aiService'
import { CacheService } from '../services/cacheService'
import {
  BookProcessingService,
  type Chapter,
  type ChapterGroup,
} from '../services/bookProcessingService'
import type { MindElixirData, Options } from 'mind-elixir'
import { EpubReader } from '../components/EpubReader'
import { PdfReader } from '../components/PdfReader'
import { Step1Config } from '../components/Step1Config'
import { Step2Results } from '../components/Step2Results'
import { toast } from 'sonner'
import { useConfigStore } from '../stores/configStore'

const options = {
  direction: 1,
  alignment: 'nodes',
  editable: false,
  draggable: false,
} as Options

interface BookSummary {
  title: string
  author: string
  groups: ChapterGroup[]
  connections: string
  characterRelationship: string
  overallSummary: string
  connectionsLoading?: boolean
  overallSummaryLoading?: boolean
}

interface BookMindMap {
  title: string
  author: string
  groups: ChapterGroup[]
  mergedMindMap?: MindElixirData | null
  wholeMindMap?: MindElixirData | null
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
  const [extractedChapters, setExtractedChapters] = useState<
    ChapterData[] | null
  >(null)
  const [bookData, setBookData] = useState<{
    title: string
    author: string
  } | null>(null)
  const [fullBookData, setFullBookData] = useState<
    EpubBookData | PdfBookData | null
  >(null)
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null)
  const [readingChapterIds, setReadingChapterIds] = useState<string[]>([])
  const [retryParams, setRetryParams] = useState<{
    selectedChapters: Set<string>
    chapterTags: Map<string, string>
    customPrompt: string
    useCustomOnly: boolean
  } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const configStore = useConfigStore()
  const { apiKey } = configStore.aiConfig
  const { processingMode, bookType } = configStore.processingOptions

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

  const clearChapterCache = useCallback(
    async (chapterId: string) => {
      if (!file) return
      const type = processingMode === 'summary' ? 'summary' : 'mindmap'
      if (await cacheService.clearChapterCache(file.name, chapterId, type)) {
        toast.success(t('cache.cleared'), {
          duration: 3000,
          position: 'top-center',
        })
      }
    },
    [file, processingMode, t]
  )

  const clearSpecificCache = useCallback(
    async (
      cacheType:
        | 'connections'
        | 'overall_summary'
        | 'character_relationship'
        | 'combined_mindmap'
        | 'merged_mindmap'
    ) => {
      if (!file) return
      const displayNames = {
        connections: t('cacheManagement.types.connections'),
        overall_summary: t('cacheManagement.types.overallSummary'),
        character_relationship: t(
          'cacheManagement.types.characterRelationship'
        ),
        combined_mindmap: t('cacheManagement.types.combinedMindmap'),
        merged_mindmap: t('cacheManagement.types.mergedMindmap'),
      }
      if (await cacheService.clearSpecificCache(file.name, cacheType)) {
        toast.success(t('cache.cleared'), {
          duration: 3000,
          position: 'top-center',
        })
      } else {
        toast.info(
          `${t('cache.noCacheFound', { mode: displayNames[cacheType] })}`,
          {
            duration: 3000,
            position: 'top-center',
          }
        )
      }
    },
    [file, t]
  )

  const handleReadChapter = useCallback(
    (chapterId: string, chapterIds: string[]) => {
      setReadingChapterId(chapterId)
      setReadingChapterIds(chapterIds)
    },
    []
  )

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
    setRetryParams(null)
  }, [])

  const handleStartProcessing = useCallback(
    async (
      selectedChapters: Set<string>,
      chapterTags: Map<string, string>,
      customPrompt: string,
      useCustomOnly: boolean
    ) => {
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

      // Store retry parameters
      setRetryParams({
        selectedChapters: new Set(selectedChapters),
        chapterTags: new Map(chapterTags),
        customPrompt,
        useCustomOnly,
      })

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
            temperature: currentAiConfig.temperature,
          }
        })

        const bookProcessingService = new BookProcessingService(
          aiService,
          cacheService
        )
        const chapters = extractedChapters.filter((chapter) =>
          selectedChapters.has(chapter.id)
        )
        const groups = bookProcessingService.groupChaptersByTag(
          chapters,
          chapterTags
        )

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
            overallSummary: '',
          })
        } else if (
          processingMode === 'mindmap' ||
          processingMode === 'whole-mindmap'
        ) {
          setBookMindMap({
            title: bookData.title,
            author: bookData.author,
            groups: [],
            mergedMindMap: null,
            wholeMindMap: null,
          })
        }

        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
          const group = groups[groupIndex]
          const groupChapters = group.chapters

          if (group.tag) {
            setCurrentStep(
              t('progress.processingTagGroup', {
                tag: group.tag,
                current: groupIndex + 1,
                total: totalGroups,
                count: groupChapters.length,
              })
            )
          } else {
            setCurrentStep(
              t('progress.processingChapter', {
                current: groupIndex + 1,
                total: totalGroups,
                title: groupChapters[0].title,
              })
            )
          }

          const loadingGroup: ChapterGroup = {
            groupId: group.groupId,
            tag: group.tag,
            chapterIds: groupChapters.map((ch) => ch.id),
            chapterTitles: groupChapters.map((ch) => ch.title),
            isLoading: true,
          }

          if (processingMode === 'summary') {
            setBookSummary((prevSummary) => ({
              ...prevSummary!,
              groups: [...(prevSummary?.groups || []), loadingGroup],
            }))

            const result = await bookProcessingService.processSummaryGroup(
              group,
              file.name,
              bookType,
              configStore.processingOptions.outputLanguage,
              customPrompt,
              useCustomOnly,
              abortSignal,
              (data) => {
                setBookSummary((prevSummary) => {
                  if (!prevSummary) return null
                  const newGroups = [...prevSummary.groups]
                  const targetGroupIndex = newGroups.findIndex(
                    (g) => g.groupId === group.groupId
                  )
                  if (targetGroupIndex !== -1) {
                    newGroups[targetGroupIndex] = {
                      ...newGroups[targetGroupIndex],
                      summary: data.summary,
                      reasoning: data.reasoning,
                    }
                  }
                  return {
                    ...prevSummary,
                    groups: newGroups,
                  }
                })
              }
            )

            processedGroups.push(result.group)
            processedChapters.push(...result.chapters)

            setBookSummary((prevSummary) => ({
              ...prevSummary!,
              groups: [...processedGroups],
            }))
          } else if (processingMode === 'mindmap') {
            setBookMindMap((prevMindMap) => ({
              ...prevMindMap!,
              groups: [...(prevMindMap?.groups || []), loadingGroup],
            }))

            const result = await bookProcessingService.processMindMapGroup(
              group,
              file.name,
              configStore.processingOptions.outputLanguage,
              customPrompt,
              abortSignal,
              (data) => {
                setBookMindMap((prevMindMap) => {
                  if (!prevMindMap) return null
                  const newGroups = [...prevMindMap.groups]
                  const targetGroupIndex = newGroups.findIndex(
                    (g) => g.groupId === group.groupId
                  )
                  if (targetGroupIndex !== -1) {
                    newGroups[targetGroupIndex] = {
                      ...newGroups[targetGroupIndex],
                      mindMap: data.mindMap || undefined,
                      reasoning: data.reasoning,
                      isLoading: false,
                    }
                  }
                  return {
                    ...prevMindMap,
                    groups: newGroups,
                  }
                })
              }
            )

            processedGroups.push(result.group)
            processedChapters.push(...result.chapters)

            setBookMindMap((prevMindMap) => ({
              ...prevMindMap!,
              groups: [...processedGroups],
            }))
          } else if (processingMode === 'whole-mindmap') {
            const processedGroup: ChapterGroup = {
              groupId: group.groupId,
              tag: group.tag,
              chapterIds: groupChapters.map((ch) => ch.id),
              chapterTitles: groupChapters.map((ch) => ch.title),
              isLoading: false,
            }
            processedGroups.push(processedGroup)

            for (const chapter of groupChapters) {
              processedChapters.push({
                ...chapter,
                isLoading: false,
              })
            }

            setBookMindMap((prevMindMap) => ({
              ...prevMindMap!,
              groups: [...processedGroups],
            }))
          }

          setProgress(20 + ((groupIndex + 1) / totalGroups) * 60)
        }

        if (processingMode === 'summary') {
          setCurrentStep(t('progress.analyzingConnections'))

          // Mark connections as loading
          setBookSummary((prevSummary) => ({
            ...prevSummary!,
            connections: '',
            connectionsLoading: true,
          }))

          const connections = await bookProcessingService.generateConnections(
            file.name,
            processedChapters,
            configStore.processingOptions.outputLanguage,
            bookType,
            abortSignal,
            (data) => {
              setBookSummary((prevSummary) => ({
                ...prevSummary!,
                connections: data.content,
                connectionsLoading: true,
              }))
            }
          )

          setBookSummary((prevSummary) => ({
            ...prevSummary!,
            connections,
            connectionsLoading: false,
          }))
          setProgress(80)

          if (bookType !== 'non-fiction') {
            setCurrentStep(t('results.generatingCharacterRelationship'))
            const characterRelationship =
              await bookProcessingService.generateCharacterRelationship(
                file.name,
                processedChapters,
                configStore.processingOptions.outputLanguage,
                bookType,
                abortSignal
              )

            setBookSummary((prevSummary) => ({
              ...prevSummary!,
              characterRelationship,
            }))
          }
          setProgress(90)

          setCurrentStep(t('progress.generatingOverallSummary'))

          // Mark overallSummary as loading
          setBookSummary((prevSummary) => ({
            ...prevSummary!,
            overallSummary: '',
            overallSummaryLoading: true,
          }))

          const overallSummary =
            await bookProcessingService.generateOverallSummary(
              file.name,
              bookData.title,
              processedChapters,
              configStore.processingOptions.outputLanguage,
              bookType,
              abortSignal,
              (data) => {
                setBookSummary((prevSummary) => ({
                  ...prevSummary!,
                  overallSummary: data.content,
                  overallSummaryLoading: true,
                }))
              }
            )

          setBookSummary((prevSummary) => ({
            ...prevSummary!,
            overallSummary,
            overallSummaryLoading: false,
          }))
        } else if (processingMode === 'mindmap') {
          setCurrentStep(t('progress.mergingMindMaps'))
          const mergedMindMap = await bookProcessingService.mergeMindMaps(
            file.name,
            bookData.title,
            processedChapters
          )

          setProgress(85)
          setBookMindMap((prevMindMap) => ({
            ...prevMindMap!,
            mergedMindMap,
          }))
        } else if (processingMode === 'whole-mindmap') {
          setCurrentStep(t('progress.generatingCombinedMindMap'))
          const wholeMindMap =
            await bookProcessingService.generateCombinedMindMap(
              file.name,
              bookData.title,
              processedChapters,
              customPrompt,
              abortSignal,
              (data) => {
                if (data.mindMap) {
                  setBookMindMap((prevMindMap) => ({
                    ...prevMindMap!,
                    wholeMindMap: data.mindMap,
                  }))
                }
              }
            )

          setBookMindMap((prevMindMap) => ({
            ...prevMindMap!,
            wholeMindMap,
          }))
          setProgress(85)
        }

        setProgress(100)
        setCurrentStep(t('progress.completed'))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log(t('common.generationCancelled'))
          return
        }
        const errorMessage =
          err instanceof Error ? err.message : t('progress.processingError')
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
    },
    [
      extractedChapters,
      bookData,
      apiKey,
      file,
      processingMode,
      bookType,
      configStore.processingOptions.outputLanguage,
      t,
    ]
  )

  const handleRetry = useCallback(() => {
    if (!retryParams) return

    // Cancel any ongoing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Start processing again with stored parameters
    handleStartProcessing(
      retryParams.selectedChapters,
      retryParams.chapterTags,
      retryParams.customPrompt,
      retryParams.useCustomOnly
    )
  }, [retryParams, handleStartProcessing])

  const hasReader = readingChapterId && file && extractedChapters

  return (
    <div className="flex-1 flex relative overflow-hidden bg-muted/50">
      {/* Left Module - Scrollable */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${hasReader ? 'w-full md:w-1/2' : 'w-full'}
          flex justify-center
          overflow-y-auto overflow-x-hidden
          scroll-container
        `}>
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
              onRetry={error && retryParams ? handleRetry : undefined}
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
        `}>
        {hasReader &&
          (file.name.endsWith('.epub') ? (
            <EpubReader
              className="w-full h-full"
              initialChapterId={readingChapterId}
              chapterIds={readingChapterIds}
              chapters={extractedChapters}
              bookData={(fullBookData as EpubBookData) || undefined}
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
              bookData={(fullBookData as PdfBookData) || undefined}
              onClose={() => {
                setReadingChapterId(null)
                setReadingChapterIds([])
              }}
            />
          ) : null)}
      </div>
    </div>
  )
}
