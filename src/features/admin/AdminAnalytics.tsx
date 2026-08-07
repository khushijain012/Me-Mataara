import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Building2, Users, TriangleAlert, Timer, FileText, FileSpreadsheet, Printer, ChevronDown, ChevronRight, ShieldCheck, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionTitle, Badge } from '@/components/ui'
import { useApp } from '@/context/AppContext'
import { ORGANISATIONS, CATEGORY_BREAKDOWN } from '@/lib/mockData'
import { cn } from '@/lib/utils'

const TOOLTIP = {
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 12px 40px -12px rgba(45,66,71,0.35)',
  fontSize: 13,
}

// Illustrative drill-down: the users registered against each NZBN business.
// (Demographics are deliberately NOT shown per-user — aggregates only.)
const ORG_USERS: Record<string, { name: string; role: string; crew: string }[]> = {
  '9429041902546': [
    { name: 'Te Ariki Wharekura', role: 'Worker', crew: 'Civil Crew 3' },
    { name: 'Sef Latu', role: 'Worker', crew: 'Civil Crew 3' },
    { name: 'Mia Tanuvasa', role: 'Supervisor', crew: 'Site Supervision' },
  ],
  '9429037561208': [
    { name: 'Priya Nair', role: 'Worker', crew: 'Concrete' },
    { name: 'Jordan Ellis', role: 'Worker', crew: 'Traffic' },
  ],
  '9429048820137': [{ name: 'Wiremu Ropata', role: 'Worker', crew: 'Plant' }],
}

// Aggregate-only demographics (doc: no individual-level demographic data visible
// to anyone, including the platform owner — only a split or an average band).
const GENDER_SPLIT = [
  { name: 'Female', value: 38, color: '#4f878f' },
  { name: 'Male', value: 57, color: '#404040' },
  { name: 'Gender diverse', value: 3, color: '#caa545' },
  { name: 'Prefer not to say', value: 2, color: '#bab9b4' },
]
const AVG_AGE_BAND = '35 – 52'

function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type Grid = (string | number)[][]

// Doc: CSV as the minimum, with PDF and Excel added where we reasonably can.
function toCsv(rows: Grid) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}
// Excel opens an HTML table saved as .xls — a dependency-free export.
function toXlsHtml(rows: Grid) {
  const body = rows
    .map((r, i) => `<tr>${r.map((c) => `<t${i ? 'd' : 'h'}>${c}</t${i ? 'd' : 'h'}>`).join('')}</tr>`)
    .join('')
  return `<html><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`
}

export function AdminAnalytics() {
  const { concerns } = useApp()
  const [open, setOpen] = useState<string | null>(null)
  const [orgs, setOrgs] = useState(ORGANISATIONS)

  const totalUsers = orgs.reduce((a, o) => a + o.workers, 0)
  const closed = concerns.filter((c) => c.status === 'closed' && c.timeToCloseHours != null)
  const avgClose = closed.length ? closed.reduce((a, c) => a + c.timeToCloseHours!, 0) / closed.length : null

  const grid: Grid = [
    ['Business', 'NZBN', 'Users', 'Sites', 'Adoption %'],
    ...orgs.map((o) => [o.name, o.nzbn, o.workers, o.sites, o.adoption]),
  ]
  const exportCsv = () => download('nqr-businesses.csv', toCsv(grid), 'text/csv')
  const exportXls = () => download('nqr-businesses.xls', toXlsHtml(grid), 'application/vnd.ms-excel')
  const exportPdf = () => window.print() // print-to-PDF of the dashboard

  // Doc: bulk deletion of whole companies to manage businesses en-masse.
  const deleteOrg = (nzbn: string) => {
    setOrgs((prev) => prev.filter((o) => o.nzbn !== nzbn))
    setOpen((o) => (o === nzbn ? null : o))
  }

  const tiles = [
    { icon: <Building2 className="h-5 w-5" />, label: 'NZBN businesses', value: orgs.length, tone: 'green' },
    { icon: <Users className="h-5 w-5" />, label: 'Registered users', value: totalUsers, tone: 'gold' },
    { icon: <TriangleAlert className="h-5 w-5" />, label: 'Concerns raised', value: concerns.length, tone: 'clay' },
    {
      icon: <Timer className="h-5 w-5" />,
      label: 'Avg. time to close',
      value: avgClose == null ? '—' : avgClose < 48 ? `${avgClose.toFixed(1)}h` : `${(avgClose / 24).toFixed(1)}d`,
      tone: 'green',
    },
  ] as const

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Aggregated trends across every registered business"
        action={
          <div className="flex items-center gap-1.5">
            <ExportButton icon={<FileText className="h-4 w-4" />} label="CSV" onClick={exportCsv} />
            <ExportButton icon={<FileSpreadsheet className="h-4 w-4" />} label="Excel" onClick={exportXls} />
            <ExportButton icon={<Printer className="h-4 w-4" />} label="PDF" onClick={exportPdf} />
          </div>
        }
      />

      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-lg',
                t.tone === 'green' && 'bg-pounamu-100 text-pounamu-700',
                t.tone === 'gold' && 'bg-mustard-100 text-mustard-700',
                t.tone === 'clay' && 'bg-kokowai-100 text-kokowai-700',
              )}
            >
              {t.icon}
            </span>
            <p className="mt-3 font-display text-2xl font-bold text-ink">{t.value}</p>
            <p className="text-xs text-ink-faint">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Businesses with drill-down to users */}
      <section>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-pounamu-600" /> Businesses by NZBN
          </span>
        </SectionTitle>
        <div className="card overflow-hidden p-0">
          <div className="divide-y divide-black/5">
            {orgs.map((o) => {
              const expanded = open === o.nzbn
              const users = ORG_USERS[o.nzbn] ?? []
              return (
                <div key={o.nzbn}>
                  <div className="flex w-full items-center gap-3 px-5 py-4 hover:bg-sand-50/60">
                    <button
                      onClick={() => setOpen(expanded ? null : o.nzbn)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{o.name}</p>
                        <p className="text-xs text-ink-faint">NZBN {o.nzbn}</p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="font-display text-lg font-bold text-ink">{o.workers}</p>
                        <p className="text-xs text-ink-faint">users</p>
                      </div>
                      <Badge tone={o.adoption >= 85 ? 'green' : 'gold'}>{o.adoption}% active</Badge>
                    </button>
                    <button
                      onClick={() => deleteOrg(o.nzbn)}
                      className="focus-ring shrink-0 rounded-lg p-2 text-ink-faint transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${o.name}`}
                      title="Delete business (removes all its users)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {expanded && (
                    <div className="bg-sand-50/60 px-5 pb-4 pt-1">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                        Users ({users.length} shown · {o.workers} total)
                      </p>
                      <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
                        <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-black/5 bg-white">
                            {users.map((u) => (
                              <tr key={u.name}>
                                <td className="px-4 py-2.5 font-medium text-ink">{u.name}</td>
                                <td className="px-4 py-2.5 text-ink-soft">{u.role}</td>
                                <td className="px-4 py-2.5 text-ink-faint">{u.crew}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {!orgs.length && <p className="px-5 py-10 text-center text-sm text-ink-faint">No businesses registered.</p>}
          </div>
        </div>
      </section>

      {/* Aggregate demographics + risk themes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <SectionTitle>Risk themes reported</SectionTitle>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CATEGORY_BREAKDOWN} layout="vertical" margin={{ left: 24, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dae2e2" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#8a8984' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#8a8984' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(79,135,143,0.06)' }} />
                <Bar dataKey="value" name="Reports" radius={[0, 6, 6, 0]}>
                  {CATEGORY_BREAKDOWN.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-pounamu-600" /> Workforce (aggregate only)
            </span>
          </SectionTitle>
          <div className="mb-4 rounded-xl bg-pounamu-50 px-4 py-3">
            <p className="text-sm text-pounamu-900">
              Average age band <span className="font-bold">{AVG_AGE_BAND}</span>
            </p>
          </div>
          <div className="space-y-2.5">
            {GENDER_SPLIT.map((g) => (
              <div key={g.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{g.name}</span>
                  <span className="font-semibold text-ink">{g.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sand-200">
                  <div className="h-full rounded-full" style={{ width: `${g.value}%`, background: g.color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            No individual demographic data is shown to anyone, including the platform owner — only
            aggregate splits and bands, as agreed for ACC reporting.
          </p>
        </div>
      </div>
    </div>
  )
}

function ExportButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink-soft ring-1 ring-black/5 transition hover:bg-pounamu-50 hover:text-pounamu-700"
    >
      {icon} {label}
    </button>
  )
}
