import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Upload, BookOpen, Brain, FileText, Loader2, List, Trash2, Tag, X, RefreshCw } from 'lucide-react'
import { ConfigDialog } from './project/ConfigDialog'
import { TagDialog } from './TagDialog'
import { CacheService } from '@/services/cacheService'
import { useConfigStore } from '@/stores/configStore'
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

  // 清除整本书缓存的函数
  const clearBookCache = useCallback(() => {
    if (!file) return
    const mode = processingMode === 'combined-mindmap' ? 'combined_mindmap' : processingMode as 'summary' | 'mindmap'
    const deletedCount = cacheService.clearBookCache(file.name, mode)
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

    // 尝试从缓存中加载选中的章节
    const cachedSelectedChapters = cacheService.getSelectedChapters(file.name)
    let newSelectedChapters: Set<string>

    if (cachedSelectedChapters && cachedSelectedChapters.length > 0) {
      // 验证缓存的章节ID是否仍然有效
      const validChapterIds = extractedChapters.map(chapter => chapter.id)
      const validSelectedChapters = cachedSelectedChapters.filter(id => validChapterIds.includes(id))

      if (validSelectedChapters.length > 0) {
        newSelectedChapters = new Set(validSelectedChapters)
        console.log('✅ [DEBUG] 从缓存加载了选中的章节:', validSelectedChapters.length)
      } else {
        // 缓存的章节ID无效，使用默认选中所有章节
        newSelectedChapters = new Set(extractedChapters.map(chapter => chapter.id))
        console.log('⚠️ [DEBUG] 缓存的章节ID无效，使用默认选中所有章节')
      }
    } else {
      // 没有缓存，使用默认选中所有章节
      newSelectedChapters = new Set(extractedChapters.map(chapter => chapter.id))
    }

    setSelectedChapters(newSelectedChapters)

    // 缓存选中的章节
    cacheService.setSelectedChapters(file.name, newSelectedChapters)
    console.log('💾 [DEBUG] 已缓存选中的章节:', newSelectedChapters.size)

    // 尝试从缓存中加载章节标签
    const cachedChapterTags = cacheService.getChapterTags(file.name)
    if (cachedChapterTags) {
      // 验证缓存的章节ID是否仍然有效
      const validChapterIds = extractedChapters.map(chapter => chapter.id)
      const validTags = new Map<string, string>()
      Object.entries(cachedChapterTags).forEach(([chapterId, tag]) => {
        if (validChapterIds.includes(chapterId)) {
          validTags.set(chapterId, tag)
        }
      })
      if (validTags.size > 0) {
        setChapterTags(validTags)
        console.log('✅ [DEBUG] 从缓存加载了章节标签:', validTags.size)
      }
    }
  }, [extractedChapters, file])

  const validateAndSetFile = useCallback((selectedFile: File | null) => {
    if (selectedFile && (selectedFile.name.endsWith('.epub') || selectedFile.name.endsWith('.pdf'))) {
      onFileChange(selectedFile)
    } else if (selectedFile) {
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
    onFileChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFileChange])

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
        cacheService.setSelectedChapters(file.name, newSet)
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
      cacheService.setSelectedChapters(file.name, newSelectedChapters)
      console.log('💾 [DEBUG] 全选操作更新选中的章节缓存:', newSelectedChapters.size)
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
      cacheService.setChapterTags(file.name, newChapterTags)
      console.log('💾 [DEBUG] 已缓存章节标签:', newChapterTags.size)
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
      cacheService.setChapterTags(file.name, newChapterTags)
      console.log('💾 [DEBUG] 已更新章节标签缓存（移除标签）:', newChapterTags.size)
    }
  }, [chapterTags, file])

  const bookData = extractedChapters && extractedChapters.length > 0
    ? { title: '已提取章节', author: '' }
    : null

  return (
    <div className='min-h-[80vh] space-y-4'>
      {!file ? (
        <Card>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".epub,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">{t('upload.title')}</h3>
              <p className="text-gray-600 mb-4">{t('upload.description')}</p>
              <p className="text-sm text-gray-500">
                拖拽文件到此处或点击选择文件
              </p>
              <p className="text-xs text-gray-400 mt-2">
                支持 EPUB 和 PDF 格式
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-600" />
                  <p className="font-medium truncate">{file.name}</p>
              </div>
              <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReselectFile}
                  disabled={processing || extractingChapters}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  重新选择
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
              className="w-full mt-4"
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
          </CardContent>
        </Card>
      )}

      {extractedChapters && bookData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              {t('chapters.title')}
            </CardTitle>
            <CardDescription>
              {bookData.title} {bookData.author && `- ${bookData.author}`} | {t('chapters.totalChapters', { count: extractedChapters.length })}，{t('chapters.selectedChapters', { count: selectedChapters.size })}
            </CardDescription>
            <div className="flex items-center justify-between gap-2 mt-2">
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          {getStringSizeInKB(chapter.content)} KB
                        </span>
                        {tag && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          >
                            {tag}
                            <X
                              className="h-2.5 w-2.5 cursor-pointer hover:text-blue-900"
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

            <div className="space-y-2">
              <Label htmlFor="custom-prompt" className="text-sm font-medium">
                {t('chapters.customPrompt')}
              </Label>
              <Textarea
                id="custom-prompt"
                placeholder={t('chapters.customPromptPlaceholder')}
                value={customPrompt}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                className="min-h-20 resize-none"
                disabled={processing || extractingChapters}
              />
              <p className="text-xs text-gray-500">
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
          </CardContent>
        </Card>
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
