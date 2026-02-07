import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ViewContentDialogProps {
  title: string
  content: string
  chapterIndex: number
}

export function ViewContentDialog({
  title,
  content,
  chapterIndex,
}: ViewContentDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 " />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {title} - {t('viewContent.originalText')}
          </DialogTitle>
          <DialogDescription>
            {t('viewContent.chapterContent', { chapter: chapterIndex + 1 })}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
