import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MessageSquarePlus, Plus, Pencil, Trash2, Copy, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useCustomPromptStore, type CustomPrompt } from '../stores/customPromptStore'

export function CustomPromptsPage() {
  const { t } = useTranslation()
  const { prompts, addPrompt, updatePrompt, deletePrompt } = useCustomPromptStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    description: ''
  })

  const handleOpenDialog = (prompt?: CustomPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt)
      setFormData({
        name: prompt.name,
        content: prompt.content,
        description: prompt.description || ''
      })
    } else {
      setEditingPrompt(null)
      setFormData({
        name: '',
        content: '',
        description: ''
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
      prompt => prompt.name.trim() === formData.name.trim() && prompt.id !== editingPrompt?.id
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
    while (prompts.some(p => p.name === copyName)) {
      counter++
      copyName = `${prompt.name} (Copy ${counter})`
    }

    setEditingPrompt(null)
    setFormData({
      name: copyName,
      content: prompt.content,
      description: prompt.description || ''
    })
    setIsDialogOpen(true)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
              <MessageSquarePlus className="h-6 w-6 text-gray-700" />
              {t('customPrompts.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t('customPrompts.description')}</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('customPrompts.addPrompt')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPrompt ? t('customPrompts.editPrompt') : t('customPrompts.addPrompt')}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt-name">{t('customPrompts.promptName')}</Label>
                  <Input
                    id="prompt-name"
                    placeholder={t('customPrompts.promptNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-description">{t('customPrompts.promptDescription')}</Label>
                  <Input
                    id="prompt-description"
                    placeholder={t('customPrompts.promptDescriptionPlaceholder')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-content">{t('customPrompts.promptContent')}</Label>
                  <Textarea
                    id="prompt-content"
                    placeholder={t('customPrompts.promptContentPlaceholder')}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                    className="min-h-[200px] resize-y"
                  />
                  <p className="text-xs text-gray-600">
                    {t('customPrompts.promptContentDescription')}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave}>
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px] max-w-[250px]">{t('customPrompts.promptName')}</TableHead>
                  <TableHead className="min-w-[200px]">{t('customPrompts.promptDescription')}</TableHead>
                  <TableHead className="w-[160px]">{t('customPrompts.createdAt')}</TableHead>
                  <TableHead className="w-[140px] text-right">{t('customPrompts.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      {t('customPrompts.noPrompts')}
                    </TableCell>
                  </TableRow>
                ) : (
                  prompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell className="font-medium truncate max-w-[250px]" title={prompt.name}>
                        {prompt.name}
                      </TableCell>
                      <TableCell className="truncate max-w-[300px]" title={prompt.description}>
                        {prompt.description || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(prompt.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(prompt)}
                            title={t('customPrompts.copy')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(prompt)}
                            title={t('customPrompts.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(prompt.id)}
                            title={t('customPrompts.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}