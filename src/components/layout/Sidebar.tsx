import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import { BookOpen, Settings, Brain, MessageSquarePlus, X, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Footer } from '../Footer'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isMobile?: boolean
}

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
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
      path: '/custom-prompts',
      icon: MessageSquarePlus,
      label: t('nav.customPrompts'),
    },
    {
      path: '/cache',
      icon: Database,
      label: t('nav.cacheManagement'),
    },
    {
      path: '/settings',
      icon: Settings,
      label: t('nav.settings'),
    },
  ]

  const sidebarClasses = cn(
    'bg-gray-900 text-white flex flex-col h-screen shrink-0 z-50 transition-transform duration-300 ease-in-out',
    isMobile
      ? 'fixed top-0 left-0 w-64 transform'
      : 'w-56',
    isMobile && isOpen
      ? 'translate-x-0'
      : isMobile
        ? '-translate-x-full'
        : ''
  )

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose()
    }
  }

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div className={sidebarClasses}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="icon" className="h-8 w-8" />
              <span className="font-semibold text-base">eBook To Mindmap</span>
            </div>
            {isMobile && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
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
                    onClick={handleLinkClick}
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
    </>
  )
}
