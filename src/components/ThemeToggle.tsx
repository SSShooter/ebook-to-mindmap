import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'system':
        return <Monitor className="h-4 w-4" />
    }
  }

  const getTooltipText = () => {
    switch (theme) {
      case 'light':
        return t('theme.light', { defaultValue: '浅色主题' })
      case 'dark':
        return t('theme.dark', { defaultValue: '深色主题' })
      case 'system':
        return t('theme.system', { defaultValue: '跟随系统' })
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={cycleTheme}
          className="w-full justify-start gap-3"
        >
          {getIcon()}
          <span>{getTooltipText()}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('theme.clickToChange', { defaultValue: '点击切换主题' })}</p>
      </TooltipContent>
    </Tooltip>
  )
}
