import type { Role } from '@/lib/types'
import {
  Home,
  TriangleAlert,
  ClipboardList,
  Inbox,
  Bell,
  Users,
  Layers,
  MessageSquareText,
  Settings,
  CalendarRange,
  BarChart3,
  Activity,
  ShieldQuestion,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const NAV: Record<Role, NavItem[]> = {
  worker: [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/report', label: 'Report', icon: TriangleAlert },
    { to: '/my-concerns', label: 'Concerns', icon: ClipboardList },
  ],
  supervisor: [
    { to: '/inbox', label: 'Inbox', icon: Inbox },
    { to: '/weekly', label: 'Toolbox', icon: CalendarRange },
    { to: '/notifications', label: 'Alerts', icon: Bell },
  ],
  admin: [
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/hazards', label: 'Risks', icon: Layers },
    { to: '/admin/prompts', label: 'Prompts', icon: MessageSquareText },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
}

// System screens — reachable from every role via the shell's secondary nav.
export const SECONDARY_NAV: NavItem[] = [
  { to: '/system', label: 'System status', icon: Activity },
  { to: '/privacy', label: 'Privacy & data', icon: ShieldQuestion },
  { to: '/help', label: 'Help & support', icon: LifeBuoy },
]

export const ROLE_HOME: Record<Role, string> = {
  worker: '/',
  supervisor: '/inbox',
  admin: '/admin/users',
}
