import { Link } from 'react-router-dom'
import { User, EyeOff, MessageSquare, CloudUpload, ShieldCheck, Timer, HardDriveDownload } from 'lucide-react'
import type { Concern } from '@/lib/types'
import { categoryById } from '@/lib/mockData'
import { HazardIcon } from '@/components/HazardIcon'
import { StatusBadge } from '@/components/ui'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'

function formatHours(h?: number) {
  if (h == null) return null
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${h.toFixed(1)} h`
  return `${(h / 24).toFixed(1)} days`
}

// Coloured node per status / capture state.
function dotClass(c: Concern) {
  if (c.offline || c.captureStatus === 'queued') return 'bg-kokowai-500'
  if (c.status === 'closed') return 'bg-pounamu-500'
  if (c.status === 'in_progress') return 'bg-kowhai-500'
  return 'bg-kokowai-400'
}

function CaptureChip({ c }: { c: Concern }) {
  if (c.offline || c.captureStatus === 'queued') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-kokowai-100 px-2 py-0.5 text-[10px] font-bold text-kokowai-800">
        <HardDriveDownload className="h-3 w-3" /> Saved on device · pending sync
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pounamu-50 px-2 py-0.5 text-[10px] font-bold text-pounamu-700">
      <CloudUpload className="h-3 w-3" /> Synced
    </span>
  )
}

export function ReportTimeline({ concerns }: { concerns: Concern[] }) {
  if (concerns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 px-6 py-10 text-center text-sm text-ink-faint">
        No reports yet. When you raise a concern it’ll appear here with its full history.
      </div>
    )
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-sand-200 pl-6">
      {concerns.map((c) => {
        const cat = categoryById(c.categoryId)
        const risks = (c.riskIds?.length ? c.riskIds : [c.categoryId])
          .map((id) => categoryById(id)?.label)
          .filter(Boolean)
        const ttc = formatHours(c.timeToCloseHours)
        return (
          <li key={c.id} className="relative">
            {/* node */}
            <span className={cn('absolute -left-[31px] top-1.5 grid h-5 w-5 place-items-center rounded-full ring-4 ring-sand-50', dotClass(c))}>
              <HazardIcon name={cat?.icon ?? ''} className="h-3 w-3 text-white" />
            </span>

            <Link
              to={`/concern/${c.ref}`}
              className="focus-ring block rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5 transition hover:shadow-float"
            >
              {/* header: ref + risk + status */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-bold text-pounamu-600">{c.ref}</span>
                    <span className="text-ink-faint">·</span>
                    <span className="truncate text-ink-faint">{risks.join(', ')}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 font-semibold leading-snug text-ink">{cat?.label}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>

              {/* who + when */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                <span className="inline-flex items-center gap-1">
                  {c.reportedAnonymous ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Anonymous</>
                  ) : (
                    <><User className="h-3.5 w-3.5" /> {c.reportedBy}</>
                  )}
                </span>
                <span title={formatDateTime(c.reportedAt)}>Reported {timeAgo(c.reportedAt)}</span>
              </div>

              {/* exact created time + capture/backup state */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                <span>{formatDateTime(c.reportedAt)}</span>
                <CaptureChip c={c} />
              </div>

              {/* footer: responses, closure cycle-time + reduction in risk */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-black/5 pt-2.5 text-xs text-ink-faint">
                {c.actions.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> {c.actions.length} response{c.actions.length > 1 ? 's' : ''}
                  </span>
                )}
                {c.status === 'closed' && (
                  <>
                    {ttc && (
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" /> Closed in {ttc}
                      </span>
                    )}
                    {c.riskReduction && (
                      <span className="inline-flex items-center gap-1 text-pounamu-700">
                        <ShieldCheck className="h-3.5 w-3.5" /> Risk reduced
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
