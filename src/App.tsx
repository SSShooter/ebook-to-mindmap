import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, BookOpen, Brain, FileText, Loader2, Settings } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EpubProcessor } from './services/epubProcessor'
import { PdfProcessor } from './services/pdfProcessor'
import { AIService } from './services/geminiService'
import { CacheService } from './services/cacheService'

interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
  processed: boolean
}

interface BookSummary {
  title: string
  author: string
  chapters: Chapter[]
  connections: string
  overallSummary: string
}

// AI配置接口
interface AIConfig {
  provider: 'gemini' | 'openai'
  apiKey: string
  apiUrl: string
  model: string
}

// 默认配置
const DEFAULT_CONFIG: AIConfig = {
  provider: 'gemini',
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1',
  model: 'gemini-1.5-flash'
}

// 本地存储键名
const AI_CONFIG_STORAGE_KEY = 'ebook-mindmap-ai-config'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('gemini-1.5-flash')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [bookSummary, setBookSummary] = useState<BookSummary | null>(null)
  const [error, setError] = useState('')
  const [useSmartDetection, setUseSmartDetection] = useState(false)
  const [skipNonEssentialChapters, setSkipNonEssentialChapters] = useState(true)

  // 从本地存储加载AI配置
  const loadAIConfig = useCallback(() => {
    try {
      const savedConfig = localStorage.getItem(AI_CONFIG_STORAGE_KEY)
      if (savedConfig) {
        const config: AIConfig = JSON.parse(savedConfig)
        setAiProvider(config.provider)
        setApiKey(config.apiKey)
        setApiUrl(config.apiUrl)
        setModel(config.model)
        console.log('✅ [DEBUG] 已加载保存的AI配置:', config.provider)
      } else {
        console.log('ℹ️ [DEBUG] 未找到保存的AI配置，使用默认配置')
      }
    } catch (error) {
      console.error('❌ [DEBUG] 加载AI配置失败:', error)
    }
  }, [])

  // 保存AI配置到本地存储
  const saveAIConfig = useCallback((config: AIConfig) => {
    try {
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config))
      console.log('💾 [DEBUG] AI配置已保存:', config.provider)
    } catch (error) {
      console.error('❌ [DEBUG] 保存AI配置失败:', error)
    }
  }, [])

  // 组件挂载时加载配置
  useEffect(() => {
    loadAIConfig()
  }, [])

  // 监听AI配置变化并自动保存
  useEffect(() => {
    const config: AIConfig = {
      provider: aiProvider,
      apiKey,
      apiUrl,
      model
    }
    
    // 只有在配置有效时才保存（至少要有API Key）
    if (apiKey.trim()) {
      saveAIConfig(config)
    }
  }, [aiProvider, apiKey, apiUrl, model, saveAIConfig])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && (selectedFile.name.endsWith('.epub') || selectedFile.name.endsWith('.pdf'))) {
      setFile(selectedFile)
      setError('')
    } else {
      setError('请选择有效的 EPUB 或 PDF 文件')
    }
  }, [])

  const processEbook = useCallback(async () => {
    if (!file || !apiKey) {
      setError('请选择文件并输入 Gemini API Key')
      return
    }

    // 开始新任务时清空上次显示的内容
    setBookSummary(null)
    setProcessing(true)
    setProgress(0)
    setError('')
    setCurrentStep('')
    
    try {
      const aiService = new AIService({
        provider: aiProvider,
        apiKey,
        apiUrl: aiProvider === 'openai' ? apiUrl : undefined,
        model: model || undefined
      })
      const cacheService = new CacheService()
      
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
        chapters = await epubProcessor.extractChapters(epubData.book)
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
        chapters = await pdfProcessor.extractChapters(file, useSmartDetection, skipNonEssentialChapters)
        setProgress(20)
      } else {
        throw new Error('不支持的文件格式')
      }

      const totalChapters = chapters.length
      const processedChapters: Chapter[] = []

      debugger

      // 步骤3: 逐章处理
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        setCurrentStep(`正在处理第 ${i + 1}/${totalChapters} 章: ${chapter.title}`)
        
        // 检查缓存
        const cacheKey = `${file.name}_${chapter.id}`
        let summary = cacheService.get(cacheKey)
        
        if (!summary) {
          // 使用AI服务总结章节
          summary = await aiService.summarizeChapter(chapter.title, chapter.content)
          cacheService.set(cacheKey, summary)
        }
        
        processedChapters.push({
          ...chapter,
          summary,
          processed: true
        })
        
        setProgress(20 + (i + 1) / totalChapters * 60)
      }

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
      setProgress(100)

      setBookSummary({
        title: bookData.title,
        author: bookData.author,
        chapters: processedChapters,
        connections,
        overallSummary
      })

      setCurrentStep('处理完成！')
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理过程中发生错误')
    } finally {
      setProcessing(false)
    }
  }, [file, aiProvider, apiKey, apiUrl, model])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
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
            <div className="space-y-4">
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
              
              {/* AI 服务配置 */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4" />
                  <Label className="text-sm font-medium">AI 服务配置</Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-provider">AI 提供商</Label>
                    <Select value={aiProvider} onValueChange={(value: 'gemini' | 'openai') => setAiProvider(value)} disabled={processing}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择 AI 提供商" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI 兼容</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="apikey">
                      {aiProvider === 'gemini' ? 'Gemini API Key' : 'API Token'}
                    </Label>
                    <Input
                      id="apikey"
                      type="password"
                      placeholder={aiProvider === 'gemini' ? '输入您的 Gemini API Key' : '输入您的 API Token'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                </div>
                
                {aiProvider === 'openai' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-url">API 地址</Label>
                      <Input
                        id="api-url"
                        type="url"
                        placeholder="https://api.openai.com/v1"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        disabled={processing}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="model">模型名称（可选）</Label>
                      <Input
                        id="model"
                        type="text"
                        placeholder="gpt-3.5-turbo, gpt-4 等"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={processing}
                      />
                    </div>
                  </div>
                )}
                
                {aiProvider === 'gemini' && (
                  <div className="space-y-2">
                    <Label htmlFor="gemini-model">模型名称（可选）</Label>
                    <Input
                      id="gemini-model"
                      type="text"
                      placeholder="gemini-1.5-flash, gemini-1.5-pro 等"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {file && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  已选择: {file.name}
                </div>
                
                {file.name.endsWith('.pdf') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                      <div className="space-y-1">
                        <Label htmlFor="smart-detection" className="text-sm font-medium">
                          启用智能章节检测
                        </Label>
                        <p className="text-xs text-gray-600">
                          当PDF没有目录时，尝试智能识别章节标题（如"第X章"、"Chapter X"等）
                        </p>
                      </div>
                      <Switch
                        id="smart-detection"
                        checked={useSmartDetection}
                        onCheckedChange={setUseSmartDetection}
                        disabled={processing}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                      <div className="space-y-1">
                        <Label htmlFor="skip-non-essential" className="text-sm font-medium">
                          跳过无关键内容章节
                        </Label>
                        <p className="text-xs text-gray-600">
                          自动跳过致谢、推荐阅读、作者简介等非核心内容章节
                        </p>
                      </div>
                      <Switch
                        id="skip-non-essential"
                        checked={skipNonEssentialChapters}
                        onCheckedChange={setSkipNonEssentialChapters}
                        disabled={processing}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
            <CardContent className="pt-6">
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

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 结果展示 */}
        {bookSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                《{bookSummary.title}》解析结果
              </CardTitle>
              <CardDescription>
                作者: {bookSummary.author} | 共 {bookSummary.chapters.length} 章
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="chapters" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="chapters">章节总结</TabsTrigger>
                  <TabsTrigger value="connections">章节关联</TabsTrigger>
                  <TabsTrigger value="overall">全书总结</TabsTrigger>
                </TabsList>
                
                <TabsContent value="chapters" className="space-y-4">
                  <ScrollArea className="h-96">
                    {bookSummary.chapters.map((chapter, index) => (
                      <Card key={chapter.id} className="mb-4">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Badge variant="outline">第{index + 1}章</Badge>
                            {chapter.title}
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
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="connections">
                  <Card>
                    <CardContent className="pt-6">
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
                    <CardContent className="pt-6">
                      <div className="prose max-w-none text-gray-700 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {bookSummary.overallSummary}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
