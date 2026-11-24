import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { logAction } from '../lib/audit'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError)
      setLoading(false)
    } else {
      await logAction('auth.signin', 'admin')
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-pink-50 via-slate-50 to-brand-aqua-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/assets/logo.png" alt="Bubbles" className="w-16 h-16 rounded-2xl mb-4" />
          <h1 className="font-display font-bold text-2xl text-slate-900">Bubbles Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your administrator account</p>
        </div>

        <div className="card p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="input pl-10"
                  placeholder="admin@skinzbubbles.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/reset-password" className="text-sm text-brand-pink-600 hover:text-brand-pink-700">
              Forgot password?
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Authorized administrators only. Public registration is disabled.
        </p>
      </div>
    </div>
  )
}
