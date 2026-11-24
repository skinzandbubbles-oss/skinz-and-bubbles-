import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'request' | 'reset' | 'done'>('request')

  useEffect(() => {
    // Check if we arrived here from a password reset email link
    // Supabase sets the session from the URL hash, then we can update the password
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setMode('reset')
      }
    })
  }, [])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/forgot-password`,
    })
    setLoading(false)
    if (resetError) {
      setError(resetError.message)
    } else {
      setSent(true)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setMode('done')
      setTimeout(() => navigate('/admin/login'), 3000)
    }
  }

  const renderRequestMode = () => (
    <>
      {sent ? (
        <div className="text-center py-4">
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 mb-4">
            If an account exists for {email}, a password reset email has been sent. Check your inbox and spam folder.
          </div>
          <Link to="/admin/login" className="text-brand-pink-600 hover:text-brand-pink-700 text-sm">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="input pl-10"
                placeholder="admin@skinzbubbles.com"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending...' : 'Send Reset Email'}
          </button>
          <div className="text-center">
            <Link to="/admin/login" className="text-sm text-brand-pink-600 hover:text-brand-pink-700">
              Back to login
            </Link>
          </div>
        </form>
      )}
    </>
  )

  const renderResetMode = () => (
    <form onSubmit={handleUpdatePassword} className="space-y-4">
      <div className="rounded-lg bg-brand-aqua-50 border border-brand-aqua-200 px-3 py-2 text-sm text-brand-aqua-800 mb-4">
        Enter your new password below to complete the reset.
      </div>
      <div>
        <label className="label">New Password (min 8 characters)</label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            autoFocus
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
        <label className="label">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
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
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  )

  const renderDoneMode = () => (
    <div className="text-center py-4">
      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
      <p className="text-sm text-slate-600 mb-4">
        Your password has been updated. Redirecting to login...
      </p>
      <button onClick={() => navigate('/admin/login')} className="text-brand-pink-600 hover:text-brand-pink-700 text-sm">
        Go to login now
      </button>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-pink-50 via-slate-50 to-brand-aqua-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/assets/logo.png" alt="Bubbles" className="w-16 h-16 rounded-2xl mb-4" />
          <h1 className="font-display font-bold text-2xl text-slate-900">
            {mode === 'request' ? 'Reset Password' : mode === 'reset' ? 'Set New Password' : 'Password Updated'}
          </h1>
        </div>

        <div className="card p-6 md:p-8">
          {mode === 'request' && renderRequestMode()}
          {mode === 'reset' && renderResetMode()}
          {mode === 'done' && renderDoneMode()}
        </div>
      </div>
    </div>
  )
}
