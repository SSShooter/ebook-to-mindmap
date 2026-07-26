import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { buildDesktopAuthUrl } from '@/lib/auth'
import { MonitorCheck } from 'lucide-react'

/**
 * 桌面端登录中转页
 * 后端 OAuth 登录成功后（?type=desktop）会 redirect 到本页，
 * 本页通过 eb2mm://auth?token=xxx deep link 唤醒 Tauri 桌面端
 */
export function DesktopAuthPage() {
  const { t } = useTranslation()
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get('token'),
    []
  )

  const openDesktopApp = () => {
    if (!token) return
    window.location.href = buildDesktopAuthUrl(token)
  }

  useEffect(() => {
    // 进入页面自动尝试唤醒桌面端
    openDesktopApp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <MonitorCheck className="h-14 w-14 text-primary" />
        {token ? (
          <>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {t('desktopAuth.title', 'Login successful')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(
                  'desktopAuth.description',
                  'We are opening the desktop app for you. If nothing happens, click the button below.'
                )}
              </p>
            </div>
            <Button onClick={openDesktopApp} className="w-full">
              {t('desktopAuth.openApp', 'Open Desktop App')}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t(
              'desktopAuth.missingToken',
              'Login token is missing. Please try logging in from the desktop app again.'
            )}
          </p>
        )}
      </div>
    </div>
  )
}
