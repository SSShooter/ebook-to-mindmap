import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BookOpen, Network, Loader2, ArrowLeft, Download } from 'lucide-react'
import { MarkdownCard } from './MarkdownCard'
import { MindMapCard } from './MindMapCard'
import { openInMindElixir, downloadMindMap } from '@/utils'
import type { MindElixirData, Options } from 'mind-elixir'
import type { ChapterData } from '@/services/epubProcessor'
import { toast } from 'sonner'

interface ChapterGroup {
  groupId: string
  tag: string | null
  chapterIds: string[]
  chapterTitles: string[]
  summary?: string
  mindMap?: MindElixirData
  isLoading?: boolean
}

interface BookSummary {
  title: string
  author: string
  groups: ChapterGroup[]
  connections: string
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
  extractingChapters: boolean
  progress: number
  currentStep: string
  error: string | null
  bookSummary: BookSummary | null
  bookMindMap: BookMindMap | null
  processingMode: 'summary' | 'mindmap' | 'combined-mindmap'
  extractedChapters: ChapterData[] | null
  onBackToConfig: () => void
  onClearChapterCache: (chapterId: string) => void
  onClearSpecificCache: (cacheType: 'connections' | 'overall_summary' | 'combined_mindmap' | 'merged_mindmap') => void
  onReadChapter: (chapterId: string, chapterIds: string[]) => void
  mindElixirOptions: Options
}

export function Step2Results({
  bookData,
  processing,
  extractingChapters,
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
  mindElixirOptions
}: Step2ResultsProps) {
  const { t } = useTranslation()

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
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
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
              <div className="text-lg font-medium text-gray-700 truncate">
                {bookData ? `${bookData.title} - ${bookData.author}` : t('results.processing')}
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
          {(processing || extractingChapters || error) && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  {error ? (
                    <span className="text-red-500 font-medium">Error: {error}</span>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{currentStep}</span>
                    </>
                  )}
                </div>
                <span>{error ? '' : `${Math.round(progress)}%`}</span>
              </div>
              <Progress value={error ? 0 : progress} className="w-full" />
            </div>
          )}

          {/* 结果统计信息 */}
          {(bookSummary || bookMindMap) && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {processingMode === 'summary' ? (
                  <><BookOpen className="h-5 w-5 text-gray-600" /><span className="font-medium text-sm text-gray-700">{t('results.summaryTitle', { title: bookSummary?.title })}</span></>
                ) : processingMode === 'mindmap' ? (
                  <><Network className="h-5 w-5 text-gray-600" /><span className="font-medium text-sm text-gray-700">{t('results.chapterMindMapTitle', { title: bookMindMap?.title })}</span></>
                ) : (
                  <><Network className="h-5 w-5 text-gray-600" /><span className="font-medium text-sm text-gray-700">{t('results.wholeMindMapTitle', { title: bookMindMap?.title })}</span></>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {t('results.author', { author: bookSummary?.author || bookMindMap?.author })} • {bookSummary ? t('results.groupCount', { count: bookSummary.groups.length }) : bookMindMap ? t('results.groupCount', { count: bookMindMap.groups.length }) : ''}
              </p>
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="chapters">{t('results.tabs.chapterSummary')}</TabsTrigger>
                  <TabsTrigger value="connections">{t('results.tabs.connections')}</TabsTrigger>
                  <TabsTrigger value="overall">{t('results.tabs.overallSummary')}</TabsTrigger>
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
                  <TabsTrigger value="chapters">{t('results.tabs.chapterMindMaps')}</TabsTrigger>
                  <TabsTrigger value="combined">{t('results.tabs.combinedMindMap')}</TabsTrigger>
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

                <TabsContent value="combined">
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
