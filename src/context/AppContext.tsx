import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AkoKorero,
  AppNotification,
  Concern,
  ConcernStatus,
  ErrorLog,
  Gender,
  HazardCategory,
  RegisteredProfile,
  Role,
  SupervisorPrompt,
  SyncEvent,
} from '@/lib/types'
import {
  AKO_KORERO,
  CONCERNS,
  DEFAULT_SUPERVISOR,
  HAZARD_CATEGORIES,
  NOTIFICATIONS,
  SUPERVISOR_PROMPTS,
  USERS,
} from '@/lib/mockData'
import { ageBandFromDob, ageFromDob, hashPassword, nextId } from '@/lib/utils'

const LS_KEY = 'nqr.session'

// What RegisterPage submits — the raw password is hashed here and never stored.
export interface RegisterInput {
  firstName: string
  lastName: string
  dob: string
  gender: Gender
  industry: string
  mobile: string
  email: string
  isHSR: boolean
  workerNumber?: string
  nzbn: string
  organisation: string
  supervisorId?: string
  supervisorName?: string
  password: string
}

// Doc §3/§4: the worker picks risk(s) from the fixed list, adds a short
// description + when they noticed it, and may raise it anonymously.
interface NewConcernInput {
  categoryId: string
  riskIds: string[]
  description: string
  sceneDate?: string
  reportedAnonymous?: boolean
  offline?: boolean
}

interface AppState {
  authed: boolean
  profile: RegisteredProfile | null
  register: (input: RegisterInput) => Promise<void>
  login: (mobile: string, password: string) => Promise<boolean>
  logout: () => void

  role: Role
  setRole: (r: Role) => void
  user: (typeof USERS)[Role]
  displayName: string

  // Admin-editable content that feeds the live app
  hazards: HazardCategory[]
  saveHazards: (next: HazardCategory[]) => void
  prompts: SupervisorPrompt[]
  savePrompts: (next: SupervisorPrompt[]) => void
  akoKorero: AkoKorero[]

  concerns: Concern[]
  addConcern: (input: NewConcernInput) => Concern
  updateConcernStatus: (id: string, status: ConcernStatus) => void
  closeConcern: (id: string, riskReduction: string) => void
  addAction: (id: string, message: string, role: Role, opts?: { promptId?: string }) => void
  syncOfflineConcerns: () => void
  pendingSync: number
  lastSyncAt: string | null
  syncEvents: SyncEvent[]

  errorLogs: ErrorLog[]
  logError: (code: string, message: string) => void
  retryError: (id: string) => void

  notifications: AppNotification[]
  markAllRead: () => void
  unreadCount: number

  online: boolean
  setOnline: (v: boolean) => void
}

const Ctx = createContext<AppState | null>(null)

interface Persisted {
  authed: boolean
  profile: RegisteredProfile | null
  concerns?: Concern[]
  syncEvents?: SyncEvent[]
  errorLogs?: ErrorLog[]
  notifications?: AppNotification[]
  lastSyncAt?: string | null
  hazards?: HazardCategory[]
  prompts?: SupervisorPrompt[]
}

function loadSession(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { authed: false, profile: null }
}

const nowIso = () => new Date().toISOString()

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = loadSession()
  const [authed, setAuthed] = useState(initial.authed)
  const [profile, setProfile] = useState<RegisteredProfile | null>(initial.profile)
  const [role, setRole] = useState<Role>('worker')
  const [concerns, setConcerns] = useState<Concern[]>(
    initial.concerns?.length ? initial.concerns : CONCERNS,
  )
  const [notifications, setNotifications] = useState<AppNotification[]>(
    initial.notifications?.length ? initial.notifications : NOTIFICATIONS,
  )
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>(initial.syncEvents ?? [])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(initial.errorLogs ?? [])
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(initial.lastSyncAt ?? null)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  // Admin-editable content (seeded, then persisted once edited). Presentational
  // fields (icon/image) are always re-hydrated from code so design updates aren't
  // masked by an older persisted copy; real edits (active/order/label/custom) persist.
  const [hazards, setHazards] = useState<HazardCategory[]>(() => {
    const src = initial.hazards?.length ? initial.hazards : HAZARD_CATEGORIES
    return src.map((h) => {
      const base = HAZARD_CATEGORIES.find((b) => b.id === h.id)
      return base ? { ...h, icon: base.icon, image: base.image } : h
    })
  })
  const [prompts, setPrompts] = useState<SupervisorPrompt[]>(initial.prompts?.length ? initial.prompts : SUPERVISOR_PROMPTS)
  const akoKorero = AKO_KORERO

  const user = USERS[role]
  const displayName =
    role === 'worker' && profile ? `${profile.firstName} ${profile.lastName}`.trim() : user.name

  // Keep a live ref of concerns so callbacks can read the latest without deps.
  const concernsRef = useRef(concerns)
  concernsRef.current = concerns

  // ---- Persist everything so it survives reloads / works offline ----
  useEffect(() => {
    try {
      const payload: Persisted = {
        authed,
        profile,
        concerns,
        syncEvents,
        errorLogs,
        notifications,
        lastSyncAt,
        hazards,
        prompts,
      }
      localStorage.setItem(LS_KEY, JSON.stringify(payload))
    } catch {
      /* quota / private mode — ignore */
    }
  }, [authed, profile, concerns, syncEvents, errorLogs, notifications, lastSyncAt, hazards, prompts])

  // ---- Sync: flush the offline queue and record a timestamped result ----
  const syncOfflineConcerns = useCallback(() => {
    const count = concernsRef.current.filter((c) => c.offline).length
    const at = nowIso()
    setConcerns((prev) =>
      prev.map((c) => (c.offline ? { ...c, offline: false, captureStatus: 'synced', syncedAt: at } : c)),
    )
    setSyncEvents((prev) =>
      [
        {
          id: nextId('s'),
          at,
          result: 'success' as const,
          count,
          message: count ? `${count} record${count === 1 ? '' : 's'} synced` : 'Nothing to sync',
        },
        ...prev,
      ].slice(0, 50),
    )
    setLastSyncAt(at)
  }, [])

  // ---- Real offline behaviour: follow the browser connectivity events ----
  const syncRef = useRef(syncOfflineConcerns)
  syncRef.current = syncOfflineConcerns
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Auto-flush the offline backup whenever connectivity transitions offline -> online.
  const prevOnlineRef = useRef(online)
  useEffect(() => {
    const was = prevOnlineRef.current
    prevOnlineRef.current = online
    if (!was && online) {
      const t = window.setTimeout(() => syncRef.current(), 600)
      return () => window.clearTimeout(t)
    }
  }, [online])

  const logError = useCallback((code: string, message: string) => {
    setErrorLogs((prev) =>
      [{ id: nextId('e'), at: nowIso(), code, message, retries: 0, resolved: false }, ...prev].slice(0, 50),
    )
  }, [])

  const retryError = useCallback((id: string) => {
    setErrorLogs((prev) =>
      prev.map((e) => (e.id === id ? { ...e, retries: e.retries + 1, resolved: true } : e)),
    )
  }, [])

  const notify = useCallback((title: string, body: string) => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body })
      }
    } catch {
      /* ignore */
    }
  }, [])

  const addConcern = useCallback(
    (input: NewConcernInput): Concern => {
      const at = nowIso()
      const maxRef = concernsRef.current.reduce((max, c) => {
        const n = Number(c.ref.replace('HZ-', ''))
        return Number.isFinite(n) && n > max ? n : max
      }, 1042)
      const supervisorId = profile?.supervisorId ?? DEFAULT_SUPERVISOR.id
      const supervisorName = profile?.supervisorName ?? DEFAULT_SUPERVISOR.name
      const concern: Concern = {
        id: nextId('c'),
        ref: `HZ-${maxRef + 1}`,
        categoryId: input.categoryId,
        riskIds: input.riskIds.length ? input.riskIds : [input.categoryId],
        description: input.description,
        status: 'open',
        sceneDate: input.sceneDate,
        reportedBy: displayName,
        reportedById: profile ? 'u-self' : USERS.worker.id,
        reportedAnonymous: input.reportedAnonymous,
        reportedAt: at,
        // Routed directly to the worker's linked supervisor (one per concern)
        supervisorId,
        assignedTo: supervisorName,
        actions: [],
        offline: input.offline,
        captureStatus: input.offline ? 'queued' : 'synced',
        capturedAt: at,
        syncedAt: input.offline ? undefined : at,
      }
      setConcerns((prev) => [concern, ...prev])
      const riskLabel = HAZARD_CATEGORIES.find((h) => h.id === concern.categoryId)?.label ?? 'Risk'
      setNotifications((prev) => [
        {
          id: nextId('n'),
          kind: 'new_concern',
          title: 'New concern raised',
          body: `${concern.ref} · ${riskLabel} — sent to you.`,
          at,
          read: false,
          concernRef: concern.ref,
        },
        ...prev,
      ])
      if (!input.offline) notify('New concern raised', `${concern.ref} · ${riskLabel}`)
      return concern
    },
    [displayName, notify, profile],
  )

  const updateConcernStatus = useCallback((id: string, status: ConcernStatus) => {
    // In-progress transition. Closing goes through closeConcern.
    setConcerns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              ...(status !== 'closed'
                ? { closedAt: undefined, closedAtIso: undefined, timeToCloseHours: undefined, riskReduction: undefined }
                : {}),
            }
          : c,
      ),
    )
  }, [])

  const closeConcern = useCallback(
    (id: string, riskReduction: string) => {
      const at = nowIso()
      let ref = ''
      setConcerns((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c
          ref = c.ref
          const hrs = (new Date(at).getTime() - new Date(c.reportedAt).getTime()) / 3_600_000
          return {
            ...c,
            status: 'closed',
            closedAt: at.slice(0, 10),
            closedAtIso: at,
            timeToCloseHours: Math.max(0, Math.round(hrs * 10) / 10),
            riskReduction: riskReduction.trim() || undefined,
          }
        }),
      )
      setNotifications((prev) => [
        {
          id: nextId('n'),
          kind: 'closed',
          title: 'Concern closed',
          body: `${ref} · closed and recorded.`,
          at,
          read: false,
          concernRef: ref,
        },
        ...prev,
      ])
      notify('Concern closed', `${ref} has been closed.`)
    },
    [notify],
  )

  const addAction = useCallback((id: string, message: string, actorRole: Role, opts?: { promptId?: string }) => {
    const promptId = opts?.promptId
    setConcerns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: c.status === 'open' ? 'in_progress' : c.status,
              assignedTo: c.assignedTo ?? USERS[actorRole].name,
              actions: [
                ...c.actions,
                {
                  id: nextId('a'),
                  author: USERS[actorRole].name,
                  role: actorRole,
                  message,
                  at: nowIso(),
                  promptId,
                  responseType: promptId ? 'preset' : 'custom',
                },
              ],
            }
          : c,
      ),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const passwordHash = await hashPassword(input.password)
    const p: RegisteredProfile = {
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob,
      age: ageFromDob(input.dob),
      ageBand: ageBandFromDob(input.dob),
      gender: input.gender,
      industry: input.industry,
      mobile: input.mobile,
      email: input.email,
      isHSR: input.isHSR,
      workerNumber: input.workerNumber?.trim() || undefined,
      nzbn: input.nzbn,
      organisation: input.organisation,
      passwordHash,
      verificationStatus: 'verified',
      // Doc §5: worker claims their supervisor at setup; if skipped they stay
      // "unclaimed" but concerns still route to the default supervisor.
      supervisorId: input.supervisorId || DEFAULT_SUPERVISOR.id,
      supervisorName: input.supervisorName || DEFAULT_SUPERVISOR.name,
    }
    setProfile(p)
    setAuthed(true)
  }, [])

  const login = useCallback(
    async (mobile: string, password: string): Promise<boolean> => {
      if (!profile) return false
      const hash = await hashPassword(password)
      const mobileMatch = profile.mobile.replace(/\s/g, '') === mobile.replace(/\s/g, '')
      if (mobileMatch && profile.passwordHash === hash) {
        setProfile({ ...profile, verificationStatus: 'verified' })
        setAuthed(true)
        return true
      }
      return false
    },
    [profile],
  )

  const logout = useCallback(() => {
    setAuthed(false)
    setRole('worker')
  }, [])

  const saveHazards = useCallback((next: HazardCategory[]) => setHazards(next), [])
  const savePrompts = useCallback((next: SupervisorPrompt[]) => setPrompts(next), [])

  const unreadCount = notifications.filter((n) => !n.read).length
  const pendingSync = concerns.filter((c) => c.offline).length

  const value = useMemo<AppState>(
    () => ({
      authed,
      profile,
      register,
      login,
      logout,
      role,
      setRole,
      user,
      displayName,
      hazards,
      saveHazards,
      prompts,
      savePrompts,
      akoKorero,
      concerns,
      addConcern,
      updateConcernStatus,
      closeConcern,
      addAction,
      syncOfflineConcerns,
      pendingSync,
      lastSyncAt,
      syncEvents,
      errorLogs,
      logError,
      retryError,
      notifications,
      markAllRead,
      unreadCount,
      online,
      setOnline,
    }),
    [
      authed,
      profile,
      register,
      login,
      logout,
      role,
      user,
      displayName,
      hazards,
      saveHazards,
      prompts,
      savePrompts,
      akoKorero,
      concerns,
      addConcern,
      updateConcernStatus,
      closeConcern,
      addAction,
      syncOfflineConcerns,
      pendingSync,
      lastSyncAt,
      syncEvents,
      errorLogs,
      logError,
      retryError,
      notifications,
      markAllRead,
      unreadCount,
      online,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
