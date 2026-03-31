import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Send, Bot, User, Loader2, ArrowLeft } from 'lucide-react'
import { EpubProcessor } from '../services/epubProcessor'
import { RagService, type Chunk } from '../services/ragService'
import { useChatConfigStore } from '../stores/chatConfigStore'
import { toast } from 'sonner'
import { getDefaultModelFromStorage, useConfigStore } from '../stores/configStore'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function ChatPage() {
  const { t } = useTranslation()
  const { openRouterKey, embeddingModel, setOpenRouterKey, setEmbeddingModel } = useChatConfigStore()
  
  const [step, setStep] = useState<'config' | 'chat'>('config')
  const [file, setFile] = useState<File | null>(null)
  
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [isTestingKey, setIsTestingKey] = useState(false)
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [query, setQuery] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const ragService = useMemo(() => new RagService(), [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.epub')) {
        toast.error(t('upload.invalidFile'))
        return
      }
      setFile(selectedFile)
    }
  }

  const handleTestKey = async () => {
    if (!openRouterKey.trim()) {
      toast.error(t('chat.configTitle') + ': OpenRouter API Key required')
      return
    }

    setIsTestingKey(true)
    try {
      // https://openrouter.ai/api/v1/auth/key is the standard endpoint to retrieve key info and limits
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${openRouterKey.trim()}`,
        },
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to verify key')
      }

      const keyData = result.data
      const limitInfo = keyData.limit === null ? 'No Limit' : `$${(keyData.limit as number).toFixed(2)}`
      const usageInfo = `$${(keyData.usage || 0).toFixed(4)}`
      
      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-sm">Key Verified</p>
          <div className="text-xs">
            <p>Label: {keyData.label || 'N/A'}</p>
            <p>Usage: {usageInfo} / {limitInfo}</p>
            <p>Free Tier Only: {keyData.is_free_tier ? 'Yes' : 'No'}</p>
          </div>
        </div>,
        { duration: 5000 }
      )
    } catch (error) {
      console.error(error)
      toast.error('Test Failed: ' + (error instanceof Error ? error.message : 'Unknown error'), { duration: 5000 })
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleStartIndexing = async () => {
    if (!file) return
    if (!openRouterKey.trim()) {
      toast.error(t('chat.configTitle') + ': OpenRouter API Key required')
      return
    }

    setProcessing(true)
    setProgress(0)
    
    try {
      ragService.setBook(file.name)

      // 尝试加载已有的索引缓存
      setLoadingMessage(t('chat.checkingCache') || 'Checking index cache...')
      try {
        const isLoaded = await ragService.loadIndex()
        if (isLoaded) {
          toast.success(t('chat.cacheFound') || 'Found existing index in cache, skipping extraction.')
          setProcessing(false)
          setStep('chat')
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I have remembered the contents of "${file.name}". What would you like to know about it?`
          }])
          return
        }
      } catch (err) {
        console.warn('Failed to load existing index:', err)
      }

      setLoadingMessage(t('progress.extractingEpub') || 'Parsing EPUB...')
      const processor = new EpubProcessor()
      const bookData = await processor.parseEpub(file)
      
      setLoadingMessage(t('progress.extractingChapters') || 'Extracting chapters...')
      const chapters = await processor.extractChapters(bookData.book, true, 0, false)
      
      if (chapters.length === 0) {
        throw new Error('No chapters extracted.')
      }

      setLoadingMessage(t('chat.indexing') || 'Indexing contents...')
      
      ragService.setBook(file.name)
      await ragService.clearIndex()
      
      const allChunks: Chunk[] = []
      for (const chapter of chapters) {
        if (chapter.content && chapter.content.trim().length > 0) {
          const chunks = ragService.chunkText(chapter.content, chapter.id, chapter.title, 1000, 200)
          allChunks.push(...chunks)
        }
      }

      if (allChunks.length === 0) {
        throw new Error('No valid text chunks found to index.')
      }

      await ragService.buildIndex(allChunks, openRouterKey, embeddingModel, (processed, total) => {
        setProgress(Math.round((processed / total) * 100))
      })

      setLoadingMessage(t('chat.indexingComplete') || 'Indexing complete!')
      setTimeout(() => {
        setProcessing(false)
        setStep('chat')
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I have read "${bookData.title}". What would you like to know about it?`
        }])
      }, 500)
      
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Unknown error')
      setProcessing(false)
    }
  }

  const handleSend = async () => {
    if (!query.trim() || isQuerying) return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query.trim()
    }
    
    setMessages(prev => [...prev, userMessage])
    setQuery('')
    setIsQuerying(true)
    
    const assistantMessageId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }])

    try {
      // Get the chat LLM from general AI Config
      let chatModelConfig = getDefaultModelFromStorage()
      if (!chatModelConfig) {
        chatModelConfig = useConfigStore.getState().aiConfig
      }

      // If user provided OpenRouter key, we use that for LLM too, but let's fall back to whatever is configured
      // Or we can just use the provided OpenRouter key to ensure it works. 
      // Actually, standardizing on OpenRouter API key for Chat LLM is safer if the user's default model is gemini/openai which might fail.
      // We will use the general configured model if possible. Wait, OpenRouter requires openrouter url.
      // The instructions simply say "Call OpenRouter's LLM". Let's use the openRouterKey.
      const chatModel = chatModelConfig.model || 'openai/gpt-3.5-turbo'

      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: '*(Retrieving context...)*' } : m))
      
      const contextChunks = await ragService.search(userMessage.content, openRouterKey, embeddingModel, 5)

      console.group('🔍 向量搜索匹配结果 (Vector Search Results)')
      console.log('提问 (Query):', userMessage.content)
      contextChunks.forEach((chunk, i) => {
        console.log(`\n[%d] 匹配章节 (Chapter): %s (ID: %s)`, i + 1, chunk.chapterTitle, chunk.id)
        console.log(`内容片段 (Context snippet):\n%s...`, chunk.text.substring(0, 200).replace(/\n/g, ' '))
      })
      console.groupEnd()

      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: '*(Generating answer...)*' } : m))

      // Keep track of full text across the stream
      let fullResponse = ''
      
      await ragService.askQuestionStream(
        userMessage.content,
        contextChunks,
        openRouterKey,
        chatModel, // using configured model name
        (chunkText) => {
          fullResponse += chunkText
          setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: fullResponse } : m))
        }
      )

    } catch (error) {
      console.error(error)
      toast.error('Failed to get answer: ' + (error instanceof Error ? error.message : String(error)))
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: 'Error: ' + (error instanceof Error ? error.message : 'Unknown') } : m))
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="border-b px-6 py-4 flex items-center gap-4 bg-card">
        {step === 'chat' && (
          <button 
            onClick={() => setStep('config')}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">
          {t('chat.title') || 'Talk with Book'}
        </h1>
        <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full">
          Beta
        </span>
      </div>

      <div className="flex-1 overflow-y-auto w-full flex justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-3xl">
          {step === 'config' ? (
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold mb-2">{t('chat.configTitle') || 'Configuration'}</h2>
                <p className="text-sm text-muted-foreground">{t('chat.description') || 'Index the book content using RAG and ask questions'}</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">{t('upload.selectFile')}</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      accept=".epub" 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={processing}
                    />
                    <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">
                      {file ? file.name : (t('upload.selectFile') || 'Select EPUB')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Only EPUB files are supported in this Beta version.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">{t('chat.openRouterKey') || 'OpenRouter API Key'}</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={openRouterKey}
                      onChange={(e) => setOpenRouterKey(e.target.value)}
                      className="flex-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={processing}
                    />
                    <button
                      onClick={handleTestKey}
                      disabled={!openRouterKey || processing || isTestingKey}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
                    >
                      {isTestingKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {t('chat.testKey', 'Test Key')}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">{t('chat.embeddingModel') || 'Embedding Model Name'}</label>
                  <input
                    type="text"
                    placeholder="e.g. nomic-embed-text"
                    value={embeddingModel}
                    onChange={(e) => setEmbeddingModel(e.target.value)}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={processing}
                  />
                  <p className="text-xs text-muted-foreground">Supported openrouter embedding model (e.g. nomic-embed-text)</p>
                </div>
              </div>

              <div className="p-6 bg-muted/30 border-t flex flex-col gap-4">
                <button
                  onClick={handleStartIndexing}
                  disabled={!file || !openRouterKey || !embeddingModel || processing}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('chat.indexing') || 'Indexing...'} {progress > 0 && `(${progress}%)`}
                    </>
                  ) : (
                    t('chat.startIndexing') || 'Start Indexing'
                  )}
                </button>
                {processing && loadingMessage && (
                  <p className="text-xs text-center text-muted-foreground animate-pulse">
                    {loadingMessage}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full max-h-[calc(100vh-120px)] bg-card border rounded-xl shadow-sm overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div 
                      className={`px-4 py-3 rounded-2xl max-w-[85%] whitespace-pre-wrap ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-muted/50 rounded-tl-none text-foreground'
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-card border-t mt-auto">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('chat.askQuestion') || 'Ask a question about the book...'}
                    disabled={isQuerying}
                    className="flex-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!query.trim() || isQuerying}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    {isQuerying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
