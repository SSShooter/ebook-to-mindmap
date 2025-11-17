import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings, ExternalLink, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useConfigStore, useAIConfig, useProcessingOptions } from '../stores/configStore'
import type { SupportedLanguage } from '../services/prompts/utils'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const aiConfig = useAIConfig()
  const processingOptions = useProcessingOptions()
  const {
    setAiProvider,
    setApiKey,
    setApiUrl,
    setModel,
    setTemperature,
    setProcessingMode,
    setBookType,
    setSkipNonEssentialChapters,
    setOutputLanguage,
    setForceUseSpine
  } = useConfigStore()

  const { provider: aiProvider, apiKey, apiUrl, model, temperature } = aiConfig
  const { processingMode, bookType, skipNonEssentialChapters, outputLanguage, forceUseSpine } = processingOptions

  const handleExportConfig = () => {
    const config = {
      aiConfig,
      processingOptions
    }
    const dataStr = JSON.stringify(config, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ebook-mindmap-config-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(t('config.exportSuccess'))
  }

  const handleImportConfig = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const config = JSON.parse(event.target?.result as string)
          
          if (!config.aiConfig || !config.processingOptions) {
            toast.error(t('config.importError'))
            return
          }

          useConfigStore.getState().importConfig(config)
          toast.success(t('config.importSuccess'))
        } catch (error) {
          console.error('Failed to import config:', error)
          toast.error(t('config.importError'))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

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

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            {t('config.title')}
          </h1>
          <p className="text-gray-600 mt-2">{t('config.description')}</p>
        </div>

        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="space-y-6 pr-4">
            {/* Interface Language */}
            <div className="p-6 bg-blue-50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="interface-language" className="text-sm font-medium">
                  {t('config.interfaceLanguage') || 'Interface Language'}
                </Label>
                <Select 
                  value={i18n.language} 
                  onValueChange={(value) => i18n.changeLanguage(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.selectInterfaceLanguage') || 'Select interface language'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  {t('config.interfaceLanguageDescription') || 'Select the language for the application interface'}
                </p>
              </div>
            </div>

            {/* AI Service Config */}
            <div className="space-y-4 p-6 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5" />
                <h2 className="text-lg font-semibold">{t('config.aiServiceConfig')}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">{t('config.aiProvider')}</Label>
                  <div className="flex flex-col items-start gap-2">
                    <Select
                      value={aiProvider}
                      onValueChange={(value: 'gemini' | 'openai' | 'ollama' | '302.ai') => {
                        setAiProvider(value)
                        if (value === '302.ai') {
                          setApiUrl('https://api.302.ai/v1')
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('config.selectAiProvider')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">{t('config.openaiCompatible')}</SelectItem>
                        <SelectItem value="ollama">Ollama</SelectItem>
                        <SelectItem value="302.ai">302.AI</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="link" className="p-0 h-auto text-xs" asChild>
                      <a href={providerSettings[aiProvider].url} target="_blank" rel="noopener noreferrer">
                        {t('config.visitSite')}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apikey">{providerSettings[aiProvider].apiKeyLabel}</Label>
                  <Input
                    id="apikey"
                    type="password"
                    placeholder={providerSettings[aiProvider].apiKeyPlaceholder}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              {(aiProvider === 'openai' || aiProvider === 'ollama' || aiProvider === '302.ai') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-url">{t('config.apiUrl')}</Label>
                      <Input
                        id="api-url"
                        type="url"
                        placeholder={providerSettings[aiProvider].apiUrlPlaceholder}
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        disabled={aiProvider === '302.ai'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">{t('config.modelName')}</Label>
                      <Input
                        id="model"
                        type="text"
                        placeholder={providerSettings[aiProvider].modelPlaceholder}
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-temperature">{t('config.temperature')}</Label>
                    <Input
                      id="openai-temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      placeholder="0.7"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-gray-600">{t('config.temperatureDescription')}</p>
                  </div>
                </>
              )}

              {aiProvider === 'gemini' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-model">{t('config.modelName')}</Label>
                    <Input
                      id="gemini-model"
                      type="text"
                      placeholder={providerSettings.gemini.modelPlaceholder}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gemini-temperature">{t('config.temperature')}</Label>
                    <Input
                      id="gemini-temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      placeholder="0.7"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                    />
                    <p className="text-xs text-gray-600">{t('config.temperatureDescription')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Output Language */}
            <div className="p-6 bg-indigo-50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="output-language" className="text-sm font-medium">
                  {t('config.outputLanguage')}
                </Label>
                <Select value={outputLanguage} onValueChange={(value: SupportedLanguage) => setOutputLanguage(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.selectOutputLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('config.outputLanguageAuto')}</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">{t('config.outputLanguageDescription')}</p>
              </div>
            </div>

            {/* Processing Options */}
            <div className="p-6 bg-purple-50 rounded-lg border">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="processing-mode" className="text-sm font-medium">
                    {t('config.processingMode')}
                  </Label>
                  <Select value={processingMode} onValueChange={(value: 'summary' | 'mindmap' | 'combined-mindmap') => setProcessingMode(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('config.selectProcessingMode')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">{t('config.summaryMode')}</SelectItem>
                      <SelectItem value="mindmap">{t('config.mindmapMode')}</SelectItem>
                      <SelectItem value="combined-mindmap">{t('config.combinedMindmapMode')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">{t('config.processingModeDescription')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="book-type" className="text-sm font-medium">
                    {t('config.bookType')}
                  </Label>
                  <Select value={bookType} onValueChange={(value: 'fiction' | 'non-fiction') => setBookType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('config.selectBookType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non-fiction">{t('config.socialType')}</SelectItem>
                      <SelectItem value="fiction">{t('config.novelType')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    {t('config.bookTypeDescription', { type: processingMode === 'summary' ? t('config.summary') : t('config.mindmap') })}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="flex items-center justify-between p-6 bg-green-50 rounded-lg border">
              <div className="space-y-1">
                <Label htmlFor="skip-non-essential" className="text-sm font-medium">
                  {t('config.skipIrrelevantChapters')}
                </Label>
                <p className="text-xs text-gray-600">{t('config.skipIrrelevantChaptersDescription')}</p>
              </div>
              <Switch
                id="skip-non-essential"
                checked={skipNonEssentialChapters}
                onCheckedChange={setSkipNonEssentialChapters}
              />
            </div>

            <div className="flex items-center justify-between p-6 bg-cyan-50 rounded-lg border">
              <div className="space-y-1">
                <Label htmlFor="force-use-spine" className="text-sm font-medium">
                  {t('config.forceUseSpine')}
                </Label>
                <p className="text-xs text-gray-600">{t('config.forceUseSpineDescription')}</p>
              </div>
              <Switch
                id="force-use-spine"
                checked={forceUseSpine}
                onCheckedChange={setForceUseSpine}
              />
            </div>

            <div className="p-6 bg-amber-50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="max-sub-chapter-depth" className="text-sm font-medium">
                  {t('config.recursionDepth')}
                </Label>
                <Select
                  value={processingOptions.maxSubChapterDepth?.toString()}
                  onValueChange={(value) => useConfigStore.getState().setMaxSubChapterDepth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.selectRecursionDepth')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('config.noRecursion')}</SelectItem>
                    <SelectItem value="1">{t('config.recursion1Layer')}</SelectItem>
                    <SelectItem value="2">{t('config.recursion2Layers')}</SelectItem>
                    <SelectItem value="3">{t('config.recursion3Layers')}</SelectItem>
                    <SelectItem value="4">{t('config.recursion4Layers')}</SelectItem>
                    <SelectItem value="5">{t('config.recursion5Layers')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">{t('config.recursionDepthDescription')}</p>
              </div>
            </div>

            {/* Import/Export */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleImportConfig}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {t('config.importConfig')}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportConfig}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('config.exportConfig')}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
