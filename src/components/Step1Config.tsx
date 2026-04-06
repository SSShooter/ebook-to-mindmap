import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Upload,
  BookOpen,
  Brain,
  FileText,
  Loader2,
  List,
  Trash2,
  Tag,
  X,
  RefreshCw,
  Info,
} from 'lucide-react'
import { ConfigDialog } from './project/ConfigDialog'
import { TagDialog } from './TagDialog'
import { ViewContentDialog } from './ViewContentDialog'
import { CacheService } from '@/services/cacheService'
import { useConfigStore } from '@/stores/configStore'
import { useCustomPromptStore } from '@/stores/customPromptStore'
import { toast } from 'sonner'
import {
  EpubProcessor,
  type ChapterData,
  type BookData as EpubBookData,
} from '@/services/epubProcessor'
import {
  PdfProcessor,
  type BookData as PdfBookData,
} from '@/services/pdfProcessor'

const cacheService = new CacheService()

interface Step1ConfigProps {
  file: File | null
  onFileChange: (file: File | null) => void
  extractedChapters: ChapterData[] | null
  onChaptersExtracted: (
    chapters: ChapterData[],
    bookData: { title: string; author: string },
    fullBookData: EpubBookData | PdfBookData
  ) => void
  onStartProcessing: (
    selectedChapters: Set<string>,
    chapterTags: Map<string, string>,
    customPrompt: string,
    useCustomOnly: boolean
  ) => void
  processing: boolean
  onReadChapter: (chapterId: string, chapterIds: string[]) => void
  onError: (error: string) => void
}

function getStringSizeInKB(str: string): string {
  const sizeInKB = new Blob([str]).size / 1024
  return sizeInKB.toFixed(1)
}

export function Step1Config({
  file,
  onFileChange,
  extractedChapters,
  onChaptersExtracted,
  onStartProcessing,
  processing,
  onReadChapter,
  onError,
}: Step1ConfigProps) {
  const { t } = useTranslation()
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(
    new Set()
  )
  const [chapterTags, setChapterTags] = useState<Map<string, string>>(new Map())
  const [boxSelectedChapters, setBoxSelectedChapters] = useState<Set<string>>(
    new Set()
  )
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [extractingChapters, setExtractingChapters] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [useCustomOnly, setUseCustomOnly] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const configStore = useConfigStore()
  const {
    processingMode,
    skipNonEssentialChapters,
    maxSubChapterDepth,
    forceUseSpine,
  } = configStore.processingOptions
  const { prompts } = useCustomPromptStore()
  const abortControllerRef = useRef<AbortController | null>(null)

  const extractChapters = useCallback(
    async (fileToProcess?: File) => {
      const targetFile = fileToProcess || file
      if (!targetFile) return

      setExtractingChapters(true)
      // Clear error by passing null or empty string if onError supported it, but here we rely on parent or just new attempt

      abortControllerRef.current = new AbortController()

      try {
        let extractedBookData: { title: string; author: string }
        let chapters: ChapterData[]
        let fullBookData: EpubBookData | PdfBookData

        const isEpub = targetFile.name.endsWith('.epub')
        const isPdf = targetFile.name.endsWith('.pdf')

        if (isEpub) {
          const processor = new EpubProcessor()
          const bookData = await processor.parseEpub(targetFile)
          extractedBookData = { title: bookData.title, author: bookData.author }
          fullBookData = bookData

          chapters = await processor.extractChapters(
            bookData.book,
            skipNonEssentialChapters,
            maxSubChapterDepth,
            forceUseSpine
          )
        } else if (isPdf) {
          const processor = new PdfProcessor()
          const bookData = await processor.parsePdf(targetFile)
          extractedBookData = { title: bookData.title, author: bookData.author }
          fullBookData = bookData

          chapters = await processor.extractChapters(
            targetFile,
            skipNonEssentialChapters,
            maxSubChapterDepth
          )
        } else {
          throw new Error(t('upload.unsupportedFormat'))
        }

        onChaptersExtracted(chapters, extractedBookData, fullBookData)

        toast.success(
          t('progress.successfullyExtracted', { count: chapters.length }),
          {
            duration: 3000,
            position: 'top-center',
          }
        )
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t('progress.extractionError')
        onError(errorMessage)
        toast.error(errorMessage, {
          duration: 5000,
          position: 'top-center',
        })
      } finally {
        setExtractingChapters(false)
        if (abortControllerRef.current) {
          abortControllerRef.current = null
        }
      }
    },
    [
      file,
      skipNonEssentialChapters,
      maxSubChapterDepth,
      forceUseSpine,
      t,
      onChaptersExtracted,
      onError,
    ]
  )

  // 清除整本书缓存的函数
  const clearBookCache = useCallback(async () => {
    if (!file) return
    const mode =
      processingMode === 'whole-mindmap'
        ? 'combined_mindmap'
        : (processingMode as 'summary' | 'mindmap')
    const deletedCount = await cacheService.clearBookCache(file.name, mode)
    const modeKey = t(`cache.modes.${processingMode}`)
    if (deletedCount > 0) {
      toast.success(
        t('cache.bookCacheCleared', { count: deletedCount, mode: modeKey }),
        {
          duration: 3000,
          position: 'top-center',
        }
      )
    } else {
      toast.info(t('cache.noCacheFound', { mode: modeKey }), {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [file, processingMode, t])

  // 当章节提取完成后，从缓存加载选中状态和标签
  useEffect(() => {
    if (!extractedChapters || !file) return

    const loadCache = async () => {
      const validChapterIds = extractedChapters.map((chapter) => chapter.id)

      // 并行加载选中章节、标签、自定义提示词和仅使用自定义选项
      const [
        cachedSelectedChapters,
        cachedChapterTags,
        cachedCustomPrompt,
        cachedUseCustomOnly,
      ] = await Promise.all([
        cacheService.getSelectedChapters(file.name),
        cacheService.getChapterTags(file.name),
        cacheService.getCustomPrompt(file.name),
        cacheService.getUseCustomOnly(file.name),
      ])

      // 处理选中的章节
      let newSelectedChapters: Set<string>
      if (cachedSelectedChapters && cachedSelectedChapters.length > 0) {
        const validSelectedChapters = cachedSelectedChapters.filter(
          (id: string) => validChapterIds.includes(id)
        )
        if (validSelectedChapters.length > 0) {
          newSelectedChapters = new Set(validSelectedChapters)
        } else {
          newSelectedChapters = new Set(validChapterIds)
        }
      } else {
        newSelectedChapters = new Set(validChapterIds)
      }

      // 处理章节标签
      const newChapterTags = new Map<string, string>()
      if (cachedChapterTags) {
        Object.entries(cachedChapterTags).forEach(([chapterId, tag]) => {
          if (validChapterIds.includes(chapterId)) {
            newChapterTags.set(chapterId, tag)
          }
        })
      }

      // 处理自定义提示词
      if (cachedCustomPrompt) {
        setCustomPrompt(cachedCustomPrompt)
      }

      // 处理仅使用自定义选项
      setUseCustomOnly(cachedUseCustomOnly)

      // 一次性更新所有状态，避免多次渲染
      setSelectedChapters(newSelectedChapters)
      setChapterTags(newChapterTags)

      // 缓存选中的章节
      await cacheService.setSelectedChapters(file.name, newSelectedChapters)
    }

    loadCache()
  }, [extractedChapters, file])

  const validateAndSetFile = useCallback(
    (selectedFile: File | null) => {
      if (
        selectedFile &&
        (selectedFile.name.endsWith('.epub') ||
          selectedFile.name.endsWith('.pdf'))
      ) {
        console.log('✅ [DEBUG] 文件验证通过:', selectedFile.name)
        onFileChange(selectedFile)
        extractChapters(selectedFile)
      } else if (selectedFile) {
        console.log('❌ [DEBUG] 文件格式不支持:', selectedFile.name)
        toast.error(t('upload.invalidFile'), {
          duration: 3000,
          position: 'top-center',
        })
      }
    },
    [onFileChange, t, extractChapters]
  )

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0]
      validateAndSetFile(selectedFile || null)
    },
    [validateAndSetFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFile = e.dataTransfer.files?.[0]
      validateAndSetFile(droppedFile || null)
    },
    [validateAndSetFile]
  )

  const handleReselectFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleBoxSelect = useCallback(
    (chapterId: string, checked: boolean, shiftKey: boolean = false) => {
      setBoxSelectedChapters((prev) => {
        const newSet = new Set(prev)

        // 如果按住 Shift 键，查找顺序上的上一个已选中章节
        if (shiftKey && extractedChapters) {
          const currentIndex = extractedChapters.findIndex(
            (ch) => ch.id === chapterId
          )

          if (currentIndex !== -1) {
            // 从当前章节向前查找最近的一个已选中章节
            let lastSelectedIndex = -1
            for (let i = currentIndex - 1; i >= 0; i--) {
              if (prev.has(extractedChapters[i].id)) {
                lastSelectedIndex = i
                break
              }
            }

            // 如果找到了上一个已选中的章节，选中范围内的所有章节
            if (lastSelectedIndex !== -1) {
              for (let i = lastSelectedIndex; i <= currentIndex; i++) {
                newSet.add(extractedChapters[i].id)
              }
              return newSet
            }
          }
        }

        // 正常的单个选择/取消选择
        if (checked) {
          newSet.add(chapterId)
        } else {
          newSet.delete(chapterId)
        }
        return newSet
      })
    },
    [extractedChapters]
  )

  const handleAddTagsClick = useCallback(() => {
    if (boxSelectedChapters.size === 0) {
      toast.error(t('chapters.selectChaptersForTag'), {
        duration: 3000,
        position: 'top-center',
      })
      return
    }
    setShowTagDialog(true)
  }, [boxSelectedChapters, t])

  const handleChapterSelect = useCallback(
    (chapterId: string, checked: boolean) => {
      setSelectedChapters((prev) => {
        const newSet = new Set(prev)
        if (checked) {
          newSet.add(chapterId)
        } else {
          newSet.delete(chapterId)
        }
        // 实时更新选中的章节缓存
        if (file) {
          cacheService
            .setSelectedChapters(file.name, newSet)
            .catch(console.error)
        }
        return newSet
      })
    },
    [file]
  )

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!extractedChapters) return
      const newSelectedChapters = checked
        ? new Set(extractedChapters.map((chapter) => chapter.id))
        : new Set<string>()
      setSelectedChapters(newSelectedChapters)

      // 更新选中的章节缓存
      if (file) {
        cacheService
          .setSelectedChapters(file.name, newSelectedChapters)
          .then(() => {
            console.log(
              '💾 [DEBUG] 全选操作更新选中的章节缓存:',
              newSelectedChapters.size
            )
          })
          .catch(console.error)
      }
    },
    [extractedChapters, file]
  )

  const handleConfirmAddTags = useCallback(
    (tag: string) => {
      const newChapterTags = new Map(chapterTags)
      boxSelectedChapters.forEach((chapterId) => {
        newChapterTags.set(chapterId, tag)
      })
      setChapterTags(newChapterTags)

      // 缓存章节标签
      if (file) {
        cacheService
          .setChapterTags(file.name, newChapterTags)
          .then(() => {
            console.log('💾 [DEBUG] 已缓存章节标签:', newChapterTags.size)
          })
          .catch(console.error)
      }

      setShowTagDialog(false)
      setBoxSelectedChapters(new Set())

      toast.success(
        t('chapters.tagAdded', { count: boxSelectedChapters.size, tag }),
        {
          duration: 3000,
          position: 'top-center',
        }
      )
    },
    [boxSelectedChapters, chapterTags, file, t]
  )

  const handleRemoveTag = useCallback(
    (chapterId: string) => {
      const newChapterTags = new Map(chapterTags)
      newChapterTags.delete(chapterId)
      setChapterTags(newChapterTags)

      // 更新缓存
      if (file) {
        cacheService
          .setChapterTags(file.name, newChapterTags)
          .then(() => {
            console.log(
              '💾 [DEBUG] 已更新章节标签缓存（移除标签）:',
              newChapterTags.size
            )
          })
          .catch(console.error)
      }
    },
    [chapterTags, file]
  )

  const bookData =
    extractedChapters && extractedChapters.length > 0
      ? { title: '已提取章节', author: '' }
      : null

  // 监听 Ctrl+G 快捷键打开标签对话框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault()
        handleAddTagsClick()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAddTagsClick])
  if (!file) {
    return (
      <div
        className={`m-4 relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
            : 'border-border hover:border-border/60 hover:bg-muted/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}>
        {/* 隐藏的文件输入 - 始终存在 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-1">{t('upload.title')}</h3>
        <p className="text-sm text-muted-foreground mb-2">
          {t('upload.description')}
        </p>
        <p className="text-xs text-muted-foreground/80">
          {t('upload.dragDropHint')}
        </p>
      </div>
    )
  }
  return (
    <div className="h-full flex flex-col p-4 gap-3">
      {/* 隐藏的文件输入 - 始终存在 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 顶部固定区域 */}
      <div className="shrink-0 p-3 bg-muted rounded-lg">
        <div className="flex items-center justify-between gap-3 ">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 flex min-w-0 items-center gap-1">
              <p className="font-medium truncate text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground/80 shrink-0">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReselectFile}
                  disabled={processing || extractingChapters}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('upload.reselectFile')}</p>
              </TooltipContent>
            </Tooltip>
            <ConfigDialog processing={processing} file={file} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearBookCache}
                  disabled={processing}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('upload.clearCache')}</p>
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={() => extractChapters()}
              disabled={extractingChapters || processing}>
              {extractingChapters ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <List className="mr-2 h-4 w-4" />
              )}
              {t('upload.extractChapters')}
            </Button>
          </div>
        </div>
        {extractedChapters && bookData && (
          <div className="mt-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <h3 className="font-semibold text-sm">{t('chapters.title')}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('chapters.totalChapters', {
                  count: extractedChapters.length,
                })}{' '}
                •{' '}
                {t('chapters.selectedChapters', {
                  count: selectedChapters.size,
                })}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedChapters.size === extractedChapters.length}
                  onCheckedChange={(checked) =>
                    handleSelectAll(checked as boolean)
                  }
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  {t('chapters.selectAll')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTagsClick}
                  disabled={boxSelectedChapters.size === 0}
                  className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {t('chapters.addTag')}{' '}
                  {boxSelectedChapters.size > 0 &&
                    `(${boxSelectedChapters.size})`}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent align="end">
                    <p>{t('chapters.groupingHint')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 可滚动的章节列表区域 */}
      {extractedChapters && bookData && (
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {extractedChapters.map((chapter, index) => {
                  const tag = chapterTags.get(chapter.id)
                  const isBoxSelected = boxSelectedChapters.has(chapter.id)
                  return (
                    <div
                      key={chapter.id}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer select-none ${
                        isBoxSelected
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600'
                          : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                      }`}
                      onClick={(e) =>
                        handleBoxSelect(chapter.id, !isBoxSelected, e.shiftKey)
                      }>
                      <Checkbox
                        id={`chapter-${chapter.id}`}
                        checked={selectedChapters.has(chapter.id)}
                        onCheckedChange={(checked) =>
                          handleChapterSelect(chapter.id, checked as boolean)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm truncate block"
                          title={chapter.title}>
                          {chapter.title}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground/80 shrink-0 py-0.5">
                            {getStringSizeInKB(chapter.content)} KB
                          </span>
                          {tag && (
                            <span
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded overflow-hidden"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}>
                              <span className="truncate">{tag}</span>
                              <X
                                className="h-2.5 w-2.5 shrink-0 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleRemoveTag(chapter.id)
                                }}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReadChapter(chapter.id, [chapter.id])
                        }}>
                        <BookOpen className="h-3 w-3" />
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ViewContentDialog
                          title={chapter.title}
                          content={chapter.content}
                          chapterIndex={index}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* 底部固定区域 */}
      {extractedChapters && bookData && (
        <div className="shrink-0 space-y-3 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-prompt" className="text-sm font-medium">
                {t('chapters.customPrompt')}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('chapters.customPromptDescription')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={customPrompt || 'default'}
              onValueChange={(value) => {
                const newPrompt = value === 'default' ? '' : value
                setCustomPrompt(newPrompt)
                // 事件驱动：用户选择时保存缓存
                if (file) {
                  cacheService
                    .setCustomPrompt(file.name, newPrompt)
                    .catch(console.error)
                }
              }}
              disabled={processing || extractingChapters}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('chapters.selectCustomPrompt')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  {t('chapters.useDefaultPrompt')}
                </SelectItem>
                {prompts.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.content}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Custom Prompt Only Checkbox */}
            {customPrompt && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-custom-only"
                  checked={useCustomOnly}
                  onCheckedChange={(checked) => {
                    const newValue = checked as boolean
                    setUseCustomOnly(newValue)
                    // 事件驱动：用户勾选时保存缓存
                    if (file) {
                      cacheService
                        .setUseCustomOnly(file.name, newValue)
                        .catch(console.error)
                    }
                  }}
                  disabled={
                    processing ||
                    extractingChapters ||
                    processingMode === 'mindmap' ||
                    processingMode === 'whole-mindmap'
                  }
                />
                <Label
                  htmlFor="use-custom-only"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('chapters.useCustomPromptOnly')}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('chapters.useCustomPromptOnlyDescription')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
          <Button
            onClick={() => {
              onStartProcessing(
                selectedChapters,
                chapterTags,
                customPrompt,
                useCustomOnly
              )
            }}
            disabled={
              !extractedChapters ||
              processing ||
              extractingChapters ||
              selectedChapters.size === 0
            }
            className="w-full">
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('chapters.processing')}
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                {t('chapters.startProcessing')}
              </>
            )}
          </Button>
        </div>
      )}

      <TagDialog
        open={showTagDialog}
        onOpenChange={setShowTagDialog}
        selectedCount={boxSelectedChapters.size}
        onConfirm={handleConfirmAddTags}
      />
    </div>
  )
}
