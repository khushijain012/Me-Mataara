import { useMemo, useState } from 'react'
import { UserPlus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Badge, Button, Input } from '@/components/ui'

interface Row {
  id: string
  name: string
  initials: string
  color: string
  role: string
  crew: string
  site: string
  status: 'active' | 'invited' | 'inactive' | 'pending'
}

const INITIAL_ROWS: Row[] = [
  { id: 'u-tw', name: 'Te Ariki Wharekura', initials: 'TW', color: 'bg-pounamu-600', role: 'Worker', crew: 'Civil Crew 3', site: 'Waterview', status: 'active' },
  { id: 'u-sl', name: 'Sef Latu', initials: 'SL', color: 'bg-kokowai-500', role: 'Worker', crew: 'Civil Crew 3', site: 'Waterview', status: 'active' },
  { id: 'u-pn', name: 'Priya Nair', initials: 'PN', color: 'bg-mustard-600', role: 'Worker', crew: 'Concrete', site: 'Waterview', status: 'active' },
  { id: 'u-mt', name: 'Mia Tanuvasa', initials: 'MT', color: 'bg-kokowai-600', role: 'Supervisor', crew: 'Site Supervision', site: 'Waterview', status: 'active' },
  { id: 'u-dk', name: 'Daniel Kohu', initials: 'DK', color: 'bg-sand-600', role: 'Supervisor', crew: 'Plant & Concrete', site: 'Waterview', status: 'pending' },
  { id: 'u-je', name: 'Jordan Ellis', initials: 'JE', color: 'bg-pounamu-500', role: 'Worker', crew: 'Traffic', site: 'Waterview', status: 'invited' },
  { id: 'u-wr', name: 'Wiremu Ropata', initials: 'WR', color: 'bg-ink', role: 'Worker', crew: 'Plant', site: 'Waterview', status: 'inactive' },
]

const STATUS_TONE = { active: 'green', invited: 'gold', inactive: 'neutral', pending: 'clay' } as const
const STATUS_LABEL: Record<Row['status'], string> = {
  active: 'active',
  invited: 'invited',
  inactive: 'inactive',
  pending: 'awaiting approval',
}

export function AdminUsers() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  )
  const allShownSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) => {
      if (allShownSelected) {
        const next = new Set(prev)
        filtered.forEach((r) => next.delete(r.id))
        return next
      }
      return new Set([...prev, ...filtered.map((r) => r.id)])
    })
  }
  function bulkDelete() {
    setRows((prev) => prev.filter((r) => !selected.has(r.id)))
    setSelected(new Set())
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage workers and supervisors — including bulk removal"
        action={<Button icon={<UserPlus className="h-4 w-4" />}>Invite user</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input className="pl-10" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-kokowai-50 px-4 py-2 ring-1 ring-kokowai-100">
            <span className="text-sm font-semibold text-kokowai-800">{selected.size} selected</span>
            <Button size="sm" variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={bulkDelete}>
              Delete selected
            </Button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-sand-50 text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                    className="h-4 w-4 accent-pounamu-600"
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Crew</th>
                <th className="px-5 py-3 font-semibold">Site</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((r) => (
                <tr key={r.id} className={selected.has(r.id) ? 'bg-pounamu-50/50' : 'hover:bg-sand-50/50'}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select ${r.name}`}
                      className="h-4 w-4 accent-pounamu-600"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={r.initials} color={r.color} size="sm" />
                      <span className="font-medium text-ink">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{r.role}</td>
                  <td className="px-5 py-3 text-ink-soft">{r.crew}</td>
                  <td className="px-5 py-3 text-ink-soft">{r.site}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[r.status]} className="capitalize">
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-ink-faint">
                    No users match “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
