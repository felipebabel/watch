import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      // Clean leftover hash from OAuth redirect (e.g. bare "#" after PKCE flow)
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
      // Clean up any hash left by OAuth redirect
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (!isMobile) {
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error || !data?.url) return

      const popup = window.open(data.url, 'google-signin',
        `width=${width},height=${height},left=${left},top=${top}`)

      // Listen for postMessage from popup when OAuth completes
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type !== 'supabase-oauth-callback') return
        window.removeEventListener('message', handleMessage)
        if (popup && !popup.closed) popup.close()
        // Re-fetch session — Supabase stored it via the callback URL
        const { data: { session } } = await supabase.auth.getSession()
        if (session) setSession(session)
      }
      window.addEventListener('message', handleMessage)

      // Fallback: if popup closed without postMessage, still check session
      const timer = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(timer)
          window.removeEventListener('message', handleMessage)
          const { data: { session } } = await supabase.auth.getSession()
          if (session) setSession(session)
        }
      }, 500)
    } else {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      })
    }
  }

  const signOut = async () => {
    // signOut clears localStorage tokens — onAuthStateChange fires with null
    // which triggers the ProtectedRoute redirect to /login via React Router
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
