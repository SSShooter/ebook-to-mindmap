import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ReasoningDisplayProps {
  reasoning?: string
  className?: string
  scrollable?: boolean
}

export function ReasoningDisplay({
  reasoning,
  className,
  scrollable = false,
}: ReasoningDisplayProps) {
  const { t } = useTranslation()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollable && reasoning && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [reasoning, scrollable])

  if (!reasoning) return null

  const content = (
    <>
      <div className="font-medium mb-2 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground/60">
          {t('common.reasoning')}
        </span>
      </div>
      <div className="whitespace-pre-wrap font-mono text-xs">{reasoning}</div>
      {scrollable && <div ref={bottomRef} />}
    </>
  )

  if (scrollable) {
    return (
      <ScrollArea
        className={cn('bg-muted rounded-lg border border-border', className)}>
        <div className="p-4 text-sm text-muted-foreground">{content}</div>
      </ScrollArea>
    )
  }

  return (
    <div
      className={cn(
        'p-4 bg-muted rounded-lg border border-border text-sm text-muted-foreground',
        className
      )}>
      {content}
    </div>
  )
}
