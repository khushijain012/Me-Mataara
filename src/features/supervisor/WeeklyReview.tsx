import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, Timer, CheckCircle2, MessageSquareReply, ChevronRight, EyeOff, UserPlus } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { categoryById, CREW } from '@/lib/mockData'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionTitle, StatusBadge, Avatar } from '@/components/ui'
import { cn, timeAgo } from '@/lib/utils'

const TOOLTIP = {
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 12px 40px -12px rgba(45,66,71,0.35)',
  fontSize: 13,
}

const FOUR_WEEKS_MS = 28 * 24 * 3600 * 1000

export function WeeklyReview() {
  const { concerns, user } = useApp()

  // Doc: the supervisor sees their claimed crew; unclaimed workers stay visible
  // so the gaps can be chased.
  const myCrew = CREW.filter((c) => c.supervisorId === user.id)
  const unclaimed = CREW.filter((c) => c.supervisorId === null)

  // Doc: supervisor toolbox view = a rolling four-week window, most recent first.
  const recent = useMemo(() => {
    const cutoff = Date.now() - FOUR_WEEKS_MS
    return concerns
      .filter((c) => new Date(c.reportedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
  }, [concerns])

  // Aggregate risk selections across the window (which risks keep coming up).
  const byRisk = useMemo(() => {
    const counts: Record<string, number> = {}
    recent.forEach((c) => (c.riskIds?.length ? c.riskIds : [c.categoryId]).forEach((r) => (counts[r] = (counts[r] ?? 0) + 1)))
    return Object.entries(counts)
      .map(([id, value]) => ({ name: categoryById(id)?.label ?? id, value }))
      .sort((a, b) => b.value - a.value)
  }, [recent])

  const raised = recent.length
  const closed = recent.filter((c) => c.status === 'closed').length

  // Doc: capture the cycle-time metric — average time to close.
  const avgTimeToClose = useMemo(() => {
    const times = recent.filter((c) => c.status === 'closed' && c.timeToCloseHours != null).map((c) => c.timeToCloseHours!)
    if (!times.length) return null
    return times.reduce((a, b) => a + b, 0) / times.length
  }, [recent])

  // Doc: "how long the supervisor took to respond" — first-response responsiveness.
  const respondedPct = useMemo(() => {
    if (!raised) return null
    const responded = recent.filter((c) => c.actions.length > 0).length
    return Math.round((responded / raised) * 100)
  }, [recent, raised])

  return (
    <div>
      <PageHeader title="Toolbox" subtitle="The last four weeks — ready to talk through with your crew" />

      {/* Signals */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Signal icon={<TrendingUp className="h-5 w-5" />} label="Raised (4 wks)" value={`${raised}`} tone="clay" />
        <Signal icon={<CheckCircle2 className="h-5 w-5" />} label="Closed" value={`${closed}`} tone="green" />
        <Signal
          icon={<Timer className="h-5 w-5" />}
          label="Avg. time to close"
          value={avgTimeToClose == null ? '—' : avgTimeToClose < 48 ? `${avgTimeToClose.toFixed(1)}h` : `${(avgTimeToClose / 24).toFixed(1)}d`}
          tone="gold"
        />
        <Signal icon={<MessageSquareReply className="h-5 w-5" />} label="Responded to" value={respondedPct == null ? '—' : `${respondedPct}%`} tone="green" />
      </div>

      {/* My crew — claimed workers + unclaimed to chase */}
      <div className="mb-4 card p-5">
        <SectionTitle>My crew</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {myCrew.map((c) => (
            <span key={c.name} className="inline-flex items-center gap-2 rounded-full bg-sand-100 py-1 pl-1 pr-3">
              <Avatar initials={c.initials} color={c.color} size="sm" />
              <span className="text-sm font-medium text-ink">{c.name}</span>
            </span>
          ))}
          {!myCrew.length && <p className="text-sm text-ink-faint">No workers have claimed you yet.</p>}
        </div>
        {unclaimed.length > 0 && (
          <div className="mt-4 rounded-xl bg-mustard-50 px-4 py-3 ring-1 ring-mustard-100">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-mustard-700">
              <UserPlus className="h-4 w-4" /> {unclaimed.length} unclaimed worker{unclaimed.length > 1 ? 's' : ''} to chase
            </p>
            <p className="mt-1 text-sm text-ink-soft">{unclaimed.map((c) => c.name).join(', ')} haven’t claimed a supervisor yet.</p>
          </div>
        )}
      </div>

      {/* What keeps coming up */}
      <div className="mb-4 card p-5">
        <SectionTitle>What your crews keep noticing</SectionTitle>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byRisk} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dae2e2" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#8a8984' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#8a8984' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(79,135,143,0.06)' }} />
              <Bar dataKey="value" name="Concerns" radius={[0, 6, 6, 0]} fill="#4f878f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toolbox list — most recent first, with image + response, to talk through */}
      <SectionTitle>Talk through with the crew</SectionTitle>
      <div className="space-y-3">
        {recent.map((c) => {
          const cat = categoryById(c.categoryId)
          const lastResponse = c.actions[c.actions.length - 1]
          return (
            <Link
              key={c.id}
              to={`/concern/${c.ref}`}
              className="focus-ring group flex gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-black/5 transition hover:shadow-float"
            >
              {/* Risk-library image — the control information the worker saw */}
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-200">
                {cat?.image && (
                  <img src={cat.image} alt={cat?.label ?? 'Risk'} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-ink-faint">{c.ref}</span>
                  <span className="text-xs text-ink-faint">· {timeAgo(c.reportedAt)}</span>
                </div>
                <p className="mt-1 truncate font-semibold text-ink">{cat?.label ?? 'Risk'}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
                  {c.reportedAnonymous ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Anonymous</>
                  ) : (
                    <>By {c.reportedBy}</>
                  )}
                </p>
                {lastResponse ? (
                  <p className="mt-1 line-clamp-1 text-sm text-pounamu-800">
                    <MessageSquareReply className="mr-1 inline h-3.5 w-3.5" />
                    {lastResponse.message}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-medium text-kokowai-700">Awaiting your response</p>
                )}
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 self-center text-ink-faint transition group-hover:translate-x-0.5" />
            </Link>
          )
        })}
        {!recent.length && (
          <div className="card p-8 text-center text-sm text-ink-faint">
            No concerns raised in the last four weeks.
          </div>
        )}
      </div>
    </div>
  )
}

function Signal({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'clay' | 'gold' | 'green'
}) {
  const tones = {
    clay: 'bg-kokowai-100 text-kokowai-700',
    gold: 'bg-mustard-100 text-mustard-700',
    green: 'bg-pounamu-100 text-pounamu-700',
  }
  return (
    <div className="card p-4">
      <span className={cn('grid h-9 w-9 place-items-center rounded-lg', tones[tone])}>{icon}</span>
      <p className="mt-3 font-display text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  )
}
