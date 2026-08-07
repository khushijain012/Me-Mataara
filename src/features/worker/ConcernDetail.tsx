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
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { categoryById, promptById } from '@/lib/mockData'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Button, StatusBadge, Textarea, Badge, Select } from '@/components/ui'
import { ROLE_LABEL, USERS } from '@/lib/mockData'
import { formatDateTime, timeAgo } from '@/lib/utils'

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

      {/* Timeline */}
      <div className="mt-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Activity</h2>
        <ol className="relative space-y-5 border-l-2 border-sand-200 pl-6">
          {concern.actions.map((a) => {
            const u = USERS[a.role]
            return (
              <li key={a.id} className="relative">
                <span className="absolute -left-[31px] top-1 grid h-6 w-6 place-items-center rounded-full bg-white ring-2 ring-sand-200">
                  <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                </span>
                <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">{a.author}</p>
                    <span className="text-xs text-ink-faint">{formatDateTime(a.at)}</span>
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-pounamu-600">
                    {ROLE_LABEL[a.role]}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">{a.message}</p>
                  {/* Doc §4: which prompt/response was used */}
                  <span className="mt-2 inline-block">
                    <Badge tone={a.responseType === 'preset' ? 'green' : 'neutral'}>
                      {a.responseType === 'preset' ? 'Preset prompt' : 'Custom message'}
                    </Badge>
                  </span>
                </div>
              </li>
            )
          })}

          <li className="relative">
            <span className="absolute -left-[29px] top-1 h-4 w-4 rounded-full bg-kokowai-500 ring-2 ring-white" />
            <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{reporterName}</p>
                <span className="text-xs text-ink-faint">{formatDateTime(concern.reportedAt)}</span>
              </div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-kokowai-600">Raised the concern</p>
              {concern.description && <p className="mt-2 text-sm text-ink-soft">{concern.description}</p>}
            </div>
          </li>
        </ol>
      </div>
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
