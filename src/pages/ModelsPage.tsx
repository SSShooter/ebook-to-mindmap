import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Brain, Plus, Pencil, Trash2, Star, ExternalLink, Copy } from 'lucide-react'
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
    apiUrl: '',
    model: '',
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
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
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

    // Check for duplicate names (excluding the current editing model)
    const isDuplicate = models.some(
      model => model.name.trim() === formData.name.trim() && model.id !== editingModel?.id
    )

    if (isDuplicate) {
      toast.error(t('models.duplicateName'))
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

  const handleCopy = (model: AIModel) => {
    // Generate a unique name by appending a number
    let copyName = `${model.name} (Copy)`
    let counter = 1
    while (models.some(m => m.name === copyName)) {
      counter++
      copyName = `${model.name} (Copy ${counter})`
    }

    setEditingModel(null)
    setFormData({
      name: copyName,
      provider: model.provider,
      apiKey: model.apiKey,
      apiUrl: model.apiUrl,
      model: model.model,
      temperature: model.temperature
    })
    setIsDialogOpen(true)
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
              <Brain className="h-6 w-6 text-gray-700" />
              {t('models.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t('models.description')}</p>
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
                        const defaultApiUrls: Record<AIModel['provider'], string> = {
                          'gemini': 'https://generativelanguage.googleapis.com/v1beta/openai',
                          'openai': 'https://api.openai.com/v1',
                          'ollama': 'http://localhost:11434/v1',
                          '302.ai': 'https://api.302.ai/v1'
                        }
                        setFormData({
                          ...formData,
                          provider: value,
                          apiUrl: defaultApiUrls[value]
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
                  <Label htmlFor="model-name">{t('models.configName')}</Label>
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
                  <Label htmlFor="model-id">{t('models.modelId')}</Label>
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {models.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                {t('models.noModels')}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {models.map((model) => (
                  <div key={model.id} className="p-4 hover:bg-gray-50 transition-colors">
                    {/* 标题行 - 模型名称和默认星标 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(model.id)}
                          className="p-1 h-6 w-6 flex-shrink-0"
                        >
                          <Star
                            className={`h-4 w-4 ${model.isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                              }`}
                          />
                        </Button>
                        <h3 className="font-medium text-gray-900 truncate" title={model.name}>
                          {model.name}
                        </h3>

                        {/* 提供商信息 */}
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hidden md:block">
                          {model.provider === 'gemini' && 'Google Gemini'}
                          {model.provider === 'openai' && t('config.openaiCompatible')}
                          {model.provider === 'ollama' && 'Ollama'}
                          {model.provider === '302.ai' && '302.AI'}
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(model)}
                          className="h-8 w-8 p-0"
                          title={t('models.copy')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(model)}
                          className="h-8 w-8 p-0"
                          title={t('models.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(model.id)}
                          disabled={models.length === 1}
                          className="h-8 w-8 p-0"
                          title={t('models.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>


                    {/* 模型ID */}
                    <div className="text-sm text-gray-600">
                      <span className="text-gray-500">{t('models.modelId')}: </span>
                      <span className="font-mono text-xs bg-gray-100 px-1 rounded truncate" title={model.model}>
                        {model.model}
                      </span>
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
