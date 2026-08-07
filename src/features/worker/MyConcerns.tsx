import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus, CloudUpload } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { ConcernStatus } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConcernCard } from '@/components/ConcernCard'
import { Button, EmptyState } from '@/components/ui'
import { cn } from '@/lib/utils'

type Filter = 'all' | ConcernStatus

const TABS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'closed', label: 'Closed' },
]

export function MyConcerns() {
  const { displayName, concerns, online, syncOfflineConcerns } = useApp()
  const [filter, setFilter] = useState<Filter>('all')

  const mine = useMemo(
    () => concerns.filter((c) => c.reportedBy === displayName),
    [concerns, displayName],
  )
  const pending = mine.filter((c) => c.offline).length
  const filtered = filter === 'all' ? mine : mine.filter((c) => c.status === filter)

  return (
    <div>
      <PageHeader
        title="My concerns"
        subtitle="Everything you’ve raised and where it’s up to"
        action={
          <Link to="/report">
            <Button size="sm" icon={<Plus className="h-4 w-4" />}>
              New
            </Button>
          </Link>
        }
      />

      {pending > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-kokowai-100 px-4 py-3 text-sm text-kokowai-800">
          <span className="flex items-center gap-2 font-medium">
            <CloudUpload className="h-4 w-4" />
            {pending} report{pending > 1 ? 's' : ''} waiting to sync
          </span>
          {online && (
            <button onClick={syncOfflineConcerns} className="rounded-full bg-white px-3 py-1 font-semibold text-kokowai-700">
              Sync now
            </button>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = t.key === 'all' ? mine.length : mine.filter((c) => c.status === t.key).length
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                'focus-ring flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
                filter === t.key ? 'bg-pounamu-600 text-white' : 'bg-white text-ink-soft ring-1 ring-black/5',
              )}
            >
              {t.label}
              <span className={cn('rounded-full px-1.5 text-xs', filter === t.key ? 'bg-white/20' : 'bg-sand-100')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ConcernCard key={c.id} concern={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="Nothing here yet"
          hint="When you raise a concern it’ll show up here so you can track the response."
          action={
            <Link to="/report">
              <Button icon={<Plus className="h-4 w-4" />}>Something isn’t right</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
