import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useApp } from '@/context/AppContext'
import { ROLE_HOME } from '@/components/layout/nav'

import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { WorkerHome } from '@/features/worker/WorkerHome'
import { HazardReport } from '@/features/worker/HazardReport'
import { MyConcerns } from '@/features/worker/MyConcerns'
import { ConcernDetail } from '@/features/worker/ConcernDetail'
import { SupervisorInbox } from '@/features/supervisor/SupervisorInbox'
import { WeeklyReview } from '@/features/supervisor/WeeklyReview'
import { NotificationsPage } from '@/features/supervisor/NotificationsPage'
import { SystemStatus } from '@/features/system/SystemStatus'
import { PrivacyPage } from '@/features/system/PrivacyPage'
import { HelpPage } from '@/features/system/HelpPage'
import { AdminUsers } from '@/features/admin/AdminUsers'
import { AdminAnalytics } from '@/features/admin/AdminAnalytics'
import { AdminHazards } from '@/features/admin/AdminHazards'
import { AdminPrompts } from '@/features/admin/AdminPrompts'
import { AdminSettings } from '@/features/admin/AdminSettings'

/** Workers land on Home; other roles are redirected to their own landing. */
function HomeRoute() {
  const { role } = useApp()
  if (role !== 'worker') return <Navigate to={ROLE_HOME[role]} replace />
  return <WorkerHome />
}

/** Blocks the app until the user has signed in. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authed } = useApp()
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Once signed in, /login and /register shouldn't be reachable again. */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { authed } = useApp()
  if (authed) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRoute />} />
        <Route path="report" element={<HazardReport />} />
        <Route path="my-concerns" element={<MyConcerns />} />
        <Route path="concern/:ref" element={<ConcernDetail />} />

        <Route path="inbox" element={<SupervisorInbox />} />
        <Route path="weekly" element={<WeeklyReview />} />
        <Route path="notifications" element={<NotificationsPage />} />

        <Route path="system" element={<SystemStatus />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="help" element={<HelpPage />} />

        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/analytics" element={<AdminAnalytics />} />
        <Route path="admin/hazards" element={<AdminHazards />} />
        <Route path="admin/prompts" element={<AdminPrompts />} />
        <Route path="admin/settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
