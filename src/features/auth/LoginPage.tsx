import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, AlertCircle, Phone } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button, Input } from '@/components/ui'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, login, loginWithSso, auth } = useApp()

  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!profile) {
      setError('No account found on this device yet. Please create an account first.')
      return
    }
    setBusy(true)
    const ok = await login(mobile, password)
    setBusy(false)
    if (ok) {
      navigate('/')
    } else {
      setError('Incorrect mobile number or password. Please try again.')
    }
  }

  async function signInWithCircle() {
    setError(null)
    setBusy(true)
    try {
      await loginWithSso() // redirects to Circle's hosted auth
    } catch {
      setBusy(false)
      setError('Could not reach Circle sign-in. Please try again shortly.')
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-pounamu-900 bg-weave text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-pounamu-800/40 via-pounamu-900 to-pounamu-950" />

      <div className="relative flex flex-1 flex-col justify-between px-6 py-10 safe-top safe-bottom">
        {/* Brand */}
        <div className="pt-6">
          <Logo className="h-16 w-16" />
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight">NQR</h1>
          <p className="mt-2 max-w-xs text-pounamu-100/90">
            Not Quite Right — spot something that isn’t right at work and raise it with your
            supervisor in a few taps. Part of Me Mataara.
          </p>
        </div>

        {/* Card — password form (mock) or Circle SSO handoff */}
        {auth.passwordLogin ? (
          <form onSubmit={submit} className="mt-8 rounded-3xl bg-white/95 p-6 text-ink shadow-float backdrop-blur">
          <div className="mb-5 flex items-center gap-2 text-pounamu-700">
            <Phone className="h-5 w-5" />
            <p className="font-display text-lg font-semibold">Sign in</p>
          </div>

          <label className="field-label">Mobile number</label>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="021 234 5678"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value)
              setError(null)
            }}
            className="text-base"
          />

          <label className="field-label mt-4">Password</label>
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              className="pr-12 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint hover:text-ink"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-kokowai-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" block size="lg" className="mt-5" disabled={!mobile.trim() || !password || busy} icon={<ArrowRight className="h-5 w-5" />}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          <div className="mt-5 border-t border-black/5 pt-4 text-center text-sm text-ink-faint">
            New to NQR?{' '}
            <button type="button" onClick={() => navigate('/register')} className="font-semibold text-pounamu-700">
              Create an account
            </button>
          </div>
          {profile && (
            <p className={cn('mt-3 text-center text-xs text-ink-faint')}>
              Registered as <span className="font-semibold text-ink">{profile.firstName} {profile.lastName}</span> · sign in with mobile{' '}
              <span className="font-semibold text-ink">{profile.mobile}</span>.
            </p>
          )}
          </form>
        ) : (
          <div className="mt-8 rounded-3xl bg-white/95 p-6 text-ink shadow-float backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-pounamu-700">
              <Phone className="h-5 w-5" />
              <p className="font-display text-lg font-semibold">Sign in</p>
            </div>
            <p className="text-sm text-ink-faint">
              Your NQR account is managed in Circle — the Me Mataara platform. Sign in there to
              continue.
            </p>

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-kokowai-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <Button
              type="button"
              block
              size="lg"
              className="mt-5"
              onClick={signInWithCircle}
              disabled={busy}
              icon={<ArrowRight className="h-5 w-5" />}
            >
              {busy ? 'Redirecting…' : 'Sign in with Circle'}
            </Button>

            <p className="mt-4 text-center text-xs text-ink-faint">
              Don’t have an account? Ask your supervisor or platform admin — accounts are created in
              Circle.
            </p>
          </div>
        )}

        <p className="relative mt-6 text-center text-xs text-pounamu-200/70">Funded by ACC · Part of Me Mataara</p>
      </div>
    </div>
  )
}
