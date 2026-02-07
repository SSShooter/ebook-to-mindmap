import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  Star,
  ExternalLink,
  Copy,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useModelStore, type AIModel } from '../stores/modelStore'
import { PROVIDER_CONFIGS } from '../types/ai'

export function ModelsPage() {
  const { t } = useTranslation()
  const { models, addModel, updateModel, deleteModel, setDefaultModel } =
    useModelStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    provider: 'gemini' as AIModel['provider'],
    apiKey: '',
    apiUrl: '',
    model: '',
    temperature: 0.7,
  })

  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Fetch available models from OpenAI Compatible API
  const fetchAvailableModels = async (params?: {
    apiUrl?: string
    apiKey?: string
    provider?: string
  }) => {
    const apiUrl = params?.apiUrl ?? formData.apiUrl
    const apiKey = params?.apiKey ?? formData.apiKey
    const provider = params?.provider ?? formData.provider

    if (!apiUrl || !apiKey) {
      setAvailableModels([])
      return
    }

    // Only fetch for openai compatible providers
    if (
      !['openai', 'ollama', '302.ai', 'gemini', 'openrouter'].includes(provider)
    ) {
      setAvailableModels([])
      return
    }

    setIsLoadingModels(true)
    try {
      const response = await fetch(`${apiUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const models = data.data?.map((model: { id: string }) => model.id) || []
      setAvailableModels(models)
    } catch (error) {
      console.error('Failed to fetch models:', error)
      setAvailableModels([])
      toast.error(t('models.fetchModelsFailed', 'Failed to fetch models'))
    } finally {
      setIsLoadingModels(false)
    }
  }

  const providerSettings: Record<
    AIModel['provider'],
    {
      apiKeyLabel: string
      apiKeyPlaceholder: string
      apiUrlPlaceholder: string
      modelPlaceholder: string
      url: string
    }
  > = {
    gemini: {
      apiKeyLabel: 'Gemini API Key',
      apiKeyPlaceholder: t('config.enterGeminiApiKey'),
      modelPlaceholder: t('config.modelPlaceholder'),
      apiUrlPlaceholder: PROVIDER_CONFIGS.gemini.defaultApiUrl,
      url: PROVIDER_CONFIGS.gemini.websiteUrl,
    },
    openai: {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: t('config.enterApiToken'),
      apiUrlPlaceholder: PROVIDER_CONFIGS.openai.defaultApiUrl,
      modelPlaceholder: t('config.modelPlaceholder'),
      url: PROVIDER_CONFIGS.openai.websiteUrl,
    },
    ollama: {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: 'API Token',
      apiUrlPlaceholder: PROVIDER_CONFIGS.ollama.defaultApiUrl,
      modelPlaceholder: t('config.modelPlaceholder'),
      url: PROVIDER_CONFIGS.ollama.websiteUrl,
    },
    '302.ai': {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: t('config.enterApiToken'),
      apiUrlPlaceholder: PROVIDER_CONFIGS['302.ai'].defaultApiUrl,
      modelPlaceholder: t('config.modelPlaceholder'),
      url: PROVIDER_CONFIGS['302.ai'].websiteUrl,
    },
    openrouter: {
      apiKeyLabel: 'OpenRouter API Key',
      apiKeyPlaceholder: t('config.enterOpenRouterApiKey'),
      apiUrlPlaceholder: PROVIDER_CONFIGS.openrouter.defaultApiUrl,
      modelPlaceholder: t('config.modelPlaceholder'),
      url: PROVIDER_CONFIGS.openrouter.websiteUrl,
    },
  }

  const handleOpenDialog = (model?: AIModel) => {
    if (model) {
      setEditingModel(model)
      const newFormData = {
        name: model.name,
        provider: model.provider,
        apiKey: model.apiKey,
        apiUrl: model.apiUrl,
        model: model.model,
        temperature: model.temperature,
      }
      setFormData(newFormData)
      fetchAvailableModels(newFormData)
    } else {
      setEditingModel(null)
      const newFormData: typeof formData = {
        name: '',
        provider: 'gemini',
        apiKey: '',
        apiUrl: PROVIDER_CONFIGS.gemini.defaultApiUrl,
        model: PROVIDER_CONFIGS.gemini.defaultModel,
        temperature: 0.7,
      }
      setFormData(newFormData)
      fetchAvailableModels(newFormData)
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
      (model) =>
        model.name.trim() === formData.name.trim() &&
        model.id !== editingModel?.id
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
    while (models.some((m) => m.name === copyName)) {
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
      temperature: model.temperature,
    })
    setIsDialogOpen(true)
  }

  return (
    <div className="flex-1 overflow-auto bg-muted/50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
              <Brain className="h-6 w-6 text-foreground/80" />
              {t('models.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('models.description')}
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="flex items-center gap-2">
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
                        const newFormData = {
                          ...formData,
                          provider: value,
                          apiUrl: PROVIDER_CONFIGS[value].defaultApiUrl,
                        }
                        setFormData(newFormData)
                        fetchAvailableModels(newFormData)
                      }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">
                          {t('config.openaiCompatible')}
                        </SelectItem>
                        <SelectItem value="ollama">Ollama</SelectItem>
                        <SelectItem value="302.ai">302.AI</SelectItem>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-xs"
                      asChild>
                      <a
                        href={providerSettings[formData.provider].url}
                        target="_blank"
                        rel="noopener noreferrer">
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
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">
                    {providerSettings[formData.provider].apiKeyLabel}
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder={
                      providerSettings[formData.provider].apiKeyPlaceholder
                    }
                    value={formData.apiKey}
                    onChange={(e) => {
                      const newFormData = {
                        ...formData,
                        apiKey: e.target.value,
                      }
                      setFormData(newFormData)
                      fetchAvailableModels(newFormData)
                    }}
                  />
                </div>

                {(formData.provider === 'openai' ||
                  formData.provider === 'ollama' ||
                  formData.provider === '302.ai' ||
                  formData.provider === 'gemini' ||
                  formData.provider === 'openrouter') && (
                  <div className="space-y-2">
                    <Label htmlFor="api-url">{t('config.apiUrl')}</Label>
                    <Input
                      id="api-url"
                      type="url"
                      placeholder={
                        providerSettings[formData.provider].apiUrlPlaceholder ||
                        'https://api.example.com/v1'
                      }
                      value={formData.apiUrl}
                      onChange={(e) => {
                        const newFormData = {
                          ...formData,
                          apiUrl: e.target.value,
                        }
                        setFormData(newFormData)
                        fetchAvailableModels(newFormData)
                      }}
                      disabled={
                        formData.provider === 'gemini' ||
                        formData.provider === '302.ai' ||
                        formData.provider === 'openrouter'
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="model-id">{t('models.modelId')}</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Combobox
                        options={availableModels}
                        value={formData.model}
                        onValueChange={(value) =>
                          setFormData({ ...formData, model: value })
                        }
                        placeholder={
                          providerSettings[formData.provider].modelPlaceholder
                        }
                        searchPlaceholder={t(
                          'models.searchModels',
                          'Search models...'
                        )}
                        emptyText={
                          availableModels.length === 0
                            ? 'Type model name and press Enter'
                            : 'No matching models found.'
                        }
                        allowCustomInput={true}
                      />
                    </div>
                    {formData.apiUrl && formData.apiKey && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAvailableModels()}
                        disabled={isLoadingModels}
                        title={t('models.refreshModels', 'Refresh models')}
                        className="px-3">
                        <RefreshCw
                          className={`h-4 w-4 ${isLoadingModels ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    )}
                  </div>
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        temperature: parseFloat(e.target.value) || 0.7,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('config.temperatureDescription')}
                  </p>
                </div>
              </div>

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
            {models.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {t('models.noModels')}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="p-4 hover:bg-muted/50 transition-colors">
                    {/* 标题行 - 模型名称和默认星标 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(model.id)}
                          className="p-1 h-6 w-6 flex-shrink-0">
                          <Star
                            className={`h-4 w-4 ${
                              model.isDefault
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/70'
                            }`}
                          />
                        </Button>
                        <h3
                          className="font-medium text-foreground truncate"
                          title={model.name}>
                          {model.name}
                        </h3>

                        {/* 提供商信息 */}
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hidden md:block">
                          {model.provider === 'gemini' && 'Google Gemini'}
                          {model.provider === 'openai' &&
                            t('config.openaiCompatible')}
                          {model.provider === 'ollama' && 'Ollama'}
                          {model.provider === '302.ai' && '302.AI'}
                          {model.provider === 'openrouter' && 'OpenRouter'}
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(model)}
                          className="h-8 w-8 p-0"
                          title={t('models.copy')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(model)}
                          className="h-8 w-8 p-0"
                          title={t('models.edit')}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(model.id)}
                          disabled={models.length === 1}
                          className="h-8 w-8 p-0"
                          title={t('models.delete')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 模型ID */}
                    <div className="text-sm text-muted-foreground">
                      <span className="text-muted-foreground">
                        {t('models.modelId')}:{' '}
                      </span>
                      <span
                        className="font-mono text-xs bg-muted px-1 rounded truncate"
                        title={model.model}>
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
