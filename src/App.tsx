import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, BookOpen, Brain, FileText, Loader2, Eye, Network, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EpubProcessor } from './services/epubProcessor'
import { PdfProcessor } from './services/pdfProcessor'
import { AIService } from './services/geminiService'
import { CacheService } from './services/cacheService'
import MindElixirReact from './components/project/MindElixirReact'
import { ConfigDialog } from './components/project/ConfigDialog'
import type { MindElixirData } from 'mind-elixir'
import type { Summary } from 'node_modules/mind-elixir/dist/types/summary'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
  mindMap?: MindElixirData
  processed: boolean
}

interface BookSummary {
  title: string
  author: string
  chapters: Chapter[]
  connections: string
  overallSummary: string
}

interface BookMindMap {
  title: string
  author: string
  chapters: Chapter[]
  combinedMindMap: MindElixirData | null
}

// 导入配置store
import { useAIConfig, useProcessingOptions } from './stores/configStore'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [bookSummary, setBookSummary] = useState<BookSummary | null>(null)
  const [bookMindMap, setBookMindMap] = useState<BookMindMap | null>(null)
  // error状态已移除，改用toast通知
  const [cacheService] = useState(new CacheService())

  // 使用zustand store管理配置
  const aiConfig = useAIConfig()
  const processingOptions = useProcessingOptions()

  // 从store中解构状态值
  const { provider: aiProvider, apiKey, apiUrl, model } = aiConfig
  const { processingMode, bookType, useSmartDetection, skipNonEssentialChapters } = processingOptions

  // zustand的persist中间件会自动处理配置的加载和保存

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && (selectedFile.name.endsWith('.epub') || selectedFile.name.endsWith('.pdf'))) {
      setFile(selectedFile)
    } else {
      toast.error('请选择有效的 EPUB 或 PDF 文件', {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [])

  // 清除章节缓存的函数
  const clearChapterCache = useCallback((chapterId: string) => {
    if (!file) return

    // 根据处理模式确定缓存键
    const cacheKey = processingMode === 'summary'
      ? `${file.name}_${chapterId}_summary`
      : `${file.name}_${chapterId}_mindmap`

    // 删除缓存
    if (cacheService.delete(cacheKey)) {
      // 使用toast显示提示信息
      toast.success('已清除缓存，下次处理将重新生成内容', {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [file, processingMode, cacheService])

  // 清除整本书缓存的函数
  const clearBookCache = useCallback(() => {
    if (!file) return

    // 获取缓存统计信息
    const stats = cacheService.getStats()
    const bookPrefix = `${file.name}_`

    // 计数器，记录删除的缓存项数量
    let deletedCount = 0

    // 遍历所有缓存键，删除与当前书籍相关的所有缓存
    stats.keys.forEach(key => {
      if (key.startsWith(bookPrefix)) {
        cacheService.delete(key)
        deletedCount++
      }
    })

    // 使用toast显示提示信息
    if (deletedCount > 0) {
      toast.success(`已清除${deletedCount}项缓存，下次处理将重新生成所有内容`, {
        duration: 3000,
        position: 'top-center',
      })
    } else {
      toast.info('没有找到可清除的缓存', {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [file, cacheService])

  const processEbook = useCallback(async () => {
    if (!file || !apiKey) {
      toast.error('请选择文件并输入 API Key', {
        duration: 3000,
        position: 'top-center',
      })
      return
    }

    // 开始新任务时清空上次显示的内容
    setBookSummary(null)
    setBookMindMap(null)
    setProcessing(true)
    setProgress(0)
    setCurrentStep('')

    try {
      const aiService = new AIService({
        provider: aiProvider,
        apiKey,
        apiUrl: aiProvider === 'openai' ? apiUrl : undefined,
        model: model || undefined
      })

      let bookData: { title: string; author: string }
      let chapters: any[]

      const isEpub = file.name.endsWith('.epub')
      const isPdf = file.name.endsWith('.pdf')

      if (isEpub) {
        const epubProcessor = new EpubProcessor()

        // 步骤1: 解析EPUB文件
        setCurrentStep('正在解析 EPUB 文件...')
        const epubData = await epubProcessor.parseEpub(file)
        bookData = { title: epubData.title, author: epubData.author }
        setProgress(10)

        // 步骤2: 提取章节
        setCurrentStep('正在提取章节内容...')
        chapters = await epubProcessor.extractChapters(epubData.book, useSmartDetection, skipNonEssentialChapters)
        setProgress(20)
      } else if (isPdf) {
        const pdfProcessor = new PdfProcessor()

        // 步骤1: 解析PDF文件
        setCurrentStep('正在解析 PDF 文件...')
        const pdfData = await pdfProcessor.parsePdf(file)
        bookData = { title: pdfData.title, author: pdfData.author }
        setProgress(10)

        // 步骤2: 提取章节
        setCurrentStep('正在提取章节内容...')
        chapters = await pdfProcessor.extractChapters(file, useSmartDetection, skipNonEssentialChapters, processingOptions.maxSubChapterDepth)
        setProgress(20)
      } else {
        throw new Error('不支持的文件格式')
      }

      const totalChapters = chapters.length
      const processedChapters: Chapter[] = []

      // 根据模式初始化状态
      if (processingMode === 'summary') {
        setBookSummary({
          title: bookData.title,
          author: bookData.author,
          chapters: [],
          connections: '',
          overallSummary: ''
        })
      } else {
        setBookMindMap({
          title: bookData.title,
          author: bookData.author,
          chapters: [],
          combinedMindMap: null
        })
      }

      // 步骤3: 逐章处理
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        setCurrentStep(`正在处理第 ${i + 1}/${totalChapters} 章: ${chapter.title}`)

        let processedChapter: Chapter

        if (processingMode === 'summary') {
          // 文字总结模式
          const cacheKey = `${file.name}_${chapter.id}_summary`
          let summary = cacheService.get(cacheKey)

          if (!summary) {
            summary = await aiService.summarizeChapter(chapter.title, chapter.content, bookType)
            cacheService.set(cacheKey, summary)
          }

          processedChapter = {
            ...chapter,
            summary,
            processed: true
          }

          processedChapters.push(processedChapter)

          setBookSummary(prevSummary => ({
            ...prevSummary!,
            chapters: [...processedChapters]
          }))
        } else {
          // 思维导图模式
          const cacheKey = `${file.name}_${chapter.id}_mindmap`
          let mindMap: MindElixirData = cacheService.get(cacheKey)

          if (!mindMap) {
            mindMap = await aiService.generateChapterMindMap(chapter.title, chapter.content)
            cacheService.set(cacheKey, mindMap)
          }

          if (!mindMap.nodeData) continue // 无需总结的章节
          processedChapter = {
            ...chapter,
            mindMap,
            processed: true
          }

          processedChapters.push(processedChapter)

          setBookMindMap(prevMindMap => ({
            ...prevMindMap!,
            chapters: [...processedChapters]
          }))
        }

        setProgress(20 + (i + 1) / totalChapters * 60)
      }

      if (processingMode === 'summary') {
        // 文字总结模式的后续步骤
        // 步骤4: 分析章节关联
        setCurrentStep('正在分析章节关联...')
        const connectionsCacheKey = CacheService.generateKey(file.name, 'connections', 'v1')
        let connections = cacheService.get(connectionsCacheKey)
        if (!connections) {
          console.log('🔄 [DEBUG] 缓存未命中，开始分析章节关联')
          connections = await aiService.analyzeConnections(processedChapters)
          cacheService.set(connectionsCacheKey, connections)
          console.log('💾 [DEBUG] 章节关联已缓存')
        } else {
          console.log('✅ [DEBUG] 使用缓存的章节关联')
        }

        setBookSummary(prevSummary => ({
          ...prevSummary!,
          connections
        }))
        setProgress(85)

        // 步骤5: 生成全书总结
        setCurrentStep('正在生成全书总结...')
        const overallSummaryCacheKey = CacheService.generateKey(file.name, 'overall-summary', 'v1')
        let overallSummary = cacheService.get(overallSummaryCacheKey)
        if (!overallSummary) {
          console.log('🔄 [DEBUG] 缓存未命中，开始生成全书总结')
          overallSummary = await aiService.generateOverallSummary(
            bookData.title,
            processedChapters,
            connections
          )
          cacheService.set(overallSummaryCacheKey, overallSummary)
          console.log('💾 [DEBUG] 全书总结已缓存')
        } else {
          console.log('✅ [DEBUG] 使用缓存的全书总结')
        }

        setBookSummary(prevSummary => ({
          ...prevSummary!,
          overallSummary
        }))
      } else {
        // 思维导图模式的后续步骤
        // 步骤4: 合并章节思维导图
        setCurrentStep('正在合并章节思维导图...')
        // 创建根节点
        const rootNode = {
          topic: bookData.title,
          id: '0',
          tags: ['全书'],
          children: processedChapters.map((chapter, index) => ({
            topic: chapter.title,
            id: `chapter_${index + 1}`,
            children: chapter.mindMap?.nodeData?.children || []
          }))
        }

        let combinedMindMap: MindElixirData = {
          nodeData: rootNode,
          arrows: [],
          summaries: processedChapters.reduce((acc, chapter) => acc.concat(chapter.mindMap?.summaries || []), [] as Summary[])
        }

        setProgress(85)

        // 步骤5: 生成思维导图箭头和全书总结节点
        setCurrentStep('正在生成思维导图连接和总结...')
        const arrowsCacheKey = CacheService.generateKey(file.name, 'mindmap-arrows', 'v1')
        let arrowsData = undefined
        // let arrowsData = cacheService.get(arrowsCacheKey)

        if (!arrowsData) {
          console.log('🔄 [DEBUG] 缓存未命中，开始生成箭头')
          arrowsData = await aiService.generateMindMapArrows(combinedMindMap)
          cacheService.set(arrowsCacheKey, arrowsData)
          console.log('💾 [DEBUG] 思维导图箭头已缓存', arrowsData)
        } else {
          console.log('✅ [DEBUG] 使用缓存的思维导图箭头', arrowsData)
        }

        // 合并箭头数据
        if (arrowsData?.arrows) {
          combinedMindMap.arrows = arrowsData.arrows
        }

        setBookMindMap(prevMindMap => ({
          ...prevMindMap!,
          combinedMindMap
        }))
      }

      setProgress(100)
      setCurrentStep('处理完成！')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '处理过程中发生错误', {
        duration: 5000,
        position: 'top-center',
      })
    } finally {
      setProcessing(false)
    }
  }, [file, aiProvider, apiKey, apiUrl, model, processingMode, bookType, useSmartDetection, skipNonEssentialChapters, processingOptions.maxSubChapterDepth, cacheService])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            电子书智能解析器
          </h1>
          <p className="text-gray-600">使用 AI 技术按章节解析 EPUB 和 PDF 电子书并生成智能总结</p>
        </div>

        {/* 文件上传和配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              文件上传与配置
            </CardTitle>
            <CardDescription>
              选择 EPUB 或 PDF 文件并配置 AI 服务
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">选择 EPUB 或 PDF 文件</Label>
              <Input
                id="file"
                type="file"
                accept=".epub,.pdf"
                onChange={handleFileChange}
                disabled={processing}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                已选择: {file?.name || '未选择文件'}
              </div>
              <div className="flex items-center gap-2">
                <ConfigDialog processing={processing} file={file} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearBookCache}
                  disabled={processing}
                  className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  清除整书缓存
                </Button>
              </div>
            </div>
            <Button
              onClick={processEbook}
              disabled={!file || !apiKey || processing}
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  开始解析
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 处理进度 */}
        {processing && (
          <Card>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentStep}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}


        {/* 结果展示 */}
        {(bookSummary || bookMindMap) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {processingMode === 'summary' ? (
                  <><BookOpen className="h-5 w-5" />《{bookSummary?.title}》解析结果</>
                ) : (
                  <><Network className="h-5 w-5" />《{bookMindMap?.title}》思维导图</>
                )}
              </CardTitle>
              <CardDescription>
                作者: {bookSummary?.author || bookMindMap?.author} | 共 {bookSummary?.chapters.length || bookMindMap?.chapters.length} 章
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processingMode === 'summary' && bookSummary ? (
                <Tabs defaultValue="chapters" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="chapters">章节总结</TabsTrigger>
                    <TabsTrigger value="connections">章节关联</TabsTrigger>
                    <TabsTrigger value="overall">全书总结</TabsTrigger>
                  </TabsList>

                  <TabsContent value="chapters" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookSummary.chapters.map((chapter, index) => (
                      <Card key={chapter.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline"># {index + 1}</Badge>
                              {chapter.title}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => clearChapterCache(chapter.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh]">
                                  <DialogHeader>
                                    <DialogTitle>{chapter.title} - 原文内容</DialogTitle>
                                    <DialogDescription>
                                      第 {index + 1} 章的完整原文内容
                                    </DialogDescription>
                                  </DialogHeader>
                                  <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                      {chapter.content}
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {chapter.summary || ''}
                            </ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="connections">
                    <Card>
                      <CardContent>
                        <div className="prose max-w-none text-gray-700 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {bookSummary.connections}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="overall">
                    <Card>
                      <CardContent>
                        <div className="prose max-w-none text-gray-700 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {bookSummary.overallSummary}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : processingMode === 'mindmap' && bookMindMap ? (
                <Tabs defaultValue="chapters" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chapters">章节思维导图</TabsTrigger>
                    <TabsTrigger value="combined">整书思维导图</TabsTrigger>
                  </TabsList>

                  <TabsContent value="chapters" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookMindMap.chapters.map((chapter, index) => (
                      <Card key={chapter.id} className='gap-2'>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg w-full overflow-hidden">
                            <div className="truncate w-full">
                              {chapter.title}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => clearChapterCache(chapter.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh]">
                                  <DialogHeader>
                                    <DialogTitle>{chapter.title} - 原文内容</DialogTitle>
                                    <DialogDescription>
                                      第 {index + 1} 章的完整原文内容
                                    </DialogDescription>
                                  </DialogHeader>
                                  <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                      {chapter.content}
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {chapter.mindMap && (
                            <div className="border rounded-lg">
                              <MindElixirReact
                                data={chapter.mindMap}
                                fitPage={false}
                                options={{ direction: 2 }}
                                className="aspect-square w-full max-w-[500px] mx-auto"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="combined">
                    <Card>
                      <CardContent>
                        {bookMindMap.combinedMindMap ? (
                          <div className="border rounded-lg">
                            <MindElixirReact
                              data={bookMindMap.combinedMindMap}
                              fitPage={false}
                              options={{ direction: 2 }}
                              className="aspect-square w-full h-[600px] mx-auto"
                            />
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            正在生成整书思维导图...
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
