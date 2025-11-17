import { useState } from 'react'
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

export function TagDialog({ open, onOpenChange, selectedCount, onConfirm }: TagDialogProps) {
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
          <DialogTitle>为框选的章节添加标签</DialogTitle>
          <DialogDescription>
            已框选 {selectedCount} 个章节。输入一个标签（会覆盖原有标签）。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tag-input">标签</Label>
            <Input
              id="tag-input"
              placeholder="例如: 重点章节"
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
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!tagInput.trim()}>
            确认添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
