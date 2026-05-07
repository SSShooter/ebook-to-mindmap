import { useAuthStore } from '@/stores/authStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, LogIn, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Footer } from '../Footer'

export function UserMenu() {
  const { t } = useTranslation()
  const { user, isLoading, logout } = useAuthStore()

  const handleLogin = () => {
    window.location.href = 'http://localhost:7001/oauth/authme/login/eb2me'
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogin}>
          <LogIn className="h-4 w-4" />
          <span>Login / Sign up</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 p-2 h-auto hover:bg-sidebar-accent">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback>
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start min-w-0 overflow-hidden">
              <span className="text-sm font-medium truncate w-full">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full">
                {user.email}
              </span>
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{t('user.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            <Avatar className="h-20 w-20 border-2 border-primary/10">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="text-2xl">
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/10 px-6 py-3 rounded-2xl border border-yellow-200/50 dark:border-yellow-800/30">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                {user.star?.toFixed(2) || '0.00'}
              </span>
              <span className="text-sm font-medium text-yellow-600/80 dark:text-yellow-500/80">
                {t('user.star')}
              </span>
            </div>

            <div className="w-full space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11"
                asChild>
                <a
                  href="https://app.mind-elixir.com"
                  target="_blank"
                  rel="noopener noreferrer">
                  <UserIcon className="h-4 w-4" />
                  <span>{t('user.profile')}</span>
                </a>
              </Button>

              <Button
                variant="destructive"
                className="w-full justify-start gap-3 h-11"
                onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span>{t('user.logout')}</span>
              </Button>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-border/40">
            <Footer />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
