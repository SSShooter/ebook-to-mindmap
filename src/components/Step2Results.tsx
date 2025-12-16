import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BookOpen, Network, Loader2, ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { MarkdownCard } from './MarkdownCard'
import { MermaidDiagram } from './MermaidDiagram'
import { MindMapCard } from './MindMapCard'
import { openInMindElixir, downloadMindMap } from '@/utils'
import type { MindElixirData, Options } from 'mind-elixir'
import type { ChapterData } from '@/services/epubProcessor'
import { toast } from 'sonner'
import { useConfigStore } from '@/stores/configStore'

interface ChapterGroup {
  groupId: string
  tag: string | null
  chapterIds: string[]
  chapterTitles: string[]
  summary?: string
  reasoning?: string
  mindMap?: MindElixirData
  isLoading?: boolean
}

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

interface Step2ResultsProps {
  bookData: { title: string; author: string } | null
  processing: boolean
  progress: number
  currentStep: string
  error: string | null
  bookSummary: BookSummary | null
  bookMindMap: BookMindMap | null
  processingMode: 'summary' | 'mindmap' | 'combined-mindmap'
  extractedChapters: ChapterData[] | null
  onBackToConfig: () => void
  onClearChapterCache: (chapterId: string) => void
  onClearSpecificCache: (cacheType: 'connections' | 'overall_summary' | 'character_relationship' | 'combined_mindmap' | 'merged_mindmap') => void
  onReadChapter: (chapterId: string, chapterIds: string[]) => void
  onRetry?: () => void
  mindElixirOptions: Options
}

export function Step2Results({
  processing,
  progress,
  currentStep,
  error,
  bookSummary,
  bookMindMap,
  processingMode,
  extractedChapters,
  onBackToConfig,
  onClearChapterCache,
  onClearSpecificCache,
  onReadChapter,
  onRetry,
  mindElixirOptions
}: Step2ResultsProps) {
  const { t } = useTranslation()
  const { bookType } = useConfigStore(state => state.processingOptions)
  const showCharacterRelationship = bookType !== 'non-fiction'

  const downloadAllMarkdown = () => {
    if (!bookSummary) return

    let markdownContent = `# ${bookSummary.title}

**${t('results.author', { author: bookSummary.author })}**

---

`

    markdownContent += `## ${t('results.tabs.chapterSummary')}\n\n`
    bookSummary.groups.forEach((group) => {
      const groupTitle = group.tag
        ? `### ${group.tag} (${group.chapterTitles.join(', ')})`
        : `### ${group.chapterTitles[0]}`
      markdownContent += `${groupTitle}\n\n${group.summary || ''}\n\n`
    })

    markdownContent += `---\n\n`

    if (bookSummary.connections) {
      markdownContent += `## ${t('results.tabs.connections')}

${bookSummary.connections}

---

`
    }

    if (bookSummary.overallSummary) {
      markdownContent += `## ${t('results.tabs.overallSummary')}

${bookSummary.overallSummary}

`
    }

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${bookSummary.title}_${t('results.tabs.overallSummary')}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(t('download.markdownDownloaded'), {
      duration: 3000,
      position: 'top-center',
    })
  }

  return (
    <div className='h-full flex flex-col p-4 gap-3'>
      {/* 顶部固定区域 */}
      <div className="shrink-0">
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          {/* 头部导航和标题 */}
          <div className="flex items-center justify-between gap-3 overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBackToConfig}
                  className="flex items-center gap-2 shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('common.backToConfig')}</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center justify-between flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {processingMode === 'summary' ? (
                  <><BookOpen className="h-5 w-5 text-gray-600 shrink-0" /><span className="font-medium text-sm text-gray-700 truncate">{t('results.summaryTitle', { title: bookSummary?.title })}</span></>
                ) : processingMode === 'mindmap' ? (
                  <><Network className="h-5 w-5 text-gray-600 shrink-0" /><span className="font-medium text-sm text-gray-700 truncate">{t('results.chapterMindMapTitle', { title: bookMindMap?.title })}</span></>
                ) : (
                  <><Network className="h-5 w-5 text-gray-600 shrink-0" /><span className="font-medium text-sm text-gray-700 truncate">{t('results.wholeMindMapTitle', { title: bookMindMap?.title })}</span></>
                )}
              </div>
              <p className="text-xs text-gray-500 shrink-0">
                {t('results.author', { author: bookSummary?.author || bookMindMap?.author })} • {bookSummary ? t('results.groupCount', { count: bookSummary.groups.length }) : bookMindMap ? t('results.groupCount', { count: bookMindMap.groups.length }) : ''}
              </p>
            </div>
            {processingMode === 'summary' && bookSummary && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAllMarkdown}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('download.downloadAllMarkdown')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* 进度条状态 */}
          {(processing || error) && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  {error ? (
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 font-medium">Error: {error}</span>
                      {onRetry && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onRetry}
                          className="flex items-center gap-1 text-xs"
                        >
                          <RefreshCw className="h-3 w-3" />
                          {t('common.retry')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{currentStep}</span>
                    </>
                  )}
                </div>
                <span>{error ? '' : `${Math.round(progress)}%`}</span>
              </div>
              {!error && <Progress value={progress} className="w-full" />}
            </div>
          )}

        </div>
      </div>

      {/* 可滚动的内容区域 */}
      {(bookSummary || bookMindMap) && (
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="pr-2">
              {processingMode === 'summary' && bookSummary ? (
                <Tabs defaultValue="chapters" className="w-full">
                  <TabsList className={`grid w-full ${showCharacterRelationship ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <TabsTrigger value="chapters">📑 <span className="hidden md:inline">{t('results.tabs.chapterSummary')}</span></TabsTrigger>
                    <TabsTrigger value="connections">🔗 <span className="hidden md:inline">{t('results.tabs.connections')}</span></TabsTrigger>
                    {showCharacterRelationship && (
                      <TabsTrigger value="characterRelationship">👥 <span className="hidden md:inline">{t('results.tabs.characterRelationship')}</span></TabsTrigger>
                    )}
                    <TabsTrigger value="overall">📄 <span className="hidden md:inline">{t('results.tabs.overallSummary')}</span></TabsTrigger>
                  </TabsList>

                  <TabsContent value="chapters" className="space-y-3">
                    {bookSummary.groups.map((group, index) => {
                      const groupTitle = group.tag
                        ? `${group.tag} (${group.chapterTitles.join(', ')})`
                        : group.chapterTitles[0]
                      const groupContent = group.chapterIds.map(id => {
                        const chapter = extractedChapters?.find(ch => ch.id === id)
                        return chapter ? `## ${chapter.title}\n\n${chapter.content}` : ''
                      }).join('\n\n')

                      return (
                        <MarkdownCard
                          key={group.groupId}
                          id={group.groupId}
                          title={groupTitle}
                          content={groupContent}
                          markdownContent={group.summary || ''}
                          reasoning={group.reasoning}
                          index={index}
                          defaultCollapsed={index > 0}
                          onClearCache={onClearChapterCache}
                          isLoading={group.isLoading}
                          onReadChapter={() => {
                            const chapterIds = group.chapterIds
                            if (chapterIds.length > 0) {
                              onReadChapter(chapterIds[0], chapterIds)
                            }
                          }}
                        />
                      )
                    })}
                  </TabsContent>

                  <TabsContent value="connections">
                    <MarkdownCard
                      id="connections"
                      title={t('results.tabs.connections')}
                      content={bookSummary.connections}
                      markdownContent={bookSummary.connections}
                      index={0}
                      showClearCache={true}
                      showViewContent={false}
                      showCopyButton={true}
                      onClearCache={() => onClearSpecificCache('connections')}
                    />
                  </TabsContent>

                  {showCharacterRelationship && (
                    <TabsContent value="characterRelationship">
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">{t('results.tabs.characterRelationship')}</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onClearSpecificCache('character_relationship')}
                          >
                            {t('common.clearCache')}
                          </Button>
                        </div>
                        {bookSummary.characterRelationship ? (
                          <MermaidDiagram
                            chart={bookSummary.characterRelationship}
                            className="w-full min-h-[400px] flex items-center justify-center"
                          />
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            {t('results.generatingCharacterRelationship')}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="overall">
                    <MarkdownCard
                      id="overall"
                      title={t('results.tabs.overallSummary')}
                      content={bookSummary.overallSummary}
                      markdownContent={bookSummary.overallSummary}
                      index={0}
                      showClearCache={true}
                      showViewContent={false}
                      showCopyButton={true}
                      onClearCache={() => onClearSpecificCache('overall_summary')}
                    />
                  </TabsContent>
                </Tabs>
              ) : processingMode === 'mindmap' && bookMindMap ? (
                <Tabs defaultValue="chapters" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chapters">🧩 <span className="hidden md:inline">{t('results.tabs.chapterMindMaps')}</span></TabsTrigger>
                    <TabsTrigger value="combined">🌳 <span className="hidden md:inline">{t('results.tabs.combinedMindMap')}</span></TabsTrigger>
                  </TabsList>

                  <TabsContent value="chapters" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bookMindMap.groups.map((group, index) => {
                      const groupTitle = group.tag
                        ? `${group.tag} (${group.chapterTitles.join(', ')})`
                        : group.chapterTitles[0]
                      const groupContent = group.chapterIds.map(id => {
                        const chapter = extractedChapters?.find(ch => ch.id === id)
                        return chapter ? `## ${chapter.title}\n\n${chapter.content}` : ''
                      }).join('\n\n')

                      return (
                        <MindMapCard
                          key={group.groupId}
                          id={group.groupId}
                          title={groupTitle}
                          isLoading={group.isLoading}
                          content={groupContent}
                          mindMapData={group.mindMap || { nodeData: { topic: '', id: '', children: [] } }}
                          index={index}
                          showCopyButton={false}
                          onClearCache={onClearChapterCache}
                          onOpenInMindElixir={openInMindElixir}
                          onDownloadMindMap={downloadMindMap}
                          onReadChapter={() => {
                            const chapterIds = group.chapterIds
                            if (chapterIds.length > 0) {
                              onReadChapter(chapterIds[0], chapterIds)
                            }
                          }}
                          mindElixirOptions={mindElixirOptions}
                        />
                      )
                    })}
                  </TabsContent>

                  <TabsContent value="combined" className='grid grid-cols-1'>
                    {bookMindMap.combinedMindMap ? (
                      <MindMapCard
                        id="combined"
                        title={t('results.tabs.combinedMindMap')}
                        content=""
                        mindMapData={bookMindMap.combinedMindMap}
                        index={0}
                        onOpenInMindElixir={(mindmapData) => openInMindElixir(mindmapData, t('results.combinedMindMapTitle', { title: bookMindMap.title }))}
                        onDownloadMindMap={downloadMindMap}
                        onClearCache={() => onClearSpecificCache('merged_mindmap')}
                        showClearCache={true}
                        showViewContent={false}
                        showCopyButton={false}
                        mindMapClassName="w-full h-[600px] mx-auto"
                        mindElixirOptions={mindElixirOptions}
                      />
                    ) : (
                      <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                        {t('results.generatingMindMap')}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : processingMode === 'combined-mindmap' && bookMindMap ? (
                bookMindMap.combinedMindMap ? (
                  <MindMapCard
                    id="whole-book"
                    title={t('results.tabs.combinedMindMap')}
                    content=""
                    mindMapData={bookMindMap.combinedMindMap}
                    index={0}
                    onOpenInMindElixir={(mindmapData) => openInMindElixir(mindmapData, t('results.combinedMindMapTitle', { title: bookMindMap.title }))}
                    onDownloadMindMap={downloadMindMap}
                    onClearCache={() => onClearSpecificCache('combined_mindmap')}
                    showClearCache={true}
                    showViewContent={false}
                    showCopyButton={false}
                    mindMapClassName="w-full h-[600px] mx-auto"
                    mindElixirOptions={mindElixirOptions}
                  />
                ) : (
                  <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                    {t('results.generatingMindMap')}
                  </div>
                )
              ) : null}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
