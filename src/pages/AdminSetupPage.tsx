import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AdminSetupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [setupDisabled, setSetupDisabled] = useState(false)

  useEffect(() => {
    checkSetupStatus()
  }, [])

  async function checkSetupStatus() {
    try {
      const { count, error } = await supabase
        .from('admin_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin')

      if (error) {
        setSetupDisabled(false)
      } else if (count && count > 0) {
        setSetupDisabled(true)
      } else {
        setSetupDisabled(false)
      }
    } catch {
      setSetupDisabled(false)
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (fullName.trim().length < 2) {
      setError('Enter your full name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bootstrap-super-admin`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, password, full_name: fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create super admin account.')
        return
      }

      setSetupDisabled(true)
      navigate('/admin/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to setup service.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-pink-600" />
      </div>
    )
  }

  if (setupDisabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-pink-50 via-slate-50 to-brand-aqua-50 p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src="/assets/logo.png" alt="Bubbles" className="w-16 h-16 rounded-2xl mb-4" />
            <h1 className="font-display font-bold text-2xl text-slate-900">Setup Complete</h1>
          </div>
          <div className="card p-6 text-center">
            <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-sm text-slate-600 mb-4">
              A Super Admin account has already been created. The initial setup is now disabled for security.
            </p>
            <button onClick={() => navigate('/admin/login')} className="btn-primary w-full">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-pink-50 via-slate-50 to-brand-aqua-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/assets/logo.png" alt="Bubbles" className="w-16 h-16 rounded-2xl mb-4" />
          <h1 className="font-display font-bold text-2xl text-slate-900">Initial Setup</h1>
          <p className="text-sm text-slate-500 mt-1">Create your Super Admin account</p>
        </div>

        <div className="card p-6 md:p-8">
          <div className="rounded-lg bg-brand-aqua-50 border border-brand-aqua-200 px-3 py-2 text-sm text-brand-aqua-800 mb-4">
            This page creates the first and only Super Admin account. After this, the setup page disables itself automatically.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  autoFocus
                  className="input pl-10"
                  placeholder="Jane Doe"
                />
              </div>
            </div>
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input pl-10"
                  placeholder="owner@skinzbubbles.com"
                />
              </div>
            </div>
            <div>
              <label className="label">Password (min 8 characters)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="input"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create Super Admin Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          This page is only available until the first Super Admin is created.
        </p>
      </div>
    </div>
  )
}
