import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, BookOpen, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from "remark-cjk-friendly";
import { CopyButton } from '@/components/ui/copy-button'
import { ViewContentDialog } from './ViewContentDialog'
import { useTranslation } from 'react-i18next'

interface MarkdownCardProps {
  /** 章节ID */
  id: string
  /** 章节标题 */
  title: string
  /** 章节内容（原始内容） */
  content: string
  /** Markdown格式的总结内容 */
  markdownContent: string
  /** 章节索引 */
  index: number
  /** 清除缓存的回调函数 */
  onClearCache?: (chapterId: string) => void
  /** 阅读章节的回调函数 */
  onReadChapter?: () => void
  /** 是否显示清除缓存按钮 */
  showClearCache?: boolean
  /** 是否显示查看内容按钮 */
  showViewContent?: boolean
  /** 是否显示复制按钮 */
  showCopyButton?: boolean
  /** 是否显示阅读按钮 */
  showReadButton?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否默认折叠 */
  defaultCollapsed?: boolean
  /** 是否为加载状态 */
  isLoading?: boolean
}

export const MarkdownCard: React.FC<MarkdownCardProps> = ({
  id,
  title,
  content,
  markdownContent,
  index,
  onClearCache,
  onReadChapter,
  showClearCache = true,
  showViewContent = true,
  showCopyButton = true,
  showReadButton = true,
  className = '',
  defaultCollapsed = false,
  isLoading = false,
}) => {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <Card className={`gap-0 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between gap-2">
          <Badge variant="outline"># {index + 1}</Badge>
          <div className="truncate flex-1 w-1" title={title}>
            {title}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('common.processing')}</span>
            </div>
          ) : (
            <>
              {showCopyButton && (
                <CopyButton
                  content={markdownContent}
                  successMessage={t('common.copiedToClipboard')}
                  title={t('common.copyChapterSummary')}
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
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>{t('common.generatingContent')}</p>
            </div>
          ) : (
            <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm,remarkCjkFriendly]}>
                {markdownContent || ''}
              </ReactMarkdown>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
