import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, User, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [valid, setValid] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    verifyInvite()
  }, [])

  async function verifyInvite() {
    const { data, error } = await supabase
      .from('admin_invites')
      .select('email, role, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle()

    if (error || !data) {
      setValid(false)
      setVerifying(false)
      return
    }
    if (data.accepted_at) {
      setError('This invitation has already been used.')
      setValid(false)
      setVerifying(false)
      return
    }
    if (new Date(data.expires_at) < new Date()) {
      setError('This invitation has expired.')
      setValid(false)
      setVerifying(false)
      return
    }
    setInviteEmail(data.email)
    setInviteRole(data.role)
    setValid(true)
    setVerifying(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (fullName.trim().length < 2) {
      setError('Enter your full name.')
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
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invite`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ token, password, full_name: fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create admin account.')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-pink-600" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-pink-50 via-slate-50 to-brand-aqua-50 p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src="/assets/logo.png" alt="Bubbles" className="w-16 h-16 rounded-2xl mb-4" />
            <h1 className="font-display font-bold text-2xl text-slate-900">Account Created</h1>
          </div>
          <div className="card p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-sm text-slate-600 mb-4">
              Your administrator account has been created successfully. You can now sign in with your email and password.
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
          <h1 className="font-display font-bold text-2xl text-slate-900">Accept Invitation</h1>
        </div>

        <div className="card p-6 md:p-8">
          {valid ? (
            <>
              <div className="rounded-lg bg-brand-aqua-50 border border-brand-aqua-200 px-3 py-2 text-sm text-brand-aqua-800 mb-4">
                You've been invited as <strong className="capitalize">{inviteRole.replace('_', ' ')}</strong>.
                Email: {inviteEmail}
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
                  <label className="label">Email (locked)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      disabled
                      className="input pl-10 bg-slate-50"
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
                  {loading ? 'Creating account...' : 'Create Admin Account'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error || 'Invalid invitation.'}</p>
              <Link to="/admin/login" className="text-brand-pink-600 hover:text-brand-pink-700 text-sm">
                Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
