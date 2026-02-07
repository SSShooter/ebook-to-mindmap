import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onConfirm: (tag: string) => void
}

export function TagDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: TagDialogProps) {
  const { t } = useTranslation()
  const [tagInput, setTagInput] = useState('')

  const handleConfirm = () => {
    if (!tagInput.trim()) {
      return
    }
    onConfirm(tagInput.trim())
    setTagInput('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tagDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('tagDialog.description', { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tag-input">{t('tagDialog.label')}</Label>
            <Input
              id="tag-input"
              placeholder={t('tagDialog.placeholder')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm()
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('tagDialog.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!tagInput.trim()}>
            {t('tagDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
