import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Star, ExternalLink, Sparkles, User as UserIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface MindElixirStarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MindElixirStarModal({
  open,
  onOpenChange,
}: MindElixirStarModalProps) {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const rechargeUrl = 'https://app.mind-elixir.com/recharge'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-amber-500" />
            MindElixir Star
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {user?.name || t('models.notLoggedIn', 'Not logged in')}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email || t('models.pleaseLogin', 'Please login first')}
                </p>
              </div>
            </div>
          </div>

          {/* Star Balance Section */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg p-6 border border-amber-200 dark:border-amber-800/50 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium text-muted-foreground">
                {t('models.starBalance', 'Star Balance')}
              </span>
            </div>
            <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">
              {user?.star !== undefined ? user.star.toLocaleString() : '---'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t(
                'models.starDescription',
                'Use stars to access premium AI models'
              )}
            </p>
          </div>

          {/* Recharge Button */}
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 text-base shadow-lg"
            onClick={() => window.open(rechargeUrl, '_blank')}
            disabled={!user}>
            <Star className="h-5 w-5 mr-2 fill-current" />
            {t('models.rechargeStars', 'Recharge Stars')}
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>

          {/* Info Text */}
          <div className="text-center text-xs text-muted-foreground">
            {user ? (
              <p>
                {t(
                  'models.rechargeHint',
                  'Click the button above to visit the recharge page'
                )}
              </p>
            ) : (
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                {t(
                  'models.loginRequired',
                  'Please login to view your star balance and recharge'
                )}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
