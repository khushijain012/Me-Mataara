import { useRef, useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Image as ImageIcon, Check, Pencil, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { HazardCategory } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Toggle, Input, Textarea, Field } from '@/components/ui'
import { nextId } from '@/lib/utils'
import { cn } from '@/lib/utils'

// A neutral embedded placeholder image for newly added categories (no URL).
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#4f878f"/><text x="240" y="170" font-size="120" text-anchor="middle" dominant-baseline="central">🦺</text></svg>`,
  )

// Shared: read a picked file, downscale it, and return an embedded data URL
// (BRD: images are stored on-device, never as external links).
function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => {
        const max = 480
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function AdminHazards() {
  const { hazards, saveHazards } = useApp()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ label: '', maoriLabel: '', description: '' })
  // The category currently being edited in the modal (a working copy / draft).
  const [editDraft, setEditDraft] = useState<HazardCategory | null>(null)

  const fileForRef = useRef<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null) // footer quick-swap image
  const editFileInput = useRef<HTMLInputElement>(null) // modal image change

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

  // ── Edit modal ──────────────────────────────────────────────────────────
  function openEdit(cat: HazardCategory) {
    setEditDraft({ ...cat }) // work on a copy; commit only on Save
  }
  function patchEdit(patch: Partial<HazardCategory>) {
    setEditDraft((d) => (d ? { ...d, ...patch } : d))
  }
  function saveEdit() {
    if (!editDraft || !editDraft.label.trim()) return
    const cleaned: HazardCategory = {
      ...editDraft,
      label: editDraft.label.trim(),
      maoriLabel: editDraft.maoriLabel?.trim() || undefined,
      description: editDraft.description.trim(),
    }
    saveHazards(hazards.map((c) => (c.id === cleaned.id ? cleaned : c)))
    setEditDraft(null)
  }

  // Footer quick image swap — writes straight to the store.
  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = fileForRef.current
    e.target.value = ''
    if (!file || !id) return
    updateField(id, { image: await processImageFile(file) })
  }
  // Modal image change — updates the working draft, saved with the form.
  async function onEditImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    patchEdit({ image: await processImageFile(file) })
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

              {/* Body — title is now display-only; use Edit to change details */}
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="truncate font-display text-[15px] font-semibold leading-tight text-ink">
                  {cat.label}
                </h3>
                {cat.maoriLabel && (
                  <p className="mt-0.5 text-xs font-medium italic text-pounamu-600">{cat.maoriLabel}</p>
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
                  onClick={() => openEdit(cat)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-white hover:text-pounamu-700 hover:shadow-sm"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
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
        Categories appear to workers in the order above. Use the arrows to reorder, “Edit” to change
        the details, and the toggle to hide a category from the report flow.
      </p>

      {/* ── Edit modal ─────────────────────────────────────────────────── */}
      {editDraft && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editDraft.label || 'category'}`}
          onClick={() => setEditDraft(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-t-3xl bg-white p-5 shadow-float ring-1 ring-black/5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Edit category</h2>
              <button
                onClick={() => setEditDraft(null)}
                className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition hover:bg-sand-100 hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Category name">
                <Input
                  value={editDraft.label}
                  onChange={(e) => patchEdit({ label: e.target.value })}
                  placeholder="e.g. Working at Height"
                />
              </Field>
              <Field label="Māori / te reo name (optional)">
                <Input
                  value={editDraft.maoriLabel ?? ''}
                  onChange={(e) => patchEdit({ maoriLabel: e.target.value })}
                  placeholder="e.g. Teitei"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  rows={3}
                  value={editDraft.description}
                  onChange={(e) => patchEdit({ description: e.target.value })}
                  placeholder="Short description workers will see"
                />
              </Field>

              {/* Hazard image */}
              <div>
                <span className="field-label">Hazard image</span>
                <div className="flex items-center gap-3">
                  <img
                    src={editDraft.image}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-black/5"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ImageIcon className="h-4 w-4" />}
                    onClick={() => editFileInput.current?.click()}
                  >
                    Change image
                  </Button>
                  <input
                    ref={editFileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onEditImage}
                  />
                </div>
              </div>

              {/* Live status */}
              <div className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Live for workers</p>
                  <p className="text-xs text-ink-faint">Shown in the report flow when on.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle checked={editDraft.active} onChange={(v) => patchEdit({ active: v })} label="Active status" />
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wide', editDraft.active ? 'text-pounamu-600' : 'text-ink-faint')}>
                    {editDraft.active ? 'Live' : 'Off'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditDraft(null)}>Cancel</Button>
              <Button
                icon={<Check className="h-4 w-4" />}
                disabled={!editDraft.label.trim()}
                onClick={saveEdit}
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
