import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Brain, Plus, Pencil, Trash2, Star, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useModelStore, type AIModel } from '../stores/modelStore'

export function ModelsPage() {
  const { t } = useTranslation()
  const { models, addModel, updateModel, deleteModel, setDefaultModel } = useModelStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    provider: 'gemini' as AIModel['provider'],
    apiKey: '',
    apiUrl: 'https://api.openai.com/v1',
    model: 'gemini-1.5-flash',
    temperature: 0.7
  })

  const providerSettings = {
    gemini: {
      apiKeyLabel: 'Gemini API Key',
      apiKeyPlaceholder: t('config.enterGeminiApiKey'),
      modelPlaceholder: t('config.geminiModelPlaceholder'),
      apiUrlPlaceholder: '',
      url: 'https://aistudio.google.com/',
    },
    openai: {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: t('config.enterApiToken'),
      apiUrlPlaceholder: 'https://api.openai.com/v1',
      modelPlaceholder: t('config.modelPlaceholder'),
      url: 'https://platform.openai.com/',
    },
    ollama: {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: 'API Token',
      apiUrlPlaceholder: 'http://localhost:11434',
      modelPlaceholder: 'llama2, mistral, codellama...',
      url: 'https://ollama.com/',
    },
    '302.ai': {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: t('config.enterApiToken'),
      apiUrlPlaceholder: 'https://api.302.ai/v1',
      modelPlaceholder: t('config.modelPlaceholder'),
      url: 'https://share.302.ai/BJ7iSL',
    },
  }

  const handleOpenDialog = (model?: AIModel) => {
    if (model) {
      setEditingModel(model)
      setFormData({
        name: model.name,
        provider: model.provider,
        apiKey: model.apiKey,
        apiUrl: model.apiUrl,
        model: model.model,
        temperature: model.temperature
      })
    } else {
      setEditingModel(null)
      setFormData({
        name: '',
        provider: 'gemini',
        apiKey: '',
        apiUrl: 'https://api.openai.com/v1',
        model: 'gemini-1.5-flash',
        temperature: 0.7
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error(t('models.nameRequired'))
      return
    }
    
    if (!formData.apiKey.trim()) {
      toast.error(t('models.apiKeyRequired'))
      return
    }

    if (editingModel) {
      updateModel(editingModel.id, formData)
      toast.success(t('models.updateSuccess'))
    } else {
      addModel({ ...formData, isDefault: models.length === 0 })
      toast.success(t('models.addSuccess'))
    }
    
    setIsDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    if (models.length === 1) {
      toast.error(t('models.cannotDeleteLast'))
      return
    }
    deleteModel(id)
    toast.success(t('models.deleteSuccess'))
  }

  const handleSetDefault = (id: string) => {
    setDefaultModel(id)
    toast.success(t('models.defaultSet'))
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-8 w-8" />
              {t('models.title')}
            </h1>
            <p className="text-gray-600 mt-2">{t('models.description')}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('models.addModel')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? t('models.editModel') : t('models.addModel')}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">{t('config.aiProvider')}</Label>
                  <div className="flex flex-col items-start gap-2">
                    <Select
                      value={formData.provider}
                      onValueChange={(value: AIModel['provider']) => {
                        setFormData({
                          ...formData,
                          provider: value,
                          apiUrl: value === '302.ai' ? 'https://api.302.ai/v1' : formData.apiUrl
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">{t('config.openaiCompatible')}</SelectItem>
                        <SelectItem value="ollama">Ollama</SelectItem>
                        <SelectItem value="302.ai">302.AI</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="link" className="p-0 h-auto text-xs" asChild>
                      <a href={providerSettings[formData.provider].url} target="_blank" rel="noopener noreferrer">
                        {t('config.visitSite')}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-name">{t('models.modelName')}</Label>
                  <Input
                    id="model-name"
                    placeholder={t('models.modelNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">{providerSettings[formData.provider].apiKeyLabel}</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder={providerSettings[formData.provider].apiKeyPlaceholder}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  />
                </div>

                {(formData.provider === 'openai' || formData.provider === 'ollama' || formData.provider === '302.ai') && (
                  <div className="space-y-2">
                    <Label htmlFor="api-url">{t('config.apiUrl')}</Label>
                    <Input
                      id="api-url"
                      type="url"
                      placeholder={providerSettings[formData.provider].apiUrlPlaceholder}
                      value={formData.apiUrl}
                      onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                      disabled={formData.provider === '302.ai'}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="model-id">{t('config.modelName')}</Label>
                  <Input
                    id="model-id"
                    placeholder={providerSettings[formData.provider].modelPlaceholder}
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">{t('config.temperature')}</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0.7 })}
                  />
                  <p className="text-xs text-gray-600">{t('config.temperatureDescription')}</p>
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
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>{t('models.modelName')}</TableHead>
                  <TableHead>{t('config.aiProvider')}</TableHead>
                  <TableHead>{t('models.modelId')}</TableHead>
                  <TableHead>{t('config.temperature')}</TableHead>
                  <TableHead className="text-right">{t('models.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      {t('models.noModels')}
                    </TableCell>
                  </TableRow>
                ) : (
                  models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(model.id)}
                          className="p-1"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              model.isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                            }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>
                        {model.provider === 'gemini' && 'Google Gemini'}
                        {model.provider === 'openai' && t('config.openaiCompatible')}
                        {model.provider === 'ollama' && 'Ollama'}
                        {model.provider === '302.ai' && '302.AI'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{model.model}</TableCell>
                      <TableCell>{model.temperature}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(model)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(model.id)}
                            disabled={models.length === 1}
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
        </ScrollArea>
      </div>
    </div>
  )
}
