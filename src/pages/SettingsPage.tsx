import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useConfigStore, useProcessingOptions } from '../stores/configStore'
import type { SupportedLanguage } from '../services/prompts/utils'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const processingOptions = useProcessingOptions()
  const {
    setProcessingMode,
    setBookType,
    setSkipNonEssentialChapters,
    setOutputLanguage,
    setForceUseSpine
  } = useConfigStore()

  const { processingMode, bookType, skipNonEssentialChapters, outputLanguage, forceUseSpine } = processingOptions

  const handleExportConfig = () => {
    const config = {
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
          
          if (!config.processingOptions) {
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

  return (
    <div className="flex-1 overflow-hidden bg-gray-50">
      <div className="max-w-4xl mx-auto p-8 h-full flex flex-col">
        <div className="mb-8 flex-shrink-0">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Settings className="h-6 w-6 text-gray-700" />
            {t('config.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('config.description')}</p>
        </div>

        <ScrollArea className="flex-1 h-1">
          <div className="space-y-6 pr-4">
            {/* Interface Language */}
            <div className="p-5 bg-white rounded-xl border border-gray-200">
              <div className="space-y-3">
                <Label htmlFor="interface-language" className="text-sm font-medium text-gray-900">
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
                <p className="text-xs text-gray-500">
                  {t('config.interfaceLanguageDescription') || 'Select the language for the application interface'}
                </p>
              </div>
            </div>

            {/* Output Language */}
            <div className="p-5 bg-white rounded-xl border border-gray-200">
              <div className="space-y-3">
                <Label htmlFor="output-language" className="text-sm font-medium text-gray-900">
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
                <p className="text-xs text-gray-500">{t('config.outputLanguageDescription')}</p>
              </div>
            </div>

            {/* Processing Options */}
            <div className="p-5 bg-white rounded-xl border border-gray-200">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="processing-mode" className="text-sm font-medium text-gray-900">
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
                  <p className="text-xs text-gray-500">{t('config.processingModeDescription')}</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="book-type" className="text-sm font-medium text-gray-900">
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
                  <p className="text-xs text-gray-500">
                    {t('config.bookTypeDescription', { type: processingMode === 'summary' ? t('config.summary') : t('config.mindmap') })}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200">
              <div className="space-y-0.5">
                <Label htmlFor="skip-non-essential" className="text-sm font-medium text-gray-900">
                  {t('config.skipIrrelevantChapters')}
                </Label>
                <p className="text-xs text-gray-500">{t('config.skipIrrelevantChaptersDescription')}</p>
              </div>
              <Switch
                id="skip-non-essential"
                checked={skipNonEssentialChapters}
                onCheckedChange={setSkipNonEssentialChapters}
              />
            </div>

            <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200">
              <div className="space-y-0.5">
                <Label htmlFor="force-use-spine" className="text-sm font-medium text-gray-900">
                  {t('config.forceUseSpine')}
                </Label>
                <p className="text-xs text-gray-500">{t('config.forceUseSpineDescription')}</p>
              </div>
              <Switch
                id="force-use-spine"
                checked={forceUseSpine}
                onCheckedChange={setForceUseSpine}
              />
            </div>

            <div className="p-5 bg-white rounded-xl border border-gray-200">
              <div className="space-y-3">
                <Label htmlFor="max-sub-chapter-depth" className="text-sm font-medium text-gray-900">
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
                <p className="text-xs text-gray-500">{t('config.recursionDepthDescription')}</p>
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
