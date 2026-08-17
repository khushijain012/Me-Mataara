import { Link } from 'react-router-dom'
import { MessageSquare, CloudUpload, EyeOff } from 'lucide-react'
import type { Concern } from '@/lib/types'
import { categoryById } from '@/lib/mockData'
import { StatusBadge } from './ui'
import { timeAgo } from '@/lib/utils'

export function ConcernCard({ concern }: { concern: Concern }) {
  const cat = categoryById(concern.categoryId)
  return (
    <Link
      to={`/concern/${concern.ref}`}
      className="focus-ring group block overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5 transition hover:shadow-float"
    >
      <div className="flex gap-3 p-4">
        {/* The risk-library image (doc §3: the control information workers see) */}
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10">
          {cat?.image && <img src={cat.image} alt="" className="h-full w-full object-cover" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-pounamu-600">{concern.ref}</span>
            <span className="text-xs text-ink-faint">·</span>
            <span className="truncate text-xs text-ink-faint">{cat?.label}</span>
            {concern.offline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-kokowai-100 px-2 py-0.5 text-[10px] font-bold text-kokowai-800">
                <CloudUpload className="h-3 w-3" /> Pending sync
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 font-semibold leading-snug text-ink">{cat?.label}</p>
          {concern.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-ink-faint">{concern.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
            {concern.reportedAnonymous && (
              <span className="inline-flex items-center gap-1">
                <EyeOff className="h-3.5 w-3.5" /> Anonymous
              </span>
            )}
            {concern.actions.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {concern.actions.length}
              </span>
            )}
            <span>{timeAgo(concern.reportedAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-black/5 bg-sand-50/60 px-4 py-2.5">
        <StatusBadge status={concern.status} />
        {concern.timeToCloseHours != null && (
          <span className="text-xs font-medium text-ink-faint">
            Closed in {concern.timeToCloseHours < 48 ? `${concern.timeToCloseHours}h` : `${(concern.timeToCloseHours / 24).toFixed(1)}d`}
          </span>
        )}
      </div>
    </Link>
  )
}
