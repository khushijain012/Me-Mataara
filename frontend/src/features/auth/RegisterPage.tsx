import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  BadgeCheck,
  AlertCircle,
  Search,
} from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button, Field, Input, Select, Toggle, ProgressBar } from '@/components/ui'
import { useApp, type RegisterInput } from '@/context/AppContext'
import { ME_MATAARA_URL, NZBN_LOOKUP_URL, NZ_INDUSTRIES, searchNzbnByName } from '@/lib/mockData'
import type { Gender } from '@/lib/types'
import { ageFromDob } from '@/lib/utils'
import { cn } from '@/lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, auth, supervisors } = useApp()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  // Step 0 — identity
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')

  // Step 1 — work
  const [companyQuery, setCompanyQuery] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [nzbn, setNzbn] = useState('')
  const [industry, setIndustry] = useState('')
  const [isHSR, setIsHSR] = useState(false)
  const [workerNumber, setWorkerNumber] = useState('')
  const [supervisorId, setSupervisorId] = useState('')

  // Step 2 — optional demographics + security
  const [gender, setGender] = useState<Gender>('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const age = useMemo(() => (dob ? ageFromDob(dob) : null), [dob])
  const matches = useMemo(
    () => (organisation ? [] : searchNzbnByName(companyQuery)),
    [companyQuery, organisation],
  )
  const emailValid = EMAIL_RE.test(email.trim())

  function pickCompany(name: string, num: string) {
    setOrganisation(name)
    setNzbn(num)
    setCompanyQuery(name)
  }
  function clearCompany() {
    setOrganisation('')
    setNzbn('')
    setCompanyQuery('')
  }

  const stepValid =
    step === 0
      ? firstName.trim() && lastName.trim() && dob && mobile.trim().length >= 6 && emailValid
      : step === 1
        ? organisation.trim() && nzbn && industry // worker number + HSR are optional
        : password.length >= 5 && password === confirm // gender optional

  async function next() {
    setError(null)
    if (step < 2) {
      setStep((s) => s + 1)
      return
    }
    const input: RegisterInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob,
      gender,
      industry,
      mobile: mobile.trim(),
      email: email.trim(),
      isHSR,
      workerNumber: workerNumber.trim() || undefined,
      nzbn,
      organisation: organisation.trim(),
      supervisorId: supervisorId || undefined,
      supervisorName: supervisors.find((s) => s.id === supervisorId)?.name,
      password,
    }
    setBusy(true)
    await register(input) // hashes the password before it is ever stored
    setBusy(false)
    navigate('/')
  }

  // Client decision: accounts are created + managed in Circle. When the provider
  // doesn't manage accounts in-app, there's nothing to register here — point the
  // user to Circle instead of collecting details the PWA can't own.
  if (!auth.managesAccounts) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-sand-50 bg-weave px-6 safe-top safe-bottom">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-float ring-1 ring-black/5">
          <Logo className="mx-auto h-14 w-14" />
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">Accounts live in Circle</h1>
          <p className="mt-2 text-sm text-ink-soft">
            NQR accounts are created and managed in Circle — the Me Mataara platform. Once your
            account exists there, sign in with Circle to use NQR.
          </p>
          <a
            href={ME_MATAARA_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-pounamu-700 hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> Open Me Mataara on Circle
          </a>
          <Button block size="lg" className="mt-6" onClick={() => navigate('/login')} icon={<ArrowLeft className="h-5 w-5" />}>
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-sand-50 bg-weave safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 0 ? navigate('/login') : setStep((s) => s - 1))}
            className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-black/5"
          >
            <ArrowLeft className="h-5 w-5 text-ink-soft" />
          </button>
          <div className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <div className="leading-none">
              <p className="font-display text-lg font-bold text-ink">Create your account</p>
              <p className="text-[11px] font-medium text-pounamu-600">NQR · Me Mataara</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <ProgressBar value={((step + 1) / 3) * 100} />
          <span className="shrink-0 text-sm font-semibold text-ink-faint">{step + 1}/3</span>
        </div>

        <div className="mt-6 flex-1">
          {/* Step 0 — About you */}
          {step === 0 && (
            <div className="animate-fade-in space-y-4">
              <StepTitle icon={<BadgeCheck className="h-5 w-5" />} title="About you" hint="Your basic details for your safety record." />
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Te Ariki" />
                </Field>
                <Field label="Surname">
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Wharekura" />
                </Field>
              </div>
              <Field label="Date of birth" hint={age !== null ? `Age: ${age}` : undefined}>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </Field>
              <Field label="Mobile number">
                <Input type="tel" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="021 234 5678" />
              </Field>
              <Field label="Email" hint={email && !emailValid ? 'Enter a valid email address.' : undefined}>
                <Input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.co.nz"
                  className={cn(email && !emailValid && 'border-kokowai-400')}
                />
              </Field>
            </div>
          )}

          {/* Step 1 — Work & organisation */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <StepTitle icon={<Building2 className="h-5 w-5" />} title="Your work" hint="Find your employer by name — we store their NZBN for you." />

              <Field label="Company name" hint="Start typing and pick your employer from the list.">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <Input
                    className={cn('pl-10', organisation && 'border-pounamu-400')}
                    value={companyQuery}
                    onChange={(e) => {
                      setCompanyQuery(e.target.value)
                      if (organisation) {
                        setOrganisation('')
                        setNzbn('')
                      }
                    }}
                    placeholder="e.g. Waterview Alliance"
                  />
                </div>
              </Field>

              {/* Match list */}
              {matches.length > 0 && (
                <div className="-mt-2 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
                  {matches.map((m) => (
                    <button
                      key={m.nzbn}
                      type="button"
                      onClick={() => pickCompany(m.name, m.nzbn)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sand-50"
                    >
                      <span className="font-medium text-ink">{m.name}</span>
                      <span className="text-xs text-ink-faint">NZBN {m.nzbn}</span>
                    </button>
                  ))}
                </div>
              )}
              {companyQuery.trim().length >= 2 && !organisation && matches.length === 0 && (
                <p className="-mt-2 flex items-center gap-1.5 text-sm text-ink-faint">
                  <AlertCircle className="h-4 w-4" /> No match in the demo registry — try “Waterview”, “Northline” or “Downer”.
                </p>
              )}
              {organisation && (
                <div className="-mt-2 flex items-center justify-between rounded-xl bg-pounamu-50 px-4 py-2.5 ring-1 ring-pounamu-100">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-pounamu-800">
                    <BadgeCheck className="h-4 w-4" /> {organisation} · NZBN stored
                  </p>
                  <button type="button" onClick={clearCompany} className="text-xs font-semibold text-pounamu-700 hover:underline">
                    Change
                  </button>
                </div>
              )}

              <Field label="Industry" hint="Helps ACC understand where risks sit.">
                <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option value="">Select your industry…</option>
                  {NZ_INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5">
                <div className="pr-4">
                  <p className="font-medium text-ink">I hold a health &amp; safety role</p>
                  <p className="text-sm text-ink-faint">e.g. HSR / H&amp;S rep for my crew or site</p>
                </div>
                <Toggle checked={isHSR} onChange={setIsHSR} label="H&S role" />
              </div>

              <Field label="Worker number" hint="Optional — only if your business uses one.">
                <Input value={workerNumber} onChange={(e) => setWorkerNumber(e.target.value)} placeholder="Optional" />
              </Field>

              <Field label="Your supervisor" hint="Claim your supervisor so your concerns reach the right person. You can set this later.">
                <Select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                  <option value="">Choose later</option>
                  {supervisors
                    .filter((s) => s.approval === 'approved')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.crew}
                      </option>
                    ))}
                </Select>
              </Field>

              <a
                href={NZBN_LOOKUP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-pounamu-700 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Can’t find your employer? Open the NZBN register
              </a>
            </div>
          )}

          {/* Step 2 — Optional details + security */}
          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <StepTitle icon={<ShieldCheck className="h-5 w-5" />} title="Secure your account" hint="Create a password you’ll use to sign in." />

              <Field label="Gender" hint="Optional — reported in aggregate only, never individually.">
                <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="gender_diverse">Gender diverse</option>
                  <option value="prefer_not">Prefer not to say</option>
                </Select>
              </Field>

              <Field label="Password" hint="At least 5 characters.">
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint hover:text-ink"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  className={cn(confirm && confirm !== password && 'border-kokowai-400')}
                />
              </Field>
            </div>
          )}

          {error && (
            <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-kokowai-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
        </div>

        <div className="pt-4">
          <Button
            block
            size="lg"
            disabled={!stepValid || busy}
            onClick={next}
            icon={step < 2 ? <ArrowRight className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          >
            {step < 2 ? 'Continue' : busy ? 'Creating…' : 'Create account'}
          </Button>
          {step === 0 && (
            <p className="mt-4 text-center text-sm text-ink-faint">
              Already registered?{' '}
              <button onClick={() => navigate('/login')} className="font-semibold text-pounamu-700">
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StepTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pounamu-100 text-pounamu-700">{icon}</span>
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
        <p className="text-sm text-ink-faint">{hint}</p>
      </div>
    </div>
  )
}
