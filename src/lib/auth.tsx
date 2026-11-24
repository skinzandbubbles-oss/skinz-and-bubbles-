import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from './supabase'
import { AdminAccount, hasPermission, AdminRole } from './types'

interface AuthContextValue {
  admin: AdminAccount | null
  loading: boolean
  needsMfa: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; needsMfa?: boolean }>
  signOut: () => Promise<void>
  refreshAdmin: () => Promise<void>
  can: (permission: string) => boolean
  enrollMfa: () => Promise<{ qrUrl?: string; secret?: string; error?: string }>
  verifyMfa: (code: string) => Promise<{ error?: string }>
  disableMfa: () => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsMfa, setNeedsMfa] = useState(false)

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

  const enrollMfa = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) return { error: error.message }
      return { qrUrl: data.totp.qr_code, secret: data.totp.secret }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'MFA enrollment failed.' }
    }
  }, [])

  const verifyMfa = useCallback(async (code: string) => {
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) return { error: listError.message }
      const totpFactor = factors?.totp?.[0]
      if (!totpFactor) return { error: 'No MFA factor found.' }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id })
      if (challengeError) return { error: challengeError.message }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      })
      if (verifyError) return { error: verifyError.message }

      await supabase.from('admin_accounts').update({ mfa_enabled: true, updated_at: new Date().toISOString() }).eq('id', admin?.id)
      await loadAdmin()
      return {}
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'MFA verification failed.' }
    }
  }, [admin, loadAdmin])

  const disableMfa = useCallback(async () => {
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) return { error: listError.message }
      const totpFactor = factors?.totp?.[0]
      if (!totpFactor) return { error: 'No MFA factor found.' }

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })
      if (unenrollError) return { error: unenrollError.message }

      await supabase.from('admin_accounts').update({ mfa_enabled: false, updated_at: new Date().toISOString() }).eq('id', admin?.id)
      await loadAdmin()
      return {}
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to disable MFA.' }
    }
  }, [admin, loadAdmin])

  return (
    <AuthContext.Provider value={{ admin, loading, needsMfa, signIn, signOut, refreshAdmin, can, enrollMfa, verifyMfa, disableMfa }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
