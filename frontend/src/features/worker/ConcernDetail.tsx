import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Clock,
  Send,
  CheckCircle2,
  PlayCircle,
  ImageIcon,
  CalendarDays,
  CalendarCheck,
  Timer,
  ShieldCheck,
  EyeOff,
  X,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { Role } from '@/lib/types'
import { categoryById, promptById } from '@/lib/mockData'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Button, StatusBadge, Textarea, Badge, Select } from '@/components/ui'
import { ROLE_LABEL, USERS } from '@/lib/mockData'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'
import { resolveFileUrl } from '@/lib/api/client'

function formatHours(h?: number) {
  if (h == null) return '—'
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${h.toFixed(1)} h`
  return `${(h / 24).toFixed(1)} days`
}

export function ConcernDetail() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const { concerns, role, addAction, updateConcernStatus, closeConcern, prompts } = useApp()
  const [message, setMessage] = useState('')
  const [promptId, setPromptId] = useState('')
  const [riskReduction, setRiskReduction] = useState('')
  // Full-size photo viewer. Photos are data URLs, which browsers refuse to open
  // as a top-level tab, so we show them in an in-app lightbox instead.
  const [lightbox, setLightbox] = useState<string | null>(null)

  const concern = concerns.find((c) => c.ref === ref)
  if (!concern) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-xl text-ink">Concern not found</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    )
  }

  const cat = categoryById(concern.categoryId)
  const canRespond = role === 'supervisor' || role === 'admin'
  // Doc §4: worker may raise anonymously — the supervisor sees it flagged, not who.
  const reporterName = concern.reportedAnonymous ? 'Anonymous' : concern.reportedBy

  const risks = (concern.riskIds?.length ? concern.riskIds : [concern.categoryId])
    .map((id) => categoryById(id))
    .filter(Boolean)

  // One unified activity feed: original concern + every supervisor/worker update
  // + a synthesised "closed" event (closing doesn't create an action). Sorted
  // newest-first so the latest update sits at the top and the original concern
  // (oldest) sits at the bottom.
  type TimelineEvent = {
    id: string
    at: string
    name: string
    role: Role
    roleLabel: string
    message: string
    kind: 'concern' | 'update' | 'closed'
    anonymous?: boolean
  }
  const timeline: TimelineEvent[] = [
    {
      id: `concern-${concern.id}`,
      at: concern.reportedAt,
      name: reporterName,
      role: 'worker' as Role,
      roleLabel: ROLE_LABEL.worker,
      message: concern.description?.trim() || 'Raised this concern.',
      kind: 'concern' as const,
      anonymous: concern.reportedAnonymous,
    },
    ...concern.actions.map<TimelineEvent>((a) => ({
      id: a.id,
      at: a.at,
      name: a.author,
      role: a.role,
      roleLabel: ROLE_LABEL[a.role],
      message: a.message,
      kind: 'update',
    })),
    ...(concern.status === 'closed'
      ? [
          {
            id: `closed-${concern.id}`,
            at: concern.closedAtIso ?? concern.reportedAt,
            name: concern.assignedTo || ROLE_LABEL.supervisor,
            role: 'supervisor' as Role,
            roleLabel: ROLE_LABEL.supervisor,
            message: concern.riskReduction?.trim()
              ? `Reduction in risk: ${concern.riskReduction.trim()}`
              : 'The concern has been actioned and closed.',
            kind: 'closed' as const,
          },
        ]
      : []),
  ].sort((a, b) => {
    const dt = new Date(b.at).getTime() - new Date(a.at).getTime()
    if (dt !== 0) return dt
    // Tie-break: closing is terminal, so it stays on top; the original
    // concern is the origin, so it stays at the bottom.
    const rank = { closed: 2, update: 1, concern: 0 }
    return rank[b.kind] - rank[a.kind]
  })

  function respond() {
    const preset = promptById(promptId)
    const usingPreset = !message.trim() && !!promptId
    const text = message.trim() || preset?.label
    if (!text) return
    addAction(concern!.id, text, role, { promptId: usingPreset ? promptId : undefined })
    setMessage('')
    setPromptId('')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="focus-ring mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-soft ring-1 ring-black/5"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero — the risk-library image (doc §3: the control information workers see) */}
      <div className="relative h-40 overflow-hidden rounded-3xl bg-sand-200">
        {cat?.image ? (
          <img src={cat.image} alt={cat.label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink-faint">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
            {concern.ref}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <PageHeader title={cat?.label ?? 'Concern'} />
        <div className="-mt-3 mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={concern.status} />
          {risks.map((r) => (
            <Badge key={r!.id} tone="neutral">
              {r!.label}
            </Badge>
          ))}
          {concern.reportedAnonymous && <Badge tone="neutral">Anonymous</Badge>}
          {concern.offline && <Badge tone="clay">Pending sync</Badge>}
        </div>

        <div className="card p-5">
          {concern.description ? (
            <p className="text-ink-soft">{concern.description}</p>
          ) : (
            <p className="italic text-ink-faint">No extra detail was added.</p>
          )}

          {/* Worker-uploaded photos of the risk on site */}
          {concern.photos && concern.photos.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-faint">
                <ImageIcon className="h-4 w-4" /> Photos ({concern.photos.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {concern.photos.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox(resolveFileUrl(src))}
                    aria-label={`Open risk photo ${i + 1}`}
                    className="focus-ring block h-24 w-24 overflow-hidden rounded-xl ring-1 ring-black/5"
                  >
                    <img
                      src={resolveFileUrl(src)}
                      alt={`Risk photo ${i + 1}`}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-4 text-sm sm:grid-cols-3">
            <Meta icon={<User className="h-4 w-4" />} label="Reported by" value={reporterName} />
            <Meta icon={<Clock className="h-4 w-4" />} label="Reported" value={timeAgo(concern.reportedAt)} />
            {concern.assignedTo && (
              <Meta icon={<User className="h-4 w-4" />} label="Supervisor" value={concern.assignedTo} />
            )}
            {concern.sceneDate && (
              <Meta icon={<CalendarDays className="h-4 w-4" />} label="Noticed" value={concern.sceneDate} />
            )}
            {concern.closedAt && (
              <Meta icon={<CalendarCheck className="h-4 w-4" />} label="Closed" value={concern.closedAt} />
            )}
            {/* Doc §4: cycle-time metric */}
            {concern.status === 'closed' && concern.timeToCloseHours != null && (
              <Meta icon={<Timer className="h-4 w-4" />} label="Time to close" value={formatHours(concern.timeToCloseHours)} />
            )}
          </div>

          {/* Doc §4: the reduction in risk at the point of closing */}
          {concern.riskReduction && (
            <div className="mt-3 flex items-start gap-2 border-t border-black/5 pt-3 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pounamu-600" />
              <p className="text-ink-soft">
                <span className="font-semibold text-ink">Reduction in risk: </span>
                {concern.riskReduction}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Doc §4: once closed it stays closed — no reopening, editing or reassigning. */}
      {canRespond && concern.status === 'closed' && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-pounamu-50 px-5 py-4 text-sm font-medium text-pounamu-800 ring-1 ring-pounamu-100">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          This concern is closed. Closed concerns stay closed in V1.
        </div>
      )}

      {/* Supervisor actions */}
      {canRespond && concern.status !== 'closed' && (
        <div className="mt-4 card p-5">
          <p className="mb-3 font-display text-lg font-semibold text-ink">Respond</p>

          <label className="field-label">Quick prompt</label>
          <Select value={promptId} onChange={(e) => setPromptId(e.target.value)} className="mb-3">
            <option value="">Choose a preset response…</option>
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          <label className="field-label">Or write a message</label>
          <Textarea
            rows={3}
            placeholder="Add a corrective action or custom update for the worker…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {concern.status === 'open' && (
              <Button
                size="sm"
                variant="outline"
                icon={<PlayCircle className="h-4 w-4" />}
                onClick={() => updateConcernStatus(concern.id, 'in_progress')}
              >
                Mark in progress
              </Button>
            )}
            <Button className="ml-auto" icon={<Send className="h-4 w-4" />} disabled={!message.trim() && !promptId} onClick={respond}>
              Post update
            </Button>
          </div>

          {/* Close with the reduction-in-risk captured (doc §4) */}
          <div className="mt-5 border-t border-black/5 pt-4">
            <label className="field-label">Reduction in risk — what’s better now?</label>
            <Textarea
              rows={2}
              placeholder="e.g. Area isolated and spotter assigned — no one now passes through the swing zone."
              value={riskReduction}
              onChange={(e) => setRiskReduction(e.target.value)}
            />
            <div className="mt-3 flex justify-end">
              <Button
                variant="secondary"
                icon={<CheckCircle2 className="h-4 w-4" />}
                disabled={!riskReduction.trim()}
                onClick={() => closeConcern(concern.id, riskReduction)}
              >
                Close concern
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activity timeline — newest at top, original concern (oldest) at bottom */}
      <div className="mt-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Activity</h2>
        <ol className="relative space-y-5 border-l-2 border-sand-200 pl-6">
          {timeline.map((ev) => {
            const u = USERS[ev.role]
            const roleTone =
              ev.kind === 'closed'
                ? 'text-pounamu-700'
                : ev.role === 'worker'
                  ? 'text-kokowai-600'
                  : 'text-pounamu-600'
            return (
              <li key={ev.id} className="relative">
                {/* Single timeline node per event */}
                <span
                  className={cn(
                    'absolute -left-[31px] top-1 grid h-6 w-6 place-items-center rounded-full ring-2',
                    ev.kind === 'closed'
                      ? 'bg-pounamu-500 ring-white'
                      : ev.anonymous
                        ? 'bg-kokowai-500 ring-white'
                        : 'bg-white ring-sand-200',
                  )}
                >
                  {ev.kind === 'closed' ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : ev.anonymous ? (
                    <EyeOff className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                  )}
                </span>

                <div
                  className={cn(
                    'rounded-2xl p-4 ring-1',
                    ev.kind === 'closed'
                      ? 'bg-pounamu-50 ring-pounamu-100'
                      : ev.kind === 'concern'
                        ? 'bg-sand-50 ring-black/5'
                        : 'bg-white shadow-card ring-black/5',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-ink">{ev.name}</p>
                    <span className="shrink-0 text-xs text-ink-faint">{formatDateTime(ev.at)}</span>
                  </div>
                  <p className={cn('text-[11px] font-medium uppercase tracking-wide', roleTone)}>
                    {ev.kind === 'closed' ? `Closed · ${ev.roleLabel}` : ev.roleLabel}
                  </p>
                  {ev.kind === 'closed' && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-pounamu-800">
                      <ShieldCheck className="h-4 w-4 shrink-0" /> Concern resolved &amp; closed
                    </p>
                  )}
                  <p className="mt-2 text-sm text-ink-soft">{ev.message}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Full-size photo lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Risk photo"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close photo"
            className="focus-ring absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Risk photo"
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-float"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
        {icon}
        {label}
      </p>
      <p className="font-medium text-ink">{value}</p>
    </div>
  )
}
