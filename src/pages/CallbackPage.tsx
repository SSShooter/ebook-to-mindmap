import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { authService } from '@/services/authService'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export const CallbackPage = () => {
  const [, setLocation] = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    const handleAuth = async () => {
      try {
        await authService.handleCallback()
        setStatus('success')
        toast.success('Authentication successful!')
        
        // Redirect back to home after a short delay
        setTimeout(() => {
          setLocation('/')
        }, 2000)
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('Callback error:', err)
        setError(errorMsg)
        setStatus('error')
        toast.error('Authentication failed: ' + errorMsg)
      }
    }

    handleAuth()
  }, [setLocation])

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-card border border-border shadow-xl p-8 flex flex-col items-center text-center space-y-6">
        {status === 'processing' && (
          <>
            <div className="p-4 bg-primary/10 rounded-full animate-pulse">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold">Completing Login</h2>
            <p className="text-muted-foreground leading-relaxed">
              We're securely verifying your authentication with the server. This will just take a moment.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="p-4 bg-green-500/10 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Welcome Back!</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your login was successful. We're redirecting you back to the main page now.
            </p>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-[progress_2s_ease-in-out]" />
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-500">Authentication Error</h2>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 w-full">
                <p className="text-red-500/90 text-sm font-mono break-words">
                  {error}
                </p>
            </div>
            <button 
              onClick={() => setLocation('/')}
              className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium shadow-md shadow-primary/20"
            >
              Return to Home
            </button>
          </>
        )}

        <div className="pt-4 border-t border-border w-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                OAuth 2.0 PKCE Flow
            </p>
        </div>
      </div>
    </div>
  )
}
