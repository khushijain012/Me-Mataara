import { useState } from 'react'
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudUpload, RotateCcw } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'

let errSeq = 0

export function SystemStatus() {
  const { online, setOnline, concerns, syncOfflineConcerns, syncEvents, lastSyncAt, errorLogs, logError, retryError } =
    useApp()
  const pending = concerns.filter((c) => c.offline).length
  const [syncing, setSyncing] = useState(false)

  function sync() {
    setSyncing(true)
    window.setTimeout(() => {
      syncOfflineConcerns() // records a timestamped success/failure SyncEvent
      setSyncing(false)
    }, 1200)
  }

  function simulateError() {
    errSeq += 1
    logError(`E-${1000 + errSeq}`, 'Upload failed — network timeout while sending a concern.')
  }

  const openErrors = errorLogs.filter((e) => !e.resolved).length

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="System status" subtitle="Connectivity, sync and error handling" />

      {/* Offline indicator */}
      <div className={cn('card flex items-center gap-4 p-5', online ? '' : 'ring-kokowai-200')}>
        <span
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl',
            online ? 'bg-pounamu-100 text-pounamu-700' : 'bg-kokowai-100 text-kokowai-700',
          )}
        >
          {online ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
        </span>
        <div className="flex-1" aria-live="polite">
          <p className="font-semibold text-ink">{online ? 'You’re online' : 'You’re offline'}</p>
          <p className="text-sm text-ink-faint">
            {online
              ? 'Reports send straight to your supervisor.'
              : 'You can keep capturing — data is saved on your device.'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOnline(!online)}>
          {online ? 'Go offline' : 'Go online'}
        </Button>
      </div>

      {/* Sync status */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-kowhai-400/20 text-sand-800">
            <CloudUpload className="h-6 w-6" />
          </span>
          <div className="flex-1" aria-live="polite">
            <p className="font-semibold text-ink">Sync status</p>
            <p className="text-sm text-ink-faint">
              {pending > 0 ? `${pending} report${pending > 1 ? 's' : ''} waiting to sync` : 'Everything is up to date'}
              {lastSyncAt && ` · last synced ${timeAgo(lastSyncAt)}`}
            </p>
          </div>
          {pending > 0 ? (
            <Button size="sm" disabled={!online || syncing} onClick={sync} icon={<RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          ) : (
            <CheckCircle2 className="h-6 w-6 text-pounamu-600" />
          )}
        </div>
        {pending > 0 && !online && (
          <p className="mt-3 rounded-xl bg-sand-50 px-3 py-2 text-xs text-ink-faint">
            Auto background sync will run as soon as you’re back online.
          </p>
        )}

        {/* BRD: sync history — timestamp + success/failure */}
        {syncEvents.length > 0 && (
          <div className="mt-4 border-t border-black/5 pt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Recent syncs</p>
            <ul className="space-y-1.5">
              {syncEvents.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    {s.result === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-pounamu-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-kokowai-600" />
                    )}
                    <span className="text-ink-soft">{s.message ?? s.result}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-faint">{formatDateTime(s.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Error / retry */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl', openErrors ? 'bg-red-100 text-red-600' : 'bg-pounamu-100 text-pounamu-700')}>
            {openErrors ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
          </span>
          <div className="flex-1" aria-live="polite">
            <p className="font-semibold text-ink">{openErrors ? `${openErrors} action${openErrors > 1 ? 's' : ''} need retry` : 'No errors'}</p>
            <p className="text-sm text-ink-faint">
              {openErrors ? 'Something went wrong. You can retry safely.' : 'All actions completed successfully.'}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={simulateError}>
            Simulate error
          </Button>
        </div>

        {/* BRD: error logs + retry attempts */}
        {errorLogs.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-black/5 pt-3">
            {errorLogs.slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-xl bg-sand-50 px-3 py-2.5 text-sm">
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', e.resolved ? 'bg-pounamu-100 text-pounamu-700' : 'bg-red-100 text-red-600')}>
                  {e.resolved ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">
                    <span className="font-mono text-xs text-ink-faint">{e.code}</span> {e.message}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {formatDateTime(e.at)} · {e.retries} {e.retries === 1 ? 'retry' : 'retries'}
                    {e.resolved ? ' · resolved' : ''}
                  </span>
                </span>
                {!e.resolved && (
                  <Button size="sm" variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => retryError(e.id)}>
                    Retry
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
