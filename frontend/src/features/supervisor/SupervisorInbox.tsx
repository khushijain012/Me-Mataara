import { useMemo, useState } from 'react'
import { Inbox as InboxIcon, TriangleAlert, Clock, CheckCircle2, MessageSquareReply } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { ConcernStatus } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConcernCard } from '@/components/ConcernCard'
import { EmptyState } from '@/components/ui'
import { cn } from '@/lib/utils'

type Filter = 'all' | ConcernStatus

const TABS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'closed', label: 'Closed' },
]

export function SupervisorInbox() {
  const { concerns } = useApp()
  const [filter, setFilter] = useState<Filter>('all')

  const stats = useMemo(
    () => ({
      open: concerns.filter((c) => c.status === 'open').length,
      progress: concerns.filter((c) => c.status === 'in_progress').length,
      awaiting: concerns.filter((c) => c.status !== 'closed' && c.actions.length === 0).length,
      closed: concerns.filter((c) => c.status === 'closed').length,
    }),
    [concerns],
  )

  const list = useMemo(() => {
    const base = filter === 'all' ? concerns : concerns.filter((c) => c.status === filter)
    return [...base].sort((a, b) => {
      // Unresolved first, then most recent (doc §8: surface the event, no scoring).
      const aClosed = a.status === 'closed' ? 1 : 0
      const bClosed = b.status === 'closed' ? 1 : 0
      if (aClosed !== bClosed) return aClosed - bClosed
      return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    })
  }, [concerns, filter])

  return (
    <div>
      <PageHeader title="Concerns inbox" subtitle="What your crews have raised across the site" />

      {/* Stat tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<TriangleAlert className="h-5 w-5" />} label="Open" value={stats.open} tone="clay" />
        <Stat icon={<Clock className="h-5 w-5" />} label="In progress" value={stats.progress} tone="gold" />
        <Stat icon={<MessageSquareReply className="h-5 w-5" />} label="Awaiting reply" value={stats.awaiting} tone="red" />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Closed" value={stats.closed} tone="green" />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              filter === t.key ? 'bg-pounamu-600 text-white' : 'bg-white text-ink-soft ring-1 ring-black/5',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length > 0 ? (
        <div className="space-y-3">
          {list.map((c) => (
            <ConcernCard key={c.id} concern={c} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<InboxIcon className="h-10 w-10" />} title="All clear" hint="No concerns in this view right now." />
      )}
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'clay' | 'gold' | 'red' | 'green'
}) {
  const tones = {
    clay: 'bg-kokowai-100 text-kokowai-700',
    gold: 'bg-kowhai-400/20 text-sand-800',
    red: 'bg-red-100 text-red-700',
    green: 'bg-pounamu-100 text-pounamu-700',
  }
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5">
      <span className={cn('grid h-9 w-9 place-items-center rounded-lg', tones[tone])}>{icon}</span>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  )
}
