import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Trash2,
  ArrowLeft,
  Loader2,
  FileText,
  Network,
  BookMarked,
  Download,
} from 'lucide-react'
import {
  CacheService,
  type CacheKeyType,
  type CacheValue,
} from '@/services/cacheService'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { MarkdownCard } from '@/components/MarkdownCard'
import { MindMapCard } from '@/components/MindMapCard'
import type { MindElixirData } from 'mind-elixir'

const cacheService = new CacheService()

interface CacheEntry {
  key: string
  type: CacheKeyType
  chapterId?: string
}

// 按模式分组的缓存项
type CacheMode = 'summary' | 'mindmap'

interface BookModeGroup {
  bookName: string
  mode: CacheMode
  entries: CacheEntry[]
  displayName: string
}

// 获取缓存类型标签
const getCacheTypeLabel = (
  type: CacheKeyType,
  t: (key: string) => string
): string => {
  const labels: Record<CacheKeyType, string> = {
    summary: t('cacheManagement.types.summary'),
    mindmap: t('cacheManagement.types.mindmap'),
    connections: t('cacheManagement.types.connections'),
    overall_summary: t('cacheManagement.types.overallSummary'),
    character_relationship: t('cacheManagement.types.characterRelationship'),
    combined_mindmap: t('cacheManagement.types.combinedMindmap'),
    merged_mindmap: t('cacheManagement.types.mergedMindmap'),
    mindmap_arrows: t('cacheManagement.types.mindmapArrows'),
    selected_chapters: t('cacheManagement.types.selectedChapters'),
    chapter_tags: t('cacheManagement.types.chapterTags'),
    custom_prompt: t('cacheManagement.types.customPrompt'),
    use_custom_only: t('cacheManagement.types.useCustomOnly'),
  }
  return labels[type] || type
}

// 判断缓存类型属于哪个模式
const getEntryMode = (type: CacheKeyType): CacheMode | null => {
  const summaryTypes: CacheKeyType[] = [
    'summary',
    'connections',
    'overall_summary',
    'character_relationship',
  ]
  const mindmapTypes: CacheKeyType[] = [
    'mindmap',
    'combined_mindmap',
    'merged_mindmap',
    'mindmap_arrows',
  ]

  if (summaryTypes.includes(type)) return 'summary'
  if (mindmapTypes.includes(type)) return 'mindmap'
  return null
}

export function CacheManagementPage() {
  const { t } = useTranslation()
  const [bookModeGroups, setBookModeGroups] = useState<BookModeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<BookModeGroup | null>(null)
  const [cachedValues, setCachedValues] = useState<Map<string, CacheValue>>(
    new Map()
  )
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    key?: string
    group?: BookModeGroup
  } | null>(null)

  // 加载缓存数据
  const loadCacheData = async () => {
    setLoading(true)
    try {
      const grouped = await cacheService.getCacheEntriesByBook()
      const groups: BookModeGroup[] = []

      grouped.forEach((entries, bookName) => {
        // 按模式分组
        const summaryEntries: CacheEntry[] = []
        const mindmapEntries: CacheEntry[] = []

        for (const entry of entries) {
          const mode = getEntryMode(entry.type)
          if (mode === 'summary') {
            summaryEntries.push(entry)
          } else if (mode === 'mindmap') {
            mindmapEntries.push(entry)
          }
        }

        // 创建分组
        if (summaryEntries.length > 0) {
          groups.push({
            bookName,
            mode: 'summary',
            entries: summaryEntries,
            displayName: bookName,
          })
        }

        if (mindmapEntries.length > 0) {
          groups.push({
            bookName,
            mode: 'mindmap',
            entries: mindmapEntries,
            displayName: bookName,
          })
        }
      })

      // 按书名排序
      groups.sort((a, b) => {
        const nameCompare = a.bookName.localeCompare(b.bookName)
        if (nameCompare !== 0) return nameCompare
        // 同一本书，summary 排在 mindmap 前面
        return a.mode === 'summary' ? -1 : 1
      })

      setBookModeGroups(groups)
    } catch (error) {
      console.error('Failed to load cache data:', error)
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCacheData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 加载缓存值
  const loadCacheValue = async (key: string) => {
    if (cachedValues.has(key) || loadingKeys.has(key)) return

    setLoadingKeys((prev) => new Set(prev).add(key))
    try {
      const value = await cacheService.getCacheValueByKey(key)
      setCachedValues((prev) => new Map(prev).set(key, value))
    } catch (error) {
      console.error('Failed to load cache value:', error)
    } finally {
      setLoadingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  // 当选中分组时，预加载所有缓存值
  useEffect(() => {
    if (selectedGroup) {
      for (const entry of selectedGroup.entries) {
        loadCacheValue(entry.key)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup])

  // 确认删除
  const confirmDelete = (target: { key?: string; group?: BookModeGroup }) => {
    setDeleteTarget(target)
    setDeleteDialogOpen(true)
  }

  // 执行删除
  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      if (deleteTarget.key) {
        await cacheService.deleteCacheByKey(deleteTarget.key)
        toast.success(t('cacheManagement.deleteSuccess'))
        setCachedValues((prev) => {
          const next = new Map(prev)
          next.delete(deleteTarget.key!)
          return next
        })
      } else if (deleteTarget.group) {
        // 删除该分组的所有缓存
        let deletedCount = 0
        for (const entry of deleteTarget.group.entries) {
          if (await cacheService.deleteCacheByKey(entry.key)) {
            deletedCount++
          }
        }
        toast.success(
          t('cacheManagement.deleteBookSuccess', { count: deletedCount })
        )
        setSelectedGroup(null)
      }
      await loadCacheData()
    } catch (error) {
      console.error('Failed to delete cache:', error)
      toast.error(t('common.error'))
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  // 下载内容
  const handleDownload = async (group: BookModeGroup) => {
    try {
      toast.info(t('cacheManagement.preparingDownload'))

      const zip = new JSZip()
      const isSummary = group.mode === 'summary'

      // 创建文件夹
      const folder = zip.folder(group.displayName)
      if (!folder) {
        throw new Error('Failed to create folder')
      }

      // 分类章节内容
      const chapters: CacheEntry[] = []
      const otherEntries: CacheEntry[] = []

      for (const entry of group.entries) {
        if (entry.type === 'summary' || entry.type === 'mindmap') {
          chapters.push(entry)
        } else {
          otherEntries.push(entry)
        }
      }

      // 添加章节内容
      for (const entry of chapters) {
        // 直接从 cacheService 获取数据，而不是依赖 state
        const value = await cacheService.getCacheValueByKey(entry.key)
        if (!value) continue

        const chapterName = entry.chapterId || 'unknown'

        if (isSummary && typeof value === 'string') {
          // 文字总结模式：保存为 markdown
          folder.file(`${chapterName}.md`, value)
        } else if (
          !isSummary &&
          value &&
          typeof value === 'object' &&
          'nodeData' in value
        ) {
          // 思维导图模式：保存为 JSON
          folder.file(`${chapterName}.json`, JSON.stringify(value, null, 2))
        }
      }

      // 添加其他内容（如章节关联、全书总结等）
      for (const entry of otherEntries) {
        // 直接从 cacheService 获取数据
        const value = await cacheService.getCacheValueByKey(entry.key)
        if (!value) continue

        const fileName = getCacheTypeLabel(entry.type, t)

        if (typeof value === 'string') {
          folder.file(`${fileName}.md`, value)
        } else if (typeof value === 'object' && 'nodeData' in value) {
          folder.file(`${fileName}.json`, JSON.stringify(value, null, 2))
        } else {
          // 其他类型保存为 JSON
          folder.file(`${fileName}.json`, JSON.stringify(value, null, 2))
        }
      }

      // 生成并下载 zip 文件
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${group.displayName}_${group.mode}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(t('cacheManagement.downloadSuccess'))
    } catch (error) {
      console.error('Failed to download content:', error)
      toast.error(t('cacheManagement.downloadError'))
    }
  }

  // 渲染列表项
  const renderListItem = (group: BookModeGroup) => {
    const isSummary = group.mode === 'summary'
    const Icon = isSummary ? FileText : Network
    const modeLabel = isSummary
      ? t('cacheManagement.modeSummary')
      : t('cacheManagement.modeMindmap')

    return (
      <div
        key={`${group.bookName}-${group.mode}`}
        onClick={() => setSelectedGroup(group)}
        className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-border hover:shadow-sm cursor-pointer transition-all">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="font-medium truncate">{group.displayName}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Badge variant={isSummary ? 'default' : 'secondary'}>
                {modeLabel}
              </Badge>
              <span>
                {group.entries.length} {t('cacheManagement.items')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload(group)
            }}
            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              confirmDelete({ group })
            }}
            className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // 渲染列表
  const renderBookList = () => (
    <div className="space-y-2">
      {bookModeGroups.map((group) => renderListItem(group))}
    </div>
  )

  // 渲染详情页 - 文字总结模式
  const renderSummaryDetail = () => {
    if (!selectedGroup) return null

    // 分类条目
    const chapters: CacheEntry[] = []
    let connections: CacheEntry | undefined
    let overallSummary: CacheEntry | undefined
    let characterRelationship: CacheEntry | undefined

    for (const entry of selectedGroup.entries) {
      switch (entry.type) {
        case 'summary':
          chapters.push(entry)
          break
        case 'connections':
          connections = entry
          break
        case 'overall_summary':
          overallSummary = entry
          break
        case 'character_relationship':
          characterRelationship = entry
          break
      }
    }

    return (
      <div className="space-y-3">
        {/* 章节总结 */}
        {chapters.map((entry, index) => {
          const value = cachedValues.get(entry.key)
          const isLoading = loadingKeys.has(entry.key)
          return (
            <MarkdownCard
              key={entry.key}
              id={entry.key}
              title={entry.chapterId || getCacheTypeLabel(entry.type, t)}
              content=""
              markdownContent={typeof value === 'string' ? value : ''}
              index={index}
              defaultCollapsed={true}
              isLoading={isLoading}
              showViewContent={false}
              showReadButton={false}
              onClearCache={() => confirmDelete({ key: entry.key })}
            />
          )
        })}

        {/* 章节关联 */}
        {connections && (
          <MarkdownCard
            id={connections.key}
            title={t('results.tabs.connections')}
            content=""
            markdownContent={
              typeof cachedValues.get(connections.key) === 'string'
                ? (cachedValues.get(connections.key) as string)
                : ''
            }
            index={chapters.length}
            defaultCollapsed={chapters.length > 0}
            isLoading={loadingKeys.has(connections.key)}
            showViewContent={false}
            showReadButton={false}
            onClearCache={() => confirmDelete({ key: connections!.key })}
          />
        )}

        {/* 人物关系 */}
        {characterRelationship && (
          <MarkdownCard
            id={characterRelationship.key}
            title={t('results.tabs.characterRelationship')}
            content=""
            markdownContent={
              typeof cachedValues.get(characterRelationship.key) === 'string'
                ? (cachedValues.get(characterRelationship.key) as string)
                : ''
            }
            index={chapters.length + (connections ? 1 : 0)}
            defaultCollapsed={chapters.length > 0 || !!connections}
            isLoading={loadingKeys.has(characterRelationship.key)}
            showViewContent={false}
            showReadButton={false}
            onClearCache={() =>
              confirmDelete({ key: characterRelationship!.key })
            }
          />
        )}

        {/* 全书总结 */}
        {overallSummary && (
          <MarkdownCard
            id={overallSummary.key}
            title={t('results.tabs.overallSummary')}
            content=""
            markdownContent={
              typeof cachedValues.get(overallSummary.key) === 'string'
                ? (cachedValues.get(overallSummary.key) as string)
                : ''
            }
            index={
              chapters.length +
              (connections ? 1 : 0) +
              (characterRelationship ? 1 : 0)
            }
            defaultCollapsed={
              chapters.length > 0 || !!connections || !!characterRelationship
            }
            isLoading={loadingKeys.has(overallSummary.key)}
            showViewContent={false}
            showReadButton={false}
            onClearCache={() => confirmDelete({ key: overallSummary!.key })}
          />
        )}
      </div>
    )
  }

  // 渲染详情页 - 思维导图模式
  const renderMindmapDetail = () => {
    if (!selectedGroup) return null

    const chapters: CacheEntry[] = []
    let combinedMindmap: CacheEntry | undefined
    let mergedMindmap: CacheEntry | undefined

    for (const entry of selectedGroup.entries) {
      switch (entry.type) {
        case 'mindmap':
          chapters.push(entry)
          break
        case 'combined_mindmap':
          combinedMindmap = entry
          break
        case 'merged_mindmap':
          mergedMindmap = entry
          break
      }
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 章节思维导图 */}
        {chapters.map((entry, index) => {
          const value = cachedValues.get(entry.key)
          const isLoading = loadingKeys.has(entry.key)
          const mindMapData =
            value && typeof value === 'object' && 'nodeData' in value
              ? (value as MindElixirData)
              : { nodeData: { topic: '', id: '', children: [] } }

          return (
            <MindMapCard
              key={entry.key}
              id={entry.key}
              title={entry.chapterId || getCacheTypeLabel(entry.type, t)}
              content=""
              mindMapData={mindMapData}
              index={index}
              isLoading={isLoading}
              showViewContent={false}
              showReadButton={false}
              showOpenInMindElixir={false}
              showDownloadButton={false}
              onClearCache={() => confirmDelete({ key: entry.key })}
            />
          )
        })}

        {/* 整书思维导图 */}
        {combinedMindmap &&
          (() => {
            const value = cachedValues.get(combinedMindmap.key)
            const mindMapData =
              value && typeof value === 'object' && 'nodeData' in value
                ? (value as MindElixirData)
                : { nodeData: { topic: '', id: '', children: [] } }

            return (
              <MindMapCard
                id={combinedMindmap.key}
                title={t('results.tabs.combinedMindMap')}
                content=""
                mindMapData={mindMapData}
                index={chapters.length}
                isLoading={loadingKeys.has(combinedMindmap.key)}
                showViewContent={false}
                showReadButton={false}
                showOpenInMindElixir={false}
                showDownloadButton={false}
                onClearCache={() =>
                  confirmDelete({ key: combinedMindmap!.key })
                }
                className="md:col-span-2"
                mindMapClassName="w-full h-[400px]"
              />
            )
          })()}

        {/* 合并思维导图 */}
        {mergedMindmap &&
          (() => {
            const value = cachedValues.get(mergedMindmap.key)
            const mindMapData =
              value && typeof value === 'object' && 'nodeData' in value
                ? (value as MindElixirData)
                : { nodeData: { topic: '', id: '', children: [] } }

            return (
              <MindMapCard
                id={mergedMindmap.key}
                title={t('cacheManagement.types.mergedMindmap')}
                content=""
                mindMapData={mindMapData}
                index={chapters.length + (combinedMindmap ? 1 : 0)}
                isLoading={loadingKeys.has(mergedMindmap.key)}
                showViewContent={false}
                showReadButton={false}
                showOpenInMindElixir={false}
                showDownloadButton={false}
                onClearCache={() => confirmDelete({ key: mergedMindmap!.key })}
                className="md:col-span-2"
                mindMapClassName="w-full h-[400px]"
              />
            )
          })()}
      </div>
    )
  }

  // 渲染详情页
  const renderDetail = () => {
    if (!selectedGroup) return null

    const isSummary = selectedGroup.mode === 'summary'
    const Icon = isSummary ? FileText : Network
    const modeLabel = isSummary
      ? t('cacheManagement.modeSummary')
      : t('cacheManagement.modeMindmap')

    return (
      <div className="h-full flex flex-col">
        {/* 头部 */}
        <div className="shrink-0 p-4 bg-muted/50 rounded-lg mb-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGroup(null)}
              className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm text-foreground/80 truncate">
                {selectedGroup.displayName}
              </span>
              <Badge variant={isSummary ? 'default' : 'secondary'}>
                {modeLabel}
              </Badge>
              <Badge variant="outline" className="shrink-0">
                {selectedGroup.entries.length} {t('cacheManagement.items')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(selectedGroup)}
                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                <Download className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">
                  {t('cacheManagement.downloadContent')}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmDelete({ group: selectedGroup })}
                className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">
                  {t('cacheManagement.deleteBook')}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full [&>div>div]:!block">
            <div className="pr-2">
              {isSummary ? renderSummaryDetail() : renderMindmapDetail()}
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden bg-muted/50">
      <div className="max-w-4xl mx-auto h-full flex flex-col p-8">
        {/* 标题 - 仅在列表视图显示 */}
        {!selectedGroup && (
          <div className="mb-8 flex-shrink-0">
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
              <BookMarked className="h-6 w-6 text-foreground/80" />
              {t('cacheManagement.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('cacheManagement.description')}
            </p>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
            </div>
          ) : selectedGroup ? (
            renderDetail()
          ) : bookModeGroups.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              {t('cacheManagement.noCache')}
            </div>
          ) : (
            <ScrollArea className="h-full [&>div>div]:!block">
              <div className="pr-3">{renderBookList()}</div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('cacheManagement.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.group
                ? t('cacheManagement.deleteBookConfirm', {
                    bookName: `${deleteTarget.group.displayName} (${deleteTarget.group.mode === 'summary' ? t('cacheManagement.modeSummary') : t('cacheManagement.modeMindmap')})`,
                  })
                : t('cacheManagement.deleteEntryConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
