import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from './supabase'
import { AdminAccount, hasPermission, AdminRole } from './types'

interface AuthContextValue {
  admin: AdminAccount | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshAdmin: () => Promise<void>
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAdmin = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setAdmin(null)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error || !data) {
      setAdmin(null)
      setLoading(false)
      return
    }

    if (data.status === 'suspended' || data.status === 'revoked') {
      await supabase.auth.signOut()
      setAdmin(null)
      setLoading(false)
      return
    }

    setAdmin(data as AdminAccount)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAdmin()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session?.user) {
          setAdmin(null)
          setLoading(false)
          return
        }
        await loadAdmin()
      })()
    })
    return () => subscription.unsubscribe()
  }, [loadAdmin])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    if (admin) {
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin.id,
        admin_email: admin.email,
        action: 'auth.signout',
        resource_type: 'admin',
        resource_id: admin.id,
      })
    }
    await supabase.auth.signOut()
    setAdmin(null)
  }, [admin])

  const refreshAdmin = useCallback(async () => {
    await loadAdmin()
  }, [loadAdmin])

  const can = useCallback((permission: string) => {
    if (!admin) return false
    return hasPermission(admin.role as AdminRole, permission)
  }, [admin])

  return (
    <AuthContext.Provider value={{ admin, loading, signIn, signOut, refreshAdmin, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
