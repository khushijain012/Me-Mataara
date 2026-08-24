import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, MapPin, Wifi, WifiOff } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { ROLE_LABEL } from '@/lib/mockData'
import { NAV, SECONDARY_NAV } from './nav'
import { RoleSwitcher } from './RoleSwitcher'
import { Logo, Wordmark } from './Logo'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { user, role, unreadCount, online, setOnline } = useApp()
  const navigate = useNavigate()
  const items = NAV[role]

  return (
    <div className="min-h-screen bg-weave">
      {/* Accessibility: skip straight to the main content */}
      <a
        href="#main-content"
        className="focus-ring sr-only z-50 rounded-lg bg-pounamu-700 px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* Top bar */}
      <header className="safe-top sticky top-0 z-30 border-b border-black/5 bg-sand-50/85 px-4 pb-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <Logo />
            <span className="hidden sm:block">
              <Wordmark />
            </span>
          </button>

          <div className="flex items-center gap-2">
            {/* Demo network toggle for the offline / pending-sync state */}
            <button
              onClick={() => setOnline(!online)}
              className={cn(
                'focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-black/5',
                online ? 'bg-pounamu-50 text-pounamu-700' : 'bg-kokowai-100 text-kokowai-800',
              )}
              title="Toggle mock connectivity"
            >
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
            </button>

            <RoleSwitcher />

            <button
              onClick={() => navigate('/notifications')}
              className="focus-ring relative grid h-9 w-9 place-items-center rounded-full bg-white/70 ring-1 ring-black/5 hover:bg-white"
            >
              <Bell className="h-5 w-5 text-ink-soft" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-kokowai-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <Avatar initials={user.initials} color={user.avatarColor} size="sm" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 pt-4">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24 flex min-h-[calc(100vh-7rem)] flex-col">
            <nav aria-label="Primary" className="space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-pounamu-600 text-white shadow-sm'
                        : 'text-ink-soft hover:bg-white/70',
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Secondary: BRD system screens */}
            <nav aria-label="System" className="mt-4 space-y-1 border-t border-black/5 pt-4">
              {SECONDARY_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-pounamu-100 text-pounamu-800' : 'text-ink-faint hover:bg-white/70',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Profile card — pinned to the bottom of the sidebar */}
            <div className="mt-auto rounded-2xl bg-white/70 p-4 ring-1 ring-black/5">
              <div className="flex items-center gap-3">
                <Avatar initials={user.initials} color={user.avatarColor} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-xs text-ink-faint">{ROLE_LABEL[role]}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{user.site}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main id="main-content" className="min-w-0 flex-1 pb-28 md:pb-10">
          <div className="animate-fade-in">
            <Outlet />
          </div>

          {/* Always-reachable system links (works on mobile where the sidebar is hidden) */}
          <nav aria-label="System" className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-black/5 pt-5 text-sm">
            {SECONDARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn('inline-flex items-center gap-1.5 font-medium', isActive ? 'text-pounamu-700' : 'text-ink-faint hover:text-ink-soft')
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 px-2 pt-2 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-pounamu-700' : 'text-ink-faint',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-9 w-full max-w-[64px] place-items-center rounded-xl transition-colors',
                      isActive && 'bg-pounamu-100',
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
