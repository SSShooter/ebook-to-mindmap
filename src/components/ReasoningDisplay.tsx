import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface ReasoningDisplayProps {
  reasoning?: string
  className?: string
}

export function ReasoningDisplay({
  reasoning,
  className,
}: ReasoningDisplayProps) {
  const { t } = useTranslation()

  if (!reasoning) return null

  return (
    <div
      className={cn(
        'mb-4 p-4 bg-muted rounded-lg border border-border text-sm text-muted-foreground',
        className
      )}>
      <div className="font-medium mb-2 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground/60">
          {t('common.reasoning')}
        </span>
      </div>
      <div className="whitespace-pre-wrap font-mono text-xs">{reasoning}</div>
    </div>
  )
}
