import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  MessageSquarePlus,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useCustomPromptStore,
  type CustomPrompt,
} from '../stores/customPromptStore'

export function CustomPromptsPage() {
  const { t } = useTranslation()
  const { prompts, addPrompt, updatePrompt, deletePrompt } =
    useCustomPromptStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    description: '',
  })

  const handleOpenDialog = (prompt?: CustomPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt)
      setFormData({
        name: prompt.name,
        content: prompt.content,
        description: prompt.description || '',
      })
    } else {
      setEditingPrompt(null)
      setFormData({
        name: '',
        content: '',
        description: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error(t('customPrompts.nameRequired'))
      return
    }

    if (!formData.content.trim()) {
      toast.error(t('customPrompts.contentRequired'))
      return
    }

    // Check for duplicate names (excluding the current editing prompt)
    const isDuplicate = prompts.some(
      (prompt) =>
        prompt.name.trim() === formData.name.trim() &&
        prompt.id !== editingPrompt?.id
    )

    if (isDuplicate) {
      toast.error(t('customPrompts.duplicateName'))
      return
    }

    if (editingPrompt) {
      updatePrompt(editingPrompt.id, formData)
      toast.success(t('customPrompts.updateSuccess'))
    } else {
      addPrompt(formData)
      toast.success(t('customPrompts.addSuccess'))
    }

    setIsDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    if (prompts.length === 0) return
    deletePrompt(id)
    toast.success(t('customPrompts.deleteSuccess'))
  }

  const handleCopy = (prompt: CustomPrompt) => {
    // Generate a unique name by appending a number
    let copyName = `${prompt.name} (Copy)`
    let counter = 1
    while (prompts.some((p) => p.name === copyName)) {
      counter++
      copyName = `${prompt.name} (Copy ${counter})`
    }

    setEditingPrompt(null)
    setFormData({
      name: copyName,
      content: prompt.content,
      description: prompt.description || '',
    })
    setIsDialogOpen(true)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex-1 overflow-auto bg-muted/50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
              <MessageSquarePlus className="h-6 w-6 text-foreground/80" />
              {t('customPrompts.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('customPrompts.description')}
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('customPrompts.addPrompt')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingPrompt
                    ? t('customPrompts.editPrompt')
                    : t('customPrompts.addPrompt')}
                </DialogTitle>
              </DialogHeader>

              <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt-name">
                      {t('customPrompts.promptName')}
                    </Label>
                    <Input
                      id="prompt-name"
                      placeholder={t('customPrompts.promptNamePlaceholder')}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt-description">
                      {t('customPrompts.promptDescription')}
                    </Label>
                    <Input
                      id="prompt-description"
                      placeholder={t(
                        'customPrompts.promptDescriptionPlaceholder'
                      )}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt-content">
                      {t('customPrompts.promptContent')}
                    </Label>
                    <Textarea
                      id="prompt-content"
                      placeholder={t('customPrompts.promptContentPlaceholder')}
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      rows={8}
                      className="min-h-[200px] resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('customPrompts.promptContentDescription')}
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave}>{t('common.save')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {prompts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {t('customPrompts.noPrompts')}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-4 hover:bg-muted/50 transition-colors">
                    {/* 标题和操作按钮 */}
                    <div className="flex items-start justify-between mb-3">
                      <h3
                        className="font-medium text-foreground flex-1 pr-2 truncate"
                        title={prompt.name}>
                        {prompt.name}
                      </h3>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(prompt)}
                          className="h-8 w-8 p-0"
                          title={t('customPrompts.copy')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(prompt)}
                          className="h-8 w-8 p-0"
                          title={t('customPrompts.edit')}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(prompt.id)}
                          className="h-8 w-8 p-0"
                          title={t('customPrompts.delete')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 描述 */}
                    {prompt.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {prompt.description}
                      </p>
                    )}

                    {/* 创建时间 */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(prompt.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
