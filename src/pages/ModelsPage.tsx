import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { appFetch } from '@/lib/fetch'
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  Star,
  Check,
  ExternalLink,
  Copy,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useModelStore, type AIModel } from '../stores/modelStore'
import { useAuthStore } from '../stores/authStore'
import {
  getProviderConfig,
  getProviderOptions,
  isApiUrlEditable,
} from '../types/ai'
import type { AIProvider } from '../types/ai'
import { MODELS_DEV_PROVIDER_MAP } from '../config/ai-providers'
import { MindElixirStarModal } from '@/components/MindElixirStarModal'
import { ProviderSelector } from '@/components/ProviderSelector'
import { TokenDanceWallet } from '@/components/TokenDanceWallet'
import { TokenDanceConnectButton } from '@/components/TokenDanceConnectButton'
import { useTokenDanceOAuthStore } from '@/stores/tokenDanceOAuthStore'

export function ModelsPage() {
  const { t } = useTranslation()
  const { models, addModel, updateModel, deleteModel, setDefaultModel } =
    useModelStore()
  const { user } = useAuthStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isStarModalOpen, setIsStarModalOpen] = useState(false)

  const pendingOAuthResult = useTokenDanceOAuthStore((s) => s.pendingResult)
  const consumeOAuthResult = useTokenDanceOAuthStore((s) => s.consumeResult)

  // TokenDance OAuth 授权回跳后：把换到的新 Key 写入目标模型
  //  - 编辑既有模型 → updateModel(id, { apiKey })
  //  - 新建模型草稿 → 用带 Key 的草稿重开「新增模型」弹窗
  useEffect(() => {
    if (!pendingOAuthResult) return
    const result = consumeOAuthResult()
    if (!result) return
    const { key, target } = result

    if (target.editingModelId) {
      const existing = models.find((m) => m.id === target.editingModelId)
      if (existing) {
        updateModel(existing.id, { apiKey: key })
        toast.success(t('models.oauthKeyWritten', { name: existing.name }))
        return
      }
    }

    // 新建模型草稿：填充 Key 后重开弹窗，让用户核对名称/模型后保存
    const draft = target.draft
    const restored: typeof formData = {
      name: draft?.name ?? '',
      provider: (draft?.provider as AIProvider) ?? 'tokendance',
      apiKey: key,
      apiUrl: draft?.apiUrl || getProviderConfig('tokendance').defaultApiUrl,
      model: draft?.model || '',
    }
    setEditingModel(null)
    setFormData(restored)
    fetchAvailableModels(restored)
    setIsDialogOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOAuthResult])

  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai' as AIProvider,
    apiKey: '',
    apiUrl: '',
    model: '',
  })

  const providerOptions = getProviderOptions(t)

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

    // TokenDance 的模型目录是公开的，未填 API Key 也能拉取，方便先选模型再填密钥
    const isPublicCatalog = provider === 'tokendance'

    if (!apiUrl || (!apiKey && !isPublicCatalog)) {
      setAvailableModels([])
      return
    }

    setIsLoadingModels(true)
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      }

      const response = await appFetch(`${apiUrl}/models`, { headers })

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

  interface ProviderFormSettings {
    apiKeyLabel: string
    apiKeyPlaceholder: string
    apiUrlPlaceholder: string
    modelPlaceholder: string
    url: string
  }

  /** 内置供应商的专属文案；其余（models.dev / 自定义）走通用兜底 */
  const builtInSettings: Partial<Record<AIProvider, ProviderFormSettings>> = {
    openai: {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: t('config.enterApiToken'),
      apiUrlPlaceholder: getProviderConfig('openai').defaultApiUrl,
      modelPlaceholder: t('config.modelPlaceholder'),
      url: getProviderConfig('openai').websiteUrl,
    },
    'openai-responses': {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: t('config.enterApiToken'),
      apiUrlPlaceholder: getProviderConfig('openai-responses').defaultApiUrl,
      modelPlaceholder: t('config.modelPlaceholder'),
      url: getProviderConfig('openai-responses').websiteUrl,
    },
    tokendance: {
      apiKeyLabel: 'TokenDance API Key',
      apiKeyPlaceholder: t('config.enterTokenDanceApiKey'),
      apiUrlPlaceholder: getProviderConfig('tokendance').defaultApiUrl,
      modelPlaceholder: t('config.modelPlaceholder'),
      url: getProviderConfig('tokendance').websiteUrl,
    },
  }

  const getProviderSettings = (provider: AIProvider): ProviderFormSettings => {
    const builtIn = builtInSettings[provider]
    if (builtIn) return builtIn

    const config = getProviderConfig(provider)
    const meta = MODELS_DEV_PROVIDER_MAP[provider]
    return {
      apiKeyLabel: meta ? `${meta.name} API Key` : 'API Token',
      apiKeyPlaceholder: meta?.env?.[0] || t('config.enterApiToken'),
      apiUrlPlaceholder: config.defaultApiUrl || 'https://api.example.com/v1',
      modelPlaceholder: t('config.modelPlaceholder'),
      url: config.websiteUrl,
    }
  }

  const providerSettings = getProviderSettings(formData.provider)

  const handleOpenDialog = (model?: AIModel, readOnly = false) => {
    // Open custom modal for MindElixirStar
    if (model?.id === 'mind-elixir-star') {
      setIsStarModalOpen(true)
      return
    }

    setIsReadOnly(readOnly)
    if (model) {
      setEditingModel(model)
      const newFormData = {
        name: model.name,
        provider: model.provider,
        apiKey: model.apiKey,
        apiUrl: model.apiUrl,
        model: model.model,
      }
      setFormData(newFormData)
      fetchAvailableModels(newFormData)
    } else {
      setEditingModel(null)
      const newFormData: typeof formData = {
        name: '',
        provider: 'openai',
        apiKey: '',
        apiUrl: getProviderConfig('openai').defaultApiUrl,
        model: '',
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
    const model = models.find((m) => m.id === id)
    if (model?.isFixed) {
      toast.error(t('models.cannotDeleteFixed', 'Cannot delete fixed model'))
      return
    }
    deleteModel(id)
    toast.success(t('models.deleteSuccess'))
  }

  const handleSetDefault = (id: string) => {
    const model = models.find((m) => m.id === id)
    if (model?.isDefault) return
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
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>
                  {isReadOnly
                    ? t('models.viewModel', 'View Model')
                    : editingModel
                      ? t('models.editModel')
                      : t('models.addModel')}
                </DialogTitle>
              </DialogHeader>

              {isReadOnly && !user && editingModel?.costDescription && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg text-amber-700 dark:text-amber-400 text-sm font-medium">
                  <Star className="h-4 w-4 fill-current" />
                  {t(editingModel.costDescription)}
                </div>
              )}

              {/* 中间内容区独立滚动，标题与底部按钮始终可见；隐藏滚动条 */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">{t('config.aiProvider')}</Label>
                  <div className="flex flex-col items-start gap-2">
                    <ProviderSelector
                      value={formData.provider}
                      options={providerOptions}
                      onChange={(value: string) => {
                        const newFormData = {
                          ...formData,
                          provider: value as AIProvider,
                          apiUrl: getProviderConfig(value).defaultApiUrl,
                          model: '',
                        }
                        setFormData(newFormData)
                        fetchAvailableModels(newFormData)
                      }}
                      searchPlaceholder={t(
                        'models.searchProvider',
                        'Search provider...'
                      )}
                      emptyText={t(
                        'models.noProviderFound',
                        'No matching provider found.'
                      )}
                      disabled={isReadOnly}
                    />
                    {providerSettings.url && (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-xs"
                        asChild>
                        <a
                          href={providerSettings.url}
                          target="_blank"
                          rel="noopener noreferrer">
                          {t('config.visitSite')}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
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
                    readOnly={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">
                    {providerSettings.apiKeyLabel}
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder={
                      providerSettings.apiKeyPlaceholder
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
                    readOnly={isReadOnly}
                  />
                  {formData.provider === 'tokendance' && !isReadOnly && (
                    <div className="pt-0.5">
                      <TokenDanceConnectButton
                        target={
                          editingModel
                            ? { editingModelId: editingModel.id }
                            : {
                                draft: {
                                  name: formData.name,
                                  provider: formData.provider,
                                  apiKey: formData.apiKey,
                                  apiUrl: formData.apiUrl,
                                  model: formData.model,
                                },
                              }
                        }
                        hasKey={!!formData.apiKey.trim()}
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {t('tokendance.oauth.connectDesc')}
                      </p>
                    </div>
                  )}
                </div>

                {formData.provider === 'tokendance' && (
                  <TokenDanceWallet apiKey={formData.apiKey} compact />
                )}

                <div className="space-y-2">
                    <Label htmlFor="api-url">{t('config.apiUrl')}</Label>
                    <Input
                      id="api-url"
                      type="url"
                      placeholder={
                        providerSettings.apiUrlPlaceholder ||
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
                      // 官方域名锁定，防止误改；需要自定义端点请用「OpenAI 兼容」
                      disabled={!isApiUrlEditable(formData.provider)}
                    />
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="model-id">{t('models.modelId')}</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      {availableModels.length > 0 ? (
                        <Combobox
                          options={availableModels}
                          value={formData.model}
                          onValueChange={(value) =>
                            setFormData({ ...formData, model: value })
                          }
                          placeholder={
                            providerSettings.modelPlaceholder
                          }
                          searchPlaceholder={t(
                            'models.searchModels',
                            'Search models...'
                          )}
                          emptyText={t(
                            'models.noModelsFound',
                            'No matching models found.'
                          )}
                          allowCustomInput={true}
                          disabled={isReadOnly}
                        />
                      ) : (
                        <Input
                          id="model-id"
                          placeholder={
                            providerSettings.modelPlaceholder
                          }
                          value={formData.model}
                          onChange={(e) =>
                            setFormData({ ...formData, model: e.target.value })
                          }
                          readOnly={isReadOnly}
                        />
                      )}
                    </div>
                    {formData.apiUrl &&
                      (formData.apiKey ||
                        formData.provider === 'tokendance') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAvailableModels()}
                        disabled={isLoadingModels || isReadOnly}
                        title={t('models.refreshModels', 'Refresh models')}
                        className="px-3">
                        <RefreshCw
                          className={`h-4 w-4 ${isLoadingModels ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    )}
                  </div>
                </div>

              </div>
              </div>

              <DialogFooter className="border-t border-border pt-4 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                {!isReadOnly && <Button onClick={handleSave}>{t('common.save')}</Button>}
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
                    onClick={() => handleSetDefault(model.id)}
                    title={
                      model.isDefault
                        ? undefined
                        : t('models.clickToSetDefault', '点击设为默认模型')
                    }
                    className={`p-4 transition-colors cursor-pointer ${
                      model.isDefault
                        ? 'bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}>
                    {/* 标题行 - 模型名称和默认徽章 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3
                          className="font-medium text-foreground truncate"
                          title={model.name}>
                          {model.name}
                        </h3>
                        {model.isDefault && (
                          <Badge className="flex-shrink-0 gap-1">
                            <Check className="h-3 w-3" />
                            {t('models.default', '默认')}
                          </Badge>
                        )}

                        {!user && model.costDescription && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50 shadow-sm ml-2">
                            <Star className="h-3 w-3 fill-current" />
                            {t(model.costDescription)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!model.isFixed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(model)
                            }}
                            className="h-8 w-8 p-0"
                            title={t('models.copy')}>
                             <Copy className="h-4 w-4" />
                           </Button>
                         )}
                         {model.isFixed && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation()
                               handleOpenDialog(model, true)
                             }}
                             className="h-8 w-8 p-0"
                             title={t('models.view', '查看详情')}>
                             <Eye className="h-4 w-4" />
                           </Button>
                         )}
                         {!model.isFixed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDialog(model)
                            }}
                            className="h-8 w-8 p-0"
                            title={t('models.edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {!model.isFixed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(model.id)
                            }}
                            disabled={models.length === 1}
                            className="h-8 w-8 p-0"
                            title={t('models.delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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

      {/* MindElixir Star Modal */}
      <MindElixirStarModal
        open={isStarModalOpen}
        onOpenChange={setIsStarModalOpen}
      />
    </div>
  )
}
