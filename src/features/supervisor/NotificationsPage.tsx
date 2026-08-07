import { Link } from 'react-router-dom'
import { Bell, TriangleAlert, RefreshCw, CheckCircle2, Clock, CheckCheck, Smartphone } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { AppNotification } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, EmptyState } from '@/components/ui'
import { cn, timeAgo } from '@/lib/utils'

const ICONS: Record<AppNotification['kind'], { icon: React.ElementType; cls: string }> = {
  new_concern: { icon: TriangleAlert, cls: 'bg-kokowai-100 text-kokowai-700' },
  status: { icon: RefreshCw, cls: 'bg-kowhai-400/20 text-sand-800' },
  reminder: { icon: Clock, cls: 'bg-pounamu-100 text-pounamu-700' },
  closed: { icon: CheckCircle2, cls: 'bg-pounamu-100 text-pounamu-700' },
}

export function NotificationsPage() {
  const { notifications, markAllRead, unreadCount } = useApp()

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
        action={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" icon={<CheckCheck className="h-4 w-4" />} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-pounamu-50 px-4 py-3 text-sm ring-1 ring-pounamu-100">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-pounamu-700" />
        <p className="text-pounamu-900">
          You’re alerted <span className="font-semibold">in-app</span> first. If the app is closed we send a{' '}
          <span className="font-semibold">push notification</span>, and fall back to <span className="font-semibold">SMS</span> if
          push can’t be delivered.
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="h-10 w-10" />} title="No notifications" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const meta = ICONS[n.kind]
            const Icon = meta.icon
            const body = (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-2xl p-4 ring-1 transition',
                  n.read ? 'bg-white/70 ring-black/5' : 'bg-white shadow-card ring-pounamu-100',
                )}
              >
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', meta.cls)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-kokowai-500" />}
                  </div>
                  <p className="text-sm text-ink-soft">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-faint">{timeAgo(n.at)}</p>
                </div>
              </div>
            )
            return n.concernRef ? (
              <Link key={n.id} to={`/concern/${n.concernRef}`} className="block focus-ring rounded-2xl">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
