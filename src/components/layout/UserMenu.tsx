import { useAuthStore } from '@/stores/authStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, LogIn } from 'lucide-react'
import { useEffect } from 'react'

export function UserMenu() {
  const { user, isLoading, fetchUser, logout } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
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
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2">
            <UserIcon className="h-4 w-4" />
            Profile (Mind Elixir Cloud)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
