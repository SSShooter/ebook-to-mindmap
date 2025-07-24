import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Settings } from 'lucide-react'
import { useConfigStore, useAIConfig, useProcessingOptions } from '../../stores/configStore'

interface ConfigDialogProps {
  processing: boolean
  file: File | null
}

export function ConfigDialog({ processing, file }: ConfigDialogProps) {
  // 使用zustand store管理配置
  const aiConfig = useAIConfig()
  const processingOptions = useProcessingOptions()
  const {
    setAiProvider,
    setApiKey,
    setApiUrl,
    setModel,
    setProcessingMode,
    setBookType,
    setUseSmartDetection,
    setSkipNonEssentialChapters
  } = useConfigStore()

  // 从store中解构状态值
  const { provider: aiProvider, apiKey, apiUrl, model } = aiConfig
  const { processingMode, bookType, useSmartDetection, skipNonEssentialChapters } = processingOptions

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={processing}
          className="flex items-center gap-1"
        >
          <Settings className="h-3.5 w-3.5" />
          配置
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI 服务配置
          </DialogTitle>
          <DialogDescription>
            配置 AI 服务和处理选项
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* AI 服务配置 */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4" />
              <Label className="text-sm font-medium">AI 服务配置</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ai-provider">AI 提供商</Label>
                <Select value={aiProvider} onValueChange={(value: 'gemini' | 'openai') => setAiProvider(value)} disabled={processing}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择 AI 提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI 兼容</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apikey">
                  {aiProvider === 'gemini' ? 'Gemini API Key' : 'API Token'}
                </Label>
                <Input
                  id="apikey"
                  type="password"
                  placeholder={aiProvider === 'gemini' ? '输入您的 Gemini API Key' : '输入您的 API Token'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={processing}
                />
              </div>
            </div>

            {aiProvider === 'openai' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url">API 地址</Label>
                  <Input
                    id="api-url"
                    type="url"
                    placeholder="https://api.openai.com/v1"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    disabled={processing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">模型名称（可选）</Label>
                  <Input
                    id="model"
                    type="text"
                    placeholder="gpt-3.5-turbo, gpt-4 等"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={processing}
                  />
                </div>
              </div>
            )}

            {aiProvider === 'gemini' && (
              <div className="space-y-2">
                <Label htmlFor="gemini-model">模型名称（可选）</Label>
                <Input
                  id="gemini-model"
                  type="text"
                  placeholder="gemini-1.5-flash, gemini-1.5-pro 等"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={processing}
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-purple-50 rounded-lg border">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="processing-mode" className="text-sm font-medium">
                  处理模式
                </Label>
                <Select value={processingMode} onValueChange={(value: 'summary' | 'mindmap' | 'combined-mindmap') => setProcessingMode(value)} disabled={processing}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择处理模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">文字总结模式</SelectItem>
                    <SelectItem value="mindmap">章节思维导图模式</SelectItem>
                    <SelectItem value="combined-mindmap">整书思维导图模式</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  文字总结模式生成章节文字总结和关联分析；章节思维导图模式为每章生成独立思维导图；整书思维导图模式将全书内容整合为一个完整的思维导图。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="book-type" className="text-sm font-medium">
                  书籍类型
                </Label>
                <Select value={bookType} onValueChange={(value: 'fiction' | 'non-fiction') => setBookType(value)} disabled={processing}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择书籍类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-fiction">社科类</SelectItem>
                    <SelectItem value="fiction">小说类</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  选择书籍类型以获得更准确的章节{processingMode === 'summary' ? '总结' : '思维导图'}。社科类适用于学术、商业、自助等非虚构类书籍；小说类适用于文学作品。
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="smart-detection" className="text-sm font-medium">
                启用智能章节检测
              </Label>
              <p className="text-xs text-gray-600">
                当文档没有目录时，尝试智能识别章节标题（如"第X章"、"Chapter X"等）
              </p>
            </div>
            <Switch
              id="smart-detection"
              checked={useSmartDetection}
              onCheckedChange={setUseSmartDetection}
              disabled={processing}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="skip-non-essential" className="text-sm font-medium">
                跳过无关键内容章节
              </Label>
              <p className="text-xs text-gray-600">
                自动跳过致谢、推荐阅读、作者简介等非核心内容章节
              </p>
            </div>
            <Switch
              id="skip-non-essential"
              checked={skipNonEssentialChapters}
              onCheckedChange={setSkipNonEssentialChapters}
              disabled={processing}
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="max-sub-chapter-depth" className="text-sm font-medium">
                递归处理子章节层数
              </Label>
              <Select
                value={processingOptions.maxSubChapterDepth?.toString()}
                onValueChange={(value) => useConfigStore.getState().setMaxSubChapterDepth(parseInt(value))}
                disabled={processing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择递归层数" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">不递归处理子章节</SelectItem>
                  <SelectItem value="1">递归1层子章节</SelectItem>
                  <SelectItem value="2">递归2层子章节</SelectItem>
                  <SelectItem value="3">递归3层子章节</SelectItem>
                  <SelectItem value="4">递归4层子章节</SelectItem>
                  <SelectItem value="5">递归5层子章节</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                仅适用于PDF文件。设置为0表示不递归处理子章节，仅处理顶层章节；设置为大于0的值表示递归处理指定层数的子章节。
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}