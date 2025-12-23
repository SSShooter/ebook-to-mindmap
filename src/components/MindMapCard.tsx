import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ExternalLink, BookOpen, Loader2 } from 'lucide-react'
import { CopyButton } from '@/components/ui/copy-button'
import { ViewContentDialog } from './ViewContentDialog'
import { DownloadMindMapButton } from './DownloadMindMapButton'
import MindElixirReact from './project/MindElixirReact'
import type { MindElixirData, MindElixirInstance, Options } from 'mind-elixir'
import type { MindElixirReactRef } from './project/MindElixirReact'
import { useTranslation } from 'react-i18next'

interface MindMapCardProps {
  /** 章节ID */
  id: string
  /** 章节标题 */
  title: string
  /** 章节内容（原始内容） */
  content: string
  /** 思维导图数据 */
  mindMapData: MindElixirData
  /** 章节索引 */
  index: number

  /** 清除缓存的回调函数 */
  onClearCache?: (chapterId: string) => void
  /** 阅读章节的回调函数 */
  onReadChapter?: () => void
  /** 在MindElixir中打开的回调函数 */
  onOpenInMindElixir?: (mindmapData: MindElixirData, title: string) => void
  /** 下载思维导图的回调函数 */
  onDownloadMindMap?: (mindElixirInstance: MindElixirInstance, title: string, format: string) => void
  /** 是否显示清除缓存按钮 */
  showClearCache?: boolean
  /** 是否显示查看内容按钮 */
  showViewContent?: boolean
  /** 是否显示复制按钮 */
  showCopyButton?: boolean
  /** 是否显示在MindElixir中打开按钮 */
  showOpenInMindElixir?: boolean
  /** 是否显示下载按钮 */
  showDownloadButton?: boolean
  /** 是否显示阅读按钮 */
  showReadButton?: boolean
  /** 自定义类名 */
  className?: string
  /** 思维导图容器的自定义类名 */
  mindMapClassName?: string
  /** MindElixir选项 */
  mindElixirOptions?: Partial<Options>
  /** 是否为加载状态 */
  isLoading?: boolean
}

export const MindMapCard: React.FC<MindMapCardProps> = ({
  id,
  title,
  content,
  mindMapData,
  index,

  onClearCache,
  onReadChapter,
  onOpenInMindElixir,
  onDownloadMindMap,
  showClearCache = true,
  showViewContent = true,
  showCopyButton = true,
  showOpenInMindElixir = true,
  showDownloadButton = true,
  showReadButton = true,
  className = '',
  mindMapClassName = 'aspect-square w-full max-w-[500px] mx-auto',
  mindElixirOptions = { direction: 1, alignment: 'nodes', editable:false },
  isLoading = false,
}) => {
  const { t } = useTranslation()
  const localMindElixirRef = React.useRef<MindElixirReactRef | null>(null)

  return (
    <Card className={`gap-2 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg w-full overflow-hidden">
          <div className="truncate w-full">
            {title}
          </div>
          {isLoading ? (
              null
          ) : (
            <div className="flex items-center gap-2 mt-2">
              {showOpenInMindElixir && onOpenInMindElixir && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenInMindElixir(mindMapData, title)}
                  title={t('common.openInMindElixir')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                </Button>
              )}
              {showCopyButton && (
                <CopyButton
                  content={content}
                  successMessage={t('common.copiedToClipboard')}
                  title={t('common.copyChapterContent')}
                />
              )}
              {showClearCache && onClearCache && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onClearCache(id)}
                  title={t('common.clearCache')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {showReadButton && onReadChapter && (
                <Button variant="outline" size="sm" onClick={onReadChapter}>
                  <BookOpen className="h-3 w-3" />
                </Button>
              )}
              {showViewContent && (
                <ViewContentDialog
                  title={title}
                  content={content}
                  chapterIndex={index}
                />
              )}
              {showDownloadButton && onDownloadMindMap && (
                <DownloadMindMapButton
                  mindElixirRef={() => localMindElixirRef.current}
                  title={title}
                  downloadMindMap={onDownloadMindMap}
                />
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>{t('common.generatingMindMap')}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <MindElixirReact
              ref={localMindElixirRef}
              data={mindMapData}
              fitPage={false}
              options={mindElixirOptions}
              className={mindMapClassName}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
