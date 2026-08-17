import { useRef, useState } from 'react'
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
  Camera,
  ImagePlus,
  X,
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
  const [photos, setPhotos] = useState<string[]>([])
  const [sceneDate, setSceneDate] = useState(new Date().toISOString().slice(0, 10))
  const [anonymous, setAnonymous] = useState(false)
  const [createdRef, setCreatedRef] = useState<string | null>(null)

  const canNext = step === 0 ? riskIds.length > 0 : true

  function toggleRisk(id: string) {
    setRiskIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (submitting) return
    // Ask once (on this user gesture) so supervisor alerts can be shown.
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission()
      }
    } catch {
      /* ignore */
    }
    setSubmitting(true)
    try {
      const c = await addConcern({
        categoryId: riskIds[0],
        riskIds,
        description: description.trim(),
        photos,
        sceneDate,
        reportedAnonymous: anonymous,
        offline: !online,
      })
      setCreatedRef(c.ref)
      setStep(3)
    } finally {
      setSubmitting(false)
    }
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
          <Field label="Add photos" hint="Optional — a picture of the risk on site helps your supervisor act.">
            <PhotoUpload photos={photos} onChange={setPhotos} />
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
              <Row label="Photos" value={photos.length ? `${photos.length} attached` : 'None'} />
            </dl>
            {photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {photos.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Risk photo ${i + 1}`}
                    className="h-16 w-16 rounded-lg object-cover ring-1 ring-black/5"
                  />
                ))}
              </div>
            )}
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
          <Button block size="lg" variant="secondary" onClick={submit} disabled={submitting} icon={online ? <Send className="h-5 w-5" /> : <CloudUpload className="h-5 w-5" />}>
            {submitting ? 'Sending…' : online ? 'Send to supervisor' : 'Save offline'}
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

const MAX_PHOTOS = 6

function PhotoUpload({ photos, onChange }: { photos: string[]; onChange: (next: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const remaining = MAX_PHOTOS - photos.length

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setBusy(true)
    try {
      const files = Array.from(fileList)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, remaining)
      const added = await Promise.all(files.map((f) => fileToResizedDataUrl(f)))
      onChange([...photos, ...added])
    } catch {
      /* skip unreadable images */
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-black/5">
            <img src={src} alt={`Risk photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              aria-label={`Remove photo ${i + 1}`}
              className="focus-ring absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white hover:bg-black/70"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="focus-ring grid h-20 w-20 place-items-center rounded-xl border-2 border-dashed border-sand-300 bg-white text-ink-faint transition-colors hover:border-pounamu-400 hover:text-pounamu-600 disabled:opacity-60"
          >
            {busy ? (
              <span className="text-xs font-medium">Adding…</span>
            ) : (
              <span className="flex flex-col items-center gap-1">
                {photos.length ? <ImagePlus className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                <span className="text-[11px] font-semibold">{photos.length ? 'Add' : 'Add photo'}</span>
              </span>
            )}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        {photos.length}/{MAX_PHOTOS} added — take a photo or choose from your gallery.
      </p>
    </div>
  )
}

// Downscale on-device so photos stay small in offline storage (localStorage).
async function fileToResizedDataUrl(file: File, max = 1280, quality = 0.7): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}
