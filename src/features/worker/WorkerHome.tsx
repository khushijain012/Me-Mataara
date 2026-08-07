import { Link, useNavigate } from 'react-router-dom'
import { TriangleAlert, ClipboardList, ArrowRight, Sparkles, HardDriveDownload } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Button, SectionTitle } from '@/components/ui'
import { ReportTimeline } from './ReportTimeline'

const WHAKATAUKI = 'Mā te mahi tahi, ka ora tātou — by working together, we all stay well.'

/** Keep Māori name particles (Te / Ngā) with the following word. */
function friendlyFirstName(name: string): string {
  const parts = name.split(' ')
  if ((parts[0] === 'Te' || parts[0] === 'Ngā') && parts[1]) return `${parts[0]} ${parts[1]}`
  return parts[0]
}

export function WorkerHome() {
  const { displayName, concerns, online } = useApp()
  const navigate = useNavigate()
  const mine = concerns.filter((c) => c.reportedBy === displayName)
  const recent = mine.slice(0, 4)
  const pending = mine.filter((c) => c.offline || c.captureStatus === 'queued').length
  const firstName = friendlyFirstName(displayName)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-sm font-medium text-ink-faint">Mōrena, kia ora</p>
        <h1 className="font-display text-3xl font-bold text-ink">{firstName}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-pounamu-700">
          <Sparkles className="h-4 w-4" />
          {WHAKATAUKI}
        </p>
      </div>

      {/* NQR hero — the core loop starts here */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pounamu-600 to-pounamu-900 p-6 text-white shadow-float">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 right-10 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 text-pounamu-100">
            <TriangleAlert className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Not Quite Right</span>
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold">See something that’s not quite right?</h2>
          <p className="mt-1 max-w-sm text-sm text-pounamu-50/90">
            Spot a risk on site? Pick it from the list and send it straight to your supervisor. A few
            taps.
          </p>
          <Button
            variant="white"
            className="mt-5"
            size="lg"
            onClick={() => navigate('/report')}
            icon={<ArrowRight className="h-5 w-5" />}
          >
            Raise it now
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/report"
          className="focus-ring group rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 transition hover:shadow-float"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-kokowai-100 text-kokowai-700">
            <TriangleAlert className="h-6 w-6" />
          </span>
          <p className="mt-3 font-display text-lg font-semibold text-ink">Something isn’t right</p>
          <p className="text-sm text-ink-faint">Raise a concern in a few taps</p>
        </Link>
        <Link
          to="/my-concerns"
          className="focus-ring group rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 transition hover:shadow-float"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-pounamu-100 text-pounamu-600">
            <ClipboardList className="h-6 w-6" />
          </span>
          <p className="mt-3 font-display text-lg font-semibold text-ink">My concerns</p>
          <p className="text-sm text-ink-faint">Track status & responses</p>
        </Link>
      </div>

      {/* Recent — activity timeline */}
      <div>
        <SectionTitle
          action={
            <Link to="/my-concerns" className="text-sm font-semibold text-pounamu-700">
              View all
            </Link>
          }
        >
          My recent reports
        </SectionTitle>

        {/* Offline backup status (client requirement) */}
        {(pending > 0 || !online) && (
          <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-kokowai-50 px-4 py-3 text-sm ring-1 ring-kokowai-100">
            <HardDriveDownload className="mt-0.5 h-4 w-4 shrink-0 text-kokowai-700" />
            <p className="text-kokowai-900">
              {pending > 0 ? (
                <>
                  <span className="font-semibold">{pending} report{pending > 1 ? 's' : ''} backed up on this device.</span>{' '}
                  They’ll sync automatically when you’re back online.
                </>
              ) : (
                <>You’re offline — new reports are saved on your device and sync when you reconnect.</>
              )}
            </p>
          </div>
        )}

        <ReportTimeline concerns={recent} />
      </div>
    </div>
  )
}
