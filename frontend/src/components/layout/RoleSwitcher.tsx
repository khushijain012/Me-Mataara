import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Check, UserCog, LogOut, Activity, ShieldQuestion, LifeBuoy } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { ROLE_LABEL } from '@/lib/mockData'
import { ROLE_HOME } from './nav'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'

const ROLES: Role[] = ['worker', 'supervisor', 'admin']

/** Demo-only affordance: switch between roles to explore each experience. */
export function RoleSwitcher() {
  const { role, setRole, logout, auth } = useApp()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  function signOut() {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  function pick(r: Role) {
    setRole(r)
    setOpen(false)
    navigate(ROLE_HOME[r])
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink-soft ring-1 ring-black/5 hover:bg-white"
      >
        <UserCog className="h-3.5 w-3.5 text-pounamu-600" />
        <span className="hidden sm:inline">Viewing as</span>
        <span className="text-ink">{ROLE_LABEL[role].split(' · ')[1] ?? ROLE_LABEL[role]}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right animate-scale-in rounded-2xl bg-white p-1.5 shadow-float ring-1 ring-black/5">
            {/* Role is fixed by the Circle hierarchy; switching is a demo-only
                affordance in the mock. */}
            {auth.allowsRoleSwitch ? (
              <>
                <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  Demo · switch role
                </p>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => pick(r)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sand-50',
                      r === role && 'bg-sand-50',
                    )}
                  >
                    <span className="font-medium text-ink">{ROLE_LABEL[r]}</span>
                    {r === role && <Check className="h-4 w-4 text-pounamu-600" />}
                  </button>
                ))}
              </>
            ) : (
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  Signed in as
                </span>
                <span className="text-sm font-semibold text-ink">{ROLE_LABEL[role]}</span>
              </div>
            )}

            <div className="my-1 border-t border-black/5" />
            {[
              { to: '/system', label: 'System status', icon: Activity },
              { to: '/privacy', label: 'Privacy & data', icon: ShieldQuestion },
              { to: '/help', label: 'Help & support', icon: LifeBuoy },
            ].map((item) => (
              <button
                key={item.to}
                onClick={() => {
                  setOpen(false)
                  navigate(item.to)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-sand-50"
              >
                <item.icon className="h-4 w-4 text-ink-faint" />
                {item.label}
              </button>
            ))}

            <div className="my-1 border-t border-black/5" />
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-kokowai-700 hover:bg-kokowai-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
