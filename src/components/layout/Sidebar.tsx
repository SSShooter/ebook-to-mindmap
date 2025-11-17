import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import { BookOpen, Settings, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Footer } from '../Footer'

export function Sidebar() {
  const { t } = useTranslation()
  const [location] = useLocation()

  const navItems = [
    {
      path: '/',
      icon: BookOpen,
      label: t('nav.summary'),
    },
    {
      path: '/models',
      icon: Brain,
      label: t('nav.models'),
    },
    {
      path: '/settings',
      icon: Settings,
      label: t('nav.settings'),
    },
  ]

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen shrink-0">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="icon" className="h-8 w-8" />
          <span className="font-semibold text-lg">eBook AI</span>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location === item.path

            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <Footer />
    </div>
  )
}
