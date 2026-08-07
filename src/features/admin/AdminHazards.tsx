import { useRef, useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Image as ImageIcon, Check } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { HazardCategory } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Toggle, Input, Field } from '@/components/ui'
import { nextId } from '@/lib/utils'
import { cn } from '@/lib/utils'

// A neutral embedded placeholder image for newly added categories (no URL).
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#4f878f"/><text x="240" y="170" font-size="120" text-anchor="middle" dominant-baseline="central">🦺</text></svg>`,
  )

export function AdminHazards() {
  const { hazards, saveHazards } = useApp()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ label: '', maoriLabel: '', description: '' })
  const fileForRef = useRef<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function toggle(id: string, v: boolean) {
    saveHazards(hazards.map((c) => (c.id === id ? { ...c, active: v } : c)))
  }
  function move(id: string, dir: -1 | 1) {
    const i = hazards.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= hazards.length) return
    const next = [...hazards]
    ;[next[i], next[j]] = [next[j], next[i]]
    saveHazards(next)
  }
  function remove(id: string) {
    saveHazards(hazards.filter((c) => c.id !== id))
  }
  function updateField(id: string, patch: Partial<HazardCategory>) {
    saveHazards(hazards.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function addCategory() {
    if (!draft.label.trim()) return
    const cat: HazardCategory = {
      id: nextId('risk'),
      label: draft.label.trim(),
      maoriLabel: draft.maoriLabel.trim() || undefined,
      icon: 'TriangleAlert',
      image: PLACEHOLDER_IMAGE,
      description: draft.description.trim(),
      tint: 'pounamu',
      active: true,
    }
    saveHazards([...hazards, cat])
    setDraft({ label: '', maoriLabel: '', description: '' })
    setAdding(false)
  }

  // Real image upload — stored as an embedded data URL (BRD: no external links).
  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = fileForRef.current
    if (!file || !id) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 480
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        updateField(id, { image: canvas.toDataURL('image/jpeg', 0.8) })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div>
      <PageHeader
        title="Hazard categories"
        subtitle="Configure the risks (with images) workers can choose from — changes go live for kaimahi immediately"
        action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding((a) => !a)}>Add category</Button>}
      />

      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onImage} />

      {adding && (
        <div className="mb-4 card space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Label">
              <Input value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="e.g. Working at Height" />
            </Field>
            <Field label="Māori label (optional)">
              <Input value={draft.maoriLabel} onChange={(e) => setDraft((d) => ({ ...d, maoriLabel: e.target.value }))} placeholder="e.g. Teitei" />
            </Field>
          </div>
          <Field label="Description">
            <Input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Short description workers will see" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button icon={<Check className="h-4 w-4" />} disabled={!draft.label.trim()} onClick={addCategory}>Add</Button>
          </div>
        </div>
      )}

      <div className="space-y-3.5">
        {hazards.map((cat, i) => (
          <div
            key={cat.id}
            className={cn(
              'group overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-18px_rgba(45,66,71,0.35)]',
              !cat.active && 'opacity-70 grayscale-[0.35]',
            )}
          >
            <div className="flex items-start gap-3.5 p-3.5">
              {/* Thumbnail with depth + live-status dot */}
              <div className="relative shrink-0">
                <img
                  src={cat.image}
                  alt=""
                  className="h-[68px] w-[68px] rounded-2xl object-cover shadow-sm ring-1 ring-black/5"
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 via-transparent to-white/10 ring-1 ring-inset ring-black/10" />
                <span
                  className={cn(
                    'absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-2 border-white shadow-sm transition-colors',
                    cat.active ? 'bg-pounamu-500' : 'bg-sand-400',
                  )}
                  aria-hidden
                />
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1 pt-0.5">
                <input
                  value={cat.label}
                  onChange={(e) => updateField(cat.id, { label: e.target.value })}
                  aria-label={`Category name for ${cat.label}`}
                  className="focus-ring -mx-2 w-full truncate rounded-lg border border-transparent bg-transparent px-2 py-1 font-display text-[15px] font-semibold leading-tight text-ink outline-none transition-colors hover:bg-sand-50 focus:border-pounamu-500/40 focus:bg-white"
                />
                {cat.maoriLabel && (
                  <p className="mt-0.5 px-0 text-xs font-medium italic text-pounamu-600">{cat.maoriLabel}</p>
                )}
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-faint">{cat.description}</p>
              </div>

              {/* Live toggle */}
              <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
                <Toggle checked={cat.active} onChange={(v) => toggle(cat.id, v)} label={`Enable ${cat.label}`} />
                <span className={cn('text-[10px] font-semibold uppercase tracking-wide', cat.active ? 'text-pounamu-600' : 'text-ink-faint')}>
                  {cat.active ? 'Live' : 'Off'}
                </span>
              </div>
            </div>

            {/* Action footer */}
            <div className="flex items-center justify-between border-t border-black/5 bg-sand-50/60 px-2.5 py-1.5">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => move(cat.id, -1)}
                  disabled={i === 0}
                  className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition hover:bg-white hover:text-ink hover:shadow-sm disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:shadow-none"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(cat.id, 1)}
                  disabled={i === hazards.length - 1}
                  className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition hover:bg-white hover:text-ink hover:shadow-sm disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:shadow-none"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    fileForRef.current = cat.id
                    fileInput.current?.click()
                  }}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-white hover:text-pounamu-700 hover:shadow-sm"
                >
                  <ImageIcon className="h-4 w-4" /> Image
                </button>
                <button
                  onClick={() => remove(cat.id)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${cat.label}`}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-ink-faint">
        Categories appear to workers in the order above. Use the arrows to reorder, the toggle to hide, and “Image” to
        attach a reference photo (stored on-device, no external link).
      </p>
    </div>
  )
}
