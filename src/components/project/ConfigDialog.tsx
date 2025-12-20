import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Settings, Brain } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigStore, useProcessingOptions } from '../../stores/configStore'
import { useModelStore } from '../../stores/modelStore'
import type { SupportedLanguage } from '../../services/prompts/utils'
import { useState, useEffect, useEffectEvent } from 'react'

interface ConfigDialogProps {
  processing: boolean
  file: File | null
}

export function ConfigDialog({ processing }: ConfigDialogProps) {
  const { t } = useTranslation()
  const processingOptions = useProcessingOptions()
  const { models, getDefaultModel } = useModelStore()
  const {
    setProcessingMode,
    setBookType,
    setSkipNonEssentialChapters,
    setOutputLanguage,
    setForceUseSpine,
    setAiProvider,
    setApiKey,
    setApiUrl,
    setModel,
    setTemperature
  } = useConfigStore()

  const { processingMode, bookType, skipNonEssentialChapters, outputLanguage, forceUseSpine } = processingOptions

  const [selectedModelId, setSelectedModelId] = useState<string>('')

  const selectedModel = models.find(m => m.id === selectedModelId)

  const handleModelChange = (id: string) => {
    setSelectedModelId(id)
    const model = models.find(m => m.id === id)
    if (model) {
      setAiProvider(model.provider)
      setApiKey(model.apiKey)
      setApiUrl(model.apiUrl)
      setModel(model.model)
      setTemperature(model.temperature)
    }
  }

  const onInit = useEffectEvent(() => {
    const defaultModel = getDefaultModel()
    if (defaultModel && !selectedModelId) {
      handleModelChange(defaultModel.id)
    }
  });

  useEffect(() => {
    onInit()
  }, [])

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('config.title')}</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('config.title')}
          </DialogTitle>
          <DialogDescription>
            {t('config.description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Model Selection */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4" />
                <Label className="text-sm font-medium">{t('models.selectModel')}</Label>
              </div>

              {models.length === 0 ? (
                <div className="text-sm text-gray-600 py-2">
                  {t('models.noModelsConfigured')}
                </div>
              ) : (
                <Select
                  value={selectedModelId}
                  onValueChange={handleModelChange}
                  disabled={processing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('models.selectModelPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} {model.isDefault && '⭐'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedModel && (
                <div className="text-xs text-gray-600 mt-2 space-y-1">
                  <div>
                    <span className="font-medium">{t('config.aiProvider')}:</span>{' '}
                    {selectedModel.provider}
                  </div>
                  <div>
                    <span className="font-medium">{t('config.modelName')}:</span>{' '}
                    {selectedModel.model}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-indigo-50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="output-language" className="text-sm font-medium">
                  {t('config.outputLanguage')}
                </Label>
                <Select value={outputLanguage} onValueChange={(value: SupportedLanguage) => setOutputLanguage(value)} disabled={processing}>
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
                <p className="text-xs text-gray-600">
                  {t('config.outputLanguageDescription')}
                </p>
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="processing-mode" className="text-sm font-medium">
                    {t('config.processingMode')}
                  </Label>
                  <Select value={processingMode} onValueChange={(value: 'summary' | 'mindmap' | 'combined-mindmap') => setProcessingMode(value)} disabled={processing}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('config.selectProcessingMode')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">{t('config.summaryMode')}</SelectItem>
                      <SelectItem value="mindmap">{t('config.mindmapMode')}</SelectItem>
                      <SelectItem value="combined-mindmap">{t('config.combinedMindmapMode')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    {t('config.processingModeDescription')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="book-type" className="text-sm font-medium">
                    {t('config.bookType')}
                  </Label>
                  <Select value={bookType} onValueChange={(value: 'fiction' | 'non-fiction') => setBookType(value)} disabled={processing}>
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


            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
              <div className="space-y-1">
                <Label htmlFor="skip-non-essential" className="text-sm font-medium">
                  {t('config.skipIrrelevantChapters')}
                </Label>
                <p className="text-xs text-gray-600">
                  {t('config.skipIrrelevantChaptersDescription')}
                </p>
              </div>
              <Switch
                id="skip-non-essential"
                checked={skipNonEssentialChapters}
                onCheckedChange={setSkipNonEssentialChapters}
                disabled={processing}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg border">
              <div className="space-y-1">
                <Label htmlFor="force-use-spine" className="text-sm font-medium">
                  {t('config.forceUseSpine')}
                </Label>
                <p className="text-xs text-gray-600">
                  {t('config.forceUseSpineDescription')}
                </p>
              </div>
              <Switch
                id="force-use-spine"
                checked={forceUseSpine}
                onCheckedChange={setForceUseSpine}
                disabled={processing}
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border mb-4">
              <div className="space-y-2">
                <Label htmlFor="max-sub-chapter-depth" className="text-sm font-medium">
                  {t('config.recursionDepth')}
                </Label>
                <Select
                  value={processingOptions.maxSubChapterDepth?.toString()}
                  onValueChange={(value) => useConfigStore.getState().setMaxSubChapterDepth(parseInt(value))}
                  disabled={processing}
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
                <p className="text-xs text-gray-600">
                  {t('config.recursionDepthDescription')}
                </p>
              </div>
            </div>



          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
