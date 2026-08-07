import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  Send,
  EyeOff,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Button, Field, Input, Textarea, ProgressBar, Toggle } from '@/components/ui'
import { cn } from '@/lib/utils'

export function HazardReport() {
  const navigate = useNavigate()
  const { addConcern, online, hazards } = useApp()
  const [step, setStep] = useState(0)
  const [riskIds, setRiskIds] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [sceneDate, setSceneDate] = useState(new Date().toISOString().slice(0, 10))
  const [anonymous, setAnonymous] = useState(false)
  const [createdRef, setCreatedRef] = useState<string | null>(null)

  const canNext = step === 0 ? riskIds.length > 0 : true

  function toggleRisk(id: string) {
    setRiskIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  function submit() {
    // Ask once (on this user gesture) so supervisor alerts can be shown.
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission()
      }
    } catch {
      /* ignore */
    }
    const c = addConcern({
      categoryId: riskIds[0],
      riskIds,
      description: description.trim(),
      sceneDate,
      reportedAnonymous: anonymous,
      offline: !online,
    })
    setCreatedRef(c.ref)
    setStep(3)
  }

  /* ------------------------------------------------------------ success */
  if (step === 3 && createdRef) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-pounamu-500 to-pounamu-700 p-8 text-white shadow-float">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/15">
            <CheckCircle2 className="h-11 w-11" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Sent to your supervisor</h1>
          <p className="mt-2 text-sm text-white/90">
            Reference <span className="font-bold">{createdRef}</span>
          </p>
          {online ? (
            <p className="mx-auto mt-3 max-w-sm text-sm text-white/90">
              Your supervisor has been notified and will respond. You’ll see updates on your concern.
            </p>
          ) : (
            <div className="mx-auto mt-4 flex max-w-xs items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm">
              <CloudUpload className="h-5 w-5 shrink-0" />
              Saved on your device. It’ll sync automatically when you’re back online.
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={() => navigate(`/concern/${createdRef}`)}>
            View concern
          </Button>
          <Button size="lg" onClick={() => navigate('/')}>
            Done
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => (step === 0 ? navigate('/') : setStep((s) => s - 1))}
          className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-black/5"
        >
          <ArrowLeft className="h-5 w-5 text-ink-soft" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-ink">Something isn’t right</h1>
          <ProgressBar value={((step + 1) / 3) * 100} className="mt-2" />
        </div>
        <span className="text-sm font-semibold text-ink-faint">{step + 1}/3</span>
      </div>

      {!online && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-kokowai-100 px-4 py-2.5 text-sm font-medium text-kokowai-800">
          <CloudUpload className="h-4 w-4" />
          You’re offline — this report will be saved and synced later.
        </div>
      )}

      {/* Step 0: risks (multi-select with images + nickname) */}
      {step === 0 && (
        <div className="animate-fade-in">
          <p className="mb-1 font-semibold text-ink-soft">Choose the risk(s) that match</p>
          <p className="mb-3 text-sm text-ink-faint">You can pick more than one.</p>
          <div className="grid grid-cols-2 gap-3">
            {hazards.filter((c) => c.active).map((cat) => {
              const active = riskIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleRisk(cat.id)}
                  aria-pressed={active}
                  className={cn(
                    'focus-ring group overflow-hidden rounded-2xl bg-white text-left ring-1 transition-all duration-150',
                    active
                      ? 'ring-2 ring-pounamu-600 shadow-card'
                      : 'ring-black/5 shadow-sm hover:-translate-y-0.5 hover:shadow-card',
                  )}
                >
                  <span className="relative block h-24 w-full">
                    <img src={cat.image} alt={cat.label} className="h-full w-full object-cover" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    {cat.maoriLabel && (
                      <span className="absolute bottom-1.5 left-2 text-xs font-bold text-white drop-shadow">
                        {cat.maoriLabel}
                      </span>
                    )}
                    <span
                      className={cn(
                        'absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full border transition-colors',
                        active ? 'border-white bg-pounamu-600 text-white' : 'border-white/70 bg-black/20 text-transparent',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="block px-3 py-2 text-sm font-semibold leading-tight text-ink">{cat.label}</span>
                </button>
              )
            })}
          </div>
          {riskIds.length > 0 && (
            <p className="mt-3 text-sm font-medium text-pounamu-700">{riskIds.length} risk{riskIds.length > 1 ? 's' : ''} selected</p>
          )}
        </div>
      )}

      {/* Step 1: a little detail (optional) */}
      {step === 1 && (
        <div className="animate-fade-in space-y-4">
          <Field label="Anything to add?" hint="Optional — a short note helps your supervisor act.">
            <Textarea rows={4} placeholder="Describe what you saw…" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="When did you notice it?">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input type="date" className="pl-10" value={sceneDate} onChange={(e) => setSceneDate(e.target.value)} />
            </div>
          </Field>
        </div>
      )}

      {/* Step 2: review + anonymous */}
      {step === 2 && (
        <div className="animate-fade-in space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <p className="mb-3 font-display text-lg font-semibold text-ink">Review</p>
            <dl className="space-y-2 text-sm">
              <Row label="Risks" value={riskIds.map((r) => hazards.find((c) => c.id === r)?.label).join(', ') || '—'} />
              <Row label="Noticed" value={sceneDate} />
              {description.trim() && <Row label="Note" value={description.trim()} />}
            </dl>
          </div>

          {/* Doc §4: worker may choose to raise the concern anonymously. */}
          <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5">
            <div className="flex items-start gap-3 pr-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sand-100 text-ink-soft">
                <EyeOff className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-ink">Raise this anonymously</p>
                <p className="text-sm text-ink-faint">Your supervisor sees the concern and responds, but not your name.</p>
              </div>
            </div>
            <Toggle checked={anonymous} onChange={setAnonymous} label="Anonymous" />
          </div>
        </div>
      )}

      {/* footer */}
      <div className="mt-6">
        {step < 2 ? (
          <Button block size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)} icon={<ArrowRight className="h-5 w-5" />}>
            Continue
          </Button>
        ) : (
          <Button block size="lg" variant="secondary" onClick={submit} icon={online ? <Send className="h-5 w-5" /> : <CloudUpload className="h-5 w-5" />}>
            {online ? 'Send to supervisor' : 'Save offline'}
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}
