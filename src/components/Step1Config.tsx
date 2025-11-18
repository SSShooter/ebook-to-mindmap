import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, BookOpen, Brain, FileText, Loader2, List, Trash2, Tag, X, RefreshCw, MessageSquarePlus } from 'lucide-react'
import { ConfigDialog } from './project/ConfigDialog'
import { TagDialog } from './TagDialog'
import { CacheService } from '@/services/cacheService'
import { useConfigStore } from '@/stores/configStore'
import { useCustomPromptStore } from '@/stores/customPromptStore'
import { toast } from 'sonner'
import type { ChapterData } from '@/services/epubProcessor'

const cacheService = new CacheService()

interface Step1ConfigProps {
  file: File | null
  onFileChange: (file: File | null) => void
  extractedChapters: ChapterData[] | null
  customPrompt: string
  onCustomPromptChange: (prompt: string) => void
  onExtractChapters: () => void
  onStartProcessing: (selectedChapters: Set<string>, chapterTags: Map<string, string>) => void
  extractingChapters: boolean
  processing: boolean
  onReadChapter: (chapterId: string, chapterIds: string[]) => void
}

function getStringSizeInKB(str: string): string {
  const sizeInKB = new Blob([str]).size / 1024
  return sizeInKB.toFixed(1)
}

// TODO: move extractChapters into Step1
export function Step1Config({
  file,
  onFileChange,
  extractedChapters,
  customPrompt,
  onCustomPromptChange,
  onExtractChapters,
  onStartProcessing,
  extractingChapters,
  processing,
  onReadChapter
}: Step1ConfigProps) {
  const { t } = useTranslation()
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [chapterTags, setChapterTags] = useState<Map<string, string>>(new Map())
  const [boxSelectedChapters, setBoxSelectedChapters] = useState<Set<string>>(new Set())
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const configStore = useConfigStore()
  const { apiKey } = configStore.aiConfig
  const { processingMode } = configStore.processingOptions
  const { prompts } = useCustomPromptStore()

  // 当文件变化时自动提取章节
  useEffect(() => {
    if (file && !extractedChapters && !extractingChapters && !processing) {
      console.log('🚀 [DEBUG] 文件已更新，开始自动提取章节:', file.name)
      // 使用小延迟确保状态完全更新
      const timer = setTimeout(() => {
        onExtractChapters()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [file, extractedChapters, extractingChapters, processing, onExtractChapters])

  // 清除整本书缓存的函数
  const clearBookCache = useCallback(async () => {
    if (!file) return
    const mode = processingMode === 'combined-mindmap' ? 'combined_mindmap' : processingMode as 'summary' | 'mindmap'
    const deletedCount = await cacheService.clearBookCache(file.name, mode)
    const modeNames = {
      'summary': '文字总结',
      'mindmap': '章节思维导图',
      'combined-mindmap': '整书思维导图'
    }
    if (deletedCount > 0) {
      toast.success(`已清除${deletedCount}项${modeNames[processingMode]}缓存，下次处理将重新生成内容`, {
        duration: 3000,
        position: 'top-center',
      })
    } else {
      toast.info(`没有找到可清除的${modeNames[processingMode]}缓存`, {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [file, processingMode])

  // 当章节提取完成后，从缓存加载选中状态和标签
  useEffect(() => {
    if (!extractedChapters || !file) return

    const loadCache = async () => {
      const validChapterIds = extractedChapters.map(chapter => chapter.id)
      
      // 并行加载选中章节和标签
      const [cachedSelectedChapters, cachedChapterTags] = await Promise.all([
        cacheService.getSelectedChapters(file.name),
        cacheService.getChapterTags(file.name)
      ])

      // 处理选中的章节
      let newSelectedChapters: Set<string>
      if (cachedSelectedChapters && cachedSelectedChapters.length > 0) {
        const validSelectedChapters = cachedSelectedChapters.filter((id: string) => validChapterIds.includes(id))
        if (validSelectedChapters.length > 0) {
          newSelectedChapters = new Set(validSelectedChapters)
          console.log('✅ [DEBUG] 从缓存加载了选中的章节:', validSelectedChapters.length)
        } else {
          newSelectedChapters = new Set(validChapterIds)
          console.log('⚠️ [DEBUG] 缓存的章节ID无效，使用默认选中所有章节')
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
        if (newChapterTags.size > 0) {
          console.log('✅ [DEBUG] 从缓存加载了章节标签:', newChapterTags.size)
        }
      }

      // 一次性更新所有状态，避免多次渲染
      setSelectedChapters(newSelectedChapters)
      setChapterTags(newChapterTags)

      // 缓存选中的章节
      await cacheService.setSelectedChapters(file.name, newSelectedChapters)
      console.log('💾 [DEBUG] 已缓存选中的章节:', newSelectedChapters.size)
    }

    loadCache()
  }, [extractedChapters, file])

  const validateAndSetFile = useCallback((selectedFile: File | null) => {
    if (selectedFile && (selectedFile.name.endsWith('.epub') || selectedFile.name.endsWith('.pdf'))) {
      console.log('✅ [DEBUG] 文件验证通过:', selectedFile.name)
      onFileChange(selectedFile)
    } else if (selectedFile) {
      console.log('❌ [DEBUG] 文件格式不支持:', selectedFile.name)
      toast.error(t('upload.invalidFile'), {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [onFileChange, t])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    validateAndSetFile(selectedFile || null)
  }, [validateAndSetFile])

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files?.[0]
    validateAndSetFile(droppedFile || null)
  }, [validateAndSetFile])

  const handleReselectFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleBoxSelect = useCallback((chapterId: string, checked: boolean) => {
    setBoxSelectedChapters((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(chapterId)
      } else {
        newSet.delete(chapterId)
      }
      return newSet
    })
  }, [])

  const handleAddTagsClick = useCallback(() => {
    if (boxSelectedChapters.size === 0) {
      toast.error('请先框选要添加标签的章节', {
        duration: 3000,
        position: 'top-center',
      })
      return
    }
    setShowTagDialog(true)
  }, [boxSelectedChapters])

  const handleChapterSelect = useCallback((chapterId: string, checked: boolean) => {
    setSelectedChapters((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(chapterId)
      } else {
        newSet.delete(chapterId)
      }
      // 实时更新选中的章节缓存
      if (file) {
        cacheService.setSelectedChapters(file.name, newSet).catch(console.error)
      }
      return newSet
    })
  }, [file])

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!extractedChapters) return
    const newSelectedChapters = checked
      ? new Set(extractedChapters.map(chapter => chapter.id))
      : new Set<string>()
    setSelectedChapters(newSelectedChapters)
    
    // 更新选中的章节缓存
    if (file) {
      cacheService.setSelectedChapters(file.name, newSelectedChapters).then(() => {
        console.log('💾 [DEBUG] 全选操作更新选中的章节缓存:', newSelectedChapters.size)
      }).catch(console.error)
    }
  }, [extractedChapters, file])

  const handleConfirmAddTags = useCallback((tag: string) => {
    const newChapterTags = new Map(chapterTags)
    boxSelectedChapters.forEach(chapterId => {
      newChapterTags.set(chapterId, tag)
    })
    setChapterTags(newChapterTags)
    
    // 缓存章节标签
    if (file) {
      cacheService.setChapterTags(file.name, newChapterTags).then(() => {
        console.log('💾 [DEBUG] 已缓存章节标签:', newChapterTags.size)
      }).catch(console.error)
    }
    
    setShowTagDialog(false)
    setBoxSelectedChapters(new Set())

    toast.success(`已为 ${boxSelectedChapters.size} 个章节设置标签: ${tag}`, {
      duration: 3000,
      position: 'top-center',
    })
  }, [boxSelectedChapters, chapterTags, file])

  const handleRemoveTag = useCallback((chapterId: string) => {
    const newChapterTags = new Map(chapterTags)
    newChapterTags.delete(chapterId)
    setChapterTags(newChapterTags)
    
    // 更新缓存
    if (file) {
      cacheService.setChapterTags(file.name, newChapterTags).then(() => {
        console.log('💾 [DEBUG] 已更新章节标签缓存（移除标签）:', newChapterTags.size)
      }).catch(console.error)
    }
  }, [chapterTags, file])

  const bookData = extractedChapters && extractedChapters.length > 0
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
  return (
    <div className='h-full flex flex-col p-4 gap-3'>
      {/* 隐藏的文件输入 - 始终存在 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 顶部固定区域 */}
      <div className="shrink-0">
        {!file ? (
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <h3 className="text-lg font-semibold mb-1">{t('upload.title')}</h3>
            <p className="text-sm text-gray-600 mb-2">{t('upload.description')}</p>
            <p className="text-xs text-gray-500">
              拖拽文件到此处或点击选择 • 支持 EPUB 和 PDF 格式
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-gray-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReselectFile}
                  disabled={processing || extractingChapters}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  {t('upload.reselectFile')}
                </Button>
                <ConfigDialog processing={processing} file={file} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearBookCache}
                  disabled={processing}
                  className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('upload.clearCache')}
                </Button>
              </div>
            </div>
            <Button
              onClick={onExtractChapters}
              disabled={extractingChapters || processing}
              className="w-full"
            >
              {extractingChapters ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('upload.extractingChapters')}
                </>
              ) : (
                <>
                  <List className="mr-2 h-4 w-4" />
                  {t('upload.extractChapters')}
                </>
              )}
            </Button>
          </div>
        )}

        {extractedChapters && bookData && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <h3 className="font-semibold text-sm">{t('chapters.title')}</h3>
              </div>
              <p className="text-xs text-gray-600">
                {t('chapters.totalChapters', { count: extractedChapters.length })} • {t('chapters.selectedChapters', { count: selectedChapters.size })}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedChapters.size === extractedChapters.length}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  {t('chapters.selectAll')}
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTagsClick}
                disabled={boxSelectedChapters.size === 0}
                className="flex items-center gap-1"
              >
                <Tag className="h-3.5 w-3.5" />
                添加标签 {boxSelectedChapters.size > 0 && `(${boxSelectedChapters.size})`}
              </Button>
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
                {extractedChapters.map((chapter) => {
                  const tag = chapterTags.get(chapter.id)
                  const isBoxSelected = boxSelectedChapters.has(chapter.id)
                  return (
                    <div
                      key={chapter.id}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer ${
                        isBoxSelected 
                          ? 'bg-blue-100 border-2 border-blue-400' 
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                      onClick={() => handleBoxSelect(chapter.id, !isBoxSelected)}
                    >
                      <Checkbox
                        id={`chapter-${chapter.id}`}
                        checked={selectedChapters.has(chapter.id)}
                        onCheckedChange={(checked) => handleChapterSelect(chapter.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm truncate block"
                          title={chapter.title}
                        >
                          {chapter.title}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 shrink-0 py-0.5">
                            {getStringSizeInKB(chapter.content)} KB
                          </span>
                          {tag && (
                            <span
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded overflow-hidden"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                            >
                              <span className='truncate'>
                              {tag}
                              </span>
                              <X
                                className="h-2.5 w-2.5 shrink-0 cursor-pointer hover:text-blue-900"
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
                        }}
                      >
                        <BookOpen className="h-3 w-3" />
                      </Button>
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
        <div className="shrink-0 space-y-3 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="custom-prompt" className="text-sm font-medium">
                {t('chapters.customPrompt')}
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-xs h-6"
                asChild
              >
                <Link href="/custom-prompts">
                  <MessageSquarePlus className="h-3 w-3" />
                  {t('chapters.managePrompts')}
                </Link>
              </Button>
            </div>
            <Select value={customPrompt || 'default'} onValueChange={(value) => onCustomPromptChange(value === 'default' ? '' : value)} disabled={processing || extractingChapters}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('chapters.selectCustomPrompt')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t('chapters.useDefaultPrompt')}</SelectItem>
                {prompts.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.content}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {t('chapters.customPromptDescription')}
            </p>
          </div>

          <Button
            onClick={() => {
              if (!apiKey) {
                toast.error(t('chapters.apiKeyRequired'), {
                  duration: 3000,
                  position: 'top-center',
                })
                return
              }
              onStartProcessing(selectedChapters, chapterTags)
            }}
            disabled={!extractedChapters || processing || extractingChapters || selectedChapters.size === 0}
            className="w-full"
          >
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
