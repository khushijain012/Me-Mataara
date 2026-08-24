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
import {
  identity,
  toAppRole,
  USE_MOCK,
  type HierarchyIdentity,
  type RegisterDraft,
  type SupervisorOption,
} from '@/lib/identity'
import { ageBandFromDob, ageFromDob, nextId } from '@/lib/utils'
import { catalogueApi } from '@/lib/api/catalogue'
import { concernsApi } from '@/lib/api/concerns'
import { notificationsApi } from '@/lib/api/notifications'

const LS_KEY = 'nqr.session'

// What RegisterPage submits. Identity/hierarchy (incl. password handling under
// mock) now lives behind the identity provider — see src/lib/identity.
export type RegisterInput = RegisterDraft

/** Auth/hierarchy capabilities the UI adapts to (sourced from the provider). */
export interface AuthCapabilities {
  kind: 'mock' | 'circle'
  passwordLogin: boolean
  managesAccounts: boolean
  allowsRoleSwitch: boolean
}

// Doc §3/§4: the worker picks risk(s) from the fixed list, adds a short
// description + when they noticed it, and may raise it anonymously.
interface NewConcernInput {
  categoryId: string
  riskIds: string[]
  description: string
  photos?: string[]
  sceneDate?: string
  reportedAnonymous?: boolean
  offline?: boolean
}

interface AppState {
  authed: boolean
  profile: RegisteredProfile | null
  register: (input: RegisterInput) => Promise<void>
  login: (mobile: string, password: string) => Promise<boolean>
  loginWithSso: () => Promise<void>
  logout: () => void

  // Identity/hierarchy — sourced from Circle (or the mock) via the provider.
  auth: AuthCapabilities
  supervisors: SupervisorOption[]

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
  addConcern: (input: NewConcernInput) => Promise<Concern>
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

/** Project a provider identity onto the local domain profile shape. */
function identityToProfile(id: HierarchyIdentity): RegisteredProfile {
  return {
    memberId: id.memberId,
    role: toAppRole(id.circleRole),
    circleRole: id.circleRole,
    firstName: id.firstName,
    lastName: id.lastName,
    dob: id.dob ?? '',
    age: id.dob ? ageFromDob(id.dob) : 0,
    ageBand: id.dob ? ageBandFromDob(id.dob) : 'Unknown',
    gender: id.gender ?? '',
    industry: id.industry ?? '',
    mobile: id.mobile,
    email: id.email,
    isHSR: id.isHSR ?? false,
    workerNumber: id.workerNumber,
    nzbn: id.nzbn ?? '',
    organisation: id.organisation ?? id.companyName ?? '',
    companyId: id.companyId,
    companyName: id.companyName,
    verificationStatus: 'verified',
    supervisorId: id.supervisorId ?? DEFAULT_SUPERVISOR.id,
    supervisorName: id.supervisorName ?? DEFAULT_SUPERVISOR.name,
  }
}

const AUTH_CAPABILITIES: AuthCapabilities = {
  kind: identity.kind,
  passwordLogin: identity.supportsPasswordLogin,
  managesAccounts: identity.managesAccounts,
  allowsRoleSwitch: identity.allowsRoleSwitch,
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = loadSession()
  const [authed, setAuthed] = useState(initial.authed)
  const [profile, setProfile] = useState<RegisteredProfile | null>(initial.profile)
  const [role, setRole] = useState<Role>(initial.profile?.role ?? 'worker')
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([])
  // Live mode owns all domain data on the server, so it starts empty and is
  // hydrated from the backend once authenticated (see the load effect below).
  // Only the mock prototype seeds from code / rehydrates the localStorage cache.
  const [concerns, setConcerns] = useState<Concern[]>(
    // Live mode caches only the pending offline queue (see the persist effect);
    // synced concerns always come fresh from the backend.
    USE_MOCK ? (initial.concerns?.length ? initial.concerns : CONCERNS) : (initial.concerns ?? []),
  )
  const [notifications, setNotifications] = useState<AppNotification[]>(
    USE_MOCK ? (initial.notifications?.length ? initial.notifications : NOTIFICATIONS) : [],
  )
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>(initial.syncEvents ?? [])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(initial.errorLogs ?? [])
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(initial.lastSyncAt ?? null)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  // Admin-editable content (seeded, then persisted once edited). Presentational
  // fields (icon/image) are always re-hydrated from code so design updates aren't
  // masked by an older persisted copy; real edits (active/order/label/custom) persist.
  const [hazards, setHazards] = useState<HazardCategory[]>(() => {
    if (!USE_MOCK) return []
    const src = initial.hazards?.length ? initial.hazards : HAZARD_CATEGORIES
    return src.map((h) => {
      const base = HAZARD_CATEGORIES.find((b) => b.id === h.id)
      return base ? { ...h, icon: base.icon, image: base.image } : h
    })
  })
  const [prompts, setPrompts] = useState<SupervisorPrompt[]>(
    USE_MOCK ? (initial.prompts?.length ? initial.prompts : SUPERVISOR_PROMPTS) : [],
  )
  const [akoKorero, setAkoKorero] = useState<AkoKorero[]>(USE_MOCK ? AKO_KORERO : [])

  const user = USERS[role]
  // Prefer the signed-in profile's real name. Under mock, role can be switched
  // for the demo, so fall back to the mock persona when viewing another role.
  const displayName =
    profile && (!USE_MOCK || role === profile.role)
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : user.name

  // Keep a live ref of concerns so callbacks can read the latest without deps.
  const concernsRef = useRef(concerns)
  concernsRef.current = concerns

  // ---- Persist session + (mock only) domain data so it survives reloads ----
  // Live mode is the system of record on the server: we persist only the
  // lightweight session (the token restores identity) and never cache domain
  // rows, so every module always renders fresh backend data — and writing this
  // slim payload also clears any stale mock cache from a previous run.
  useEffect(() => {
    try {
      const payload: Persisted = USE_MOCK
        ? { authed, profile, concerns, syncEvents, errorLogs, notifications, lastSyncAt, hazards, prompts }
        : // Live mode: the server is the record of truth, so we cache only the
          // offline queue (reports raised with no connection) + sync bookkeeping,
          // so they survive a reload and still sync once back online.
          { authed, profile, concerns: concerns.filter((c) => c.offline), syncEvents, lastSyncAt }
      localStorage.setItem(LS_KEY, JSON.stringify(payload))
    } catch {
      /* quota / private mode — ignore */
    }
  }, [authed, profile, concerns, syncEvents, errorLogs, notifications, lastSyncAt, hazards, prompts])

  // ---- Load the supervisor list from the provider (Circle or mock) ----
  useEffect(() => {
    let live = true
    identity
      .listSupervisors()
      .then((s) => live && setSupervisors(s))
      .catch(() => live && setSupervisors([]))
    return () => {
      live = false
    }
  }, [])

  // ---- Under Circle, restore the session from the token (Circle owns login).
  // Under mock the session is restored synchronously from localStorage above. ----
  useEffect(() => {
    if (USE_MOCK) return
    let live = true
    identity.getMe().then((id) => {
      if (live && id) {
        const p = identityToProfile(id)
        setProfile(p)
        setRole(p.role)
        setAuthed(true)
      }
    })
    return () => {
      live = false
    }
  }, [])

  // ---- Load live domain data from the backend once authenticated. Under mock
  // these stay seeded from code. Concerns are role-scoped by the server (worker →
  // own, supervisor → routed-to-me, admin → all); notifications are per-recipient. ----
  useEffect(() => {
    if (USE_MOCK || !authed) return
    let live = true
    catalogueApi
      .getHazards()
      .then((h) => {
        // Backend rows are data; icon/image are code — re-hydrate them so the
        // design is preserved on live data.
        if (!live) return
        setHazards(
          h.map((cat) => {
            const base = HAZARD_CATEGORIES.find((b) => b.id === cat.id)
            return base ? { ...cat, icon: base.icon, image: base.image } : cat
          }),
        )
      })
      .catch(() => {})
    catalogueApi.getPrompts().then((p) => live && setPrompts(p)).catch(() => {})
    catalogueApi.getAkoKorero().then((a) => live && setAkoKorero(a)).catch(() => {})
    concernsApi
      .list()
      .then((server) => {
        if (!live) return
        // Keep any still-unsynced offline reports on top of the authoritative
        // server list so they don't disappear when live data loads.
        setConcerns((prev) => {
          const serverIds = new Set(server.map((s) => s.id))
          const pending = prev.filter((c) => c.offline && !serverIds.has(c.id))
          return [...pending, ...server]
        })
      })
      .catch(() => {})
    notificationsApi.list().then((n) => live && setNotifications(n)).catch(() => {})
    return () => {
      live = false
    }
  }, [authed])

  // ---- Sync: flush the offline queue and record a timestamped result ----
  const syncOfflineConcerns = useCallback(() => {
    // Live backend: POST the queued concerns (idempotent on clientId) and swap
    // the on-device records for the server's authoritative ones.
    if (!USE_MOCK) {
      const offline = concernsRef.current.filter((c) => c.offline)
      if (!offline.length) {
        const at = nowIso()
        setSyncEvents((prev) =>
          [{ id: nextId('s'), at, result: 'success' as const, count: 0, message: 'Nothing to sync' }, ...prev].slice(0, 50),
        )
        setLastSyncAt(at)
        return
      }
      concernsApi
        .sync(
          offline.map((c) => ({
            categoryId: c.categoryId,
            riskIds: c.riskIds,
            description: c.description,
            photos: c.photos ?? [],
            sceneDate: c.sceneDate,
            reportedAnonymous: c.reportedAnonymous,
            offline: false,
            clientId: c.id, // dedupe on replay
            capturedAt: c.capturedAt,
          })),
        )
        .then(({ synced, event }) => {
          setConcerns((prev) => [...synced, ...prev.filter((c) => !c.offline)])
          setSyncEvents((prev) => [event, ...prev].slice(0, 50))
          setLastSyncAt(event.at)
        })
        .catch(() => {
          const at = nowIso()
          setSyncEvents((prev) =>
            [{ id: nextId('s'), at, result: 'failure' as const, count: 0, message: 'Sync failed — will retry' }, ...prev].slice(0, 50),
          )
        })
      return
    }

    // Mock: mark the local offline concerns as synced.
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
    async (input: NewConcernInput): Promise<Concern> => {
      const at = nowIso()
      const maxRef = concernsRef.current.reduce((max, c) => {
        const n = Number(c.ref.replace('HZ-', ''))
        return Number.isFinite(n) && n > max ? n : max
      }, 1042)
      // Routing target = the Worker→Supervisor edge, read off the profile.
      const supervisorId = profile?.supervisorId ?? DEFAULT_SUPERVISOR.id
      const supervisorName = profile?.supervisorName ?? DEFAULT_SUPERVISOR.name
      const riskIds = input.riskIds.length ? input.riskIds : [input.categoryId]
      // A device-local record — used as-is for mock + offline, and as the fallback
      // if the server is unreachable. Its id doubles as the sync idempotency key.
      const local: Concern = {
        id: nextId('c'),
        ref: `HZ-${maxRef + 1}`,
        categoryId: input.categoryId,
        riskIds,
        description: input.description,
        photos: input.photos ?? [],
        status: 'open',
        sceneDate: input.sceneDate,
        reportedBy: displayName,
        reportedById: profile?.memberId ?? USERS.worker.id,
        reportedAnonymous: input.reportedAnonymous,
        reportedAt: at,
        supervisorId,
        assignedTo: supervisorName,
        actions: [],
        offline: input.offline,
        captureStatus: input.offline ? 'queued' : 'synced',
        capturedAt: at,
        syncedAt: input.offline ? undefined : at,
      }
      const riskLabel = HAZARD_CATEGORIES.find((h) => h.id === local.categoryId)?.label ?? 'Risk'

      // Live backend + online: create on the server and use its authoritative record
      // (real ref, routing, cycle-time). Server also notifies the supervisor.
      if (!USE_MOCK && !input.offline) {
        try {
          const created = await concernsApi.create({
            categoryId: input.categoryId,
            riskIds,
            description: input.description,
            photos: input.photos ?? [],
            sceneDate: input.sceneDate,
            reportedAnonymous: input.reportedAnonymous,
            offline: false,
          })
          setConcerns((prev) => [created, ...prev])
          notify('New concern raised', `${created.ref} · ${riskLabel}`)
          return created
        } catch {
          // Unreachable → keep it on-device and queue for the next sync.
          const queued: Concern = { ...local, offline: true, captureStatus: 'queued', syncedAt: undefined }
          setConcerns((prev) => [queued, ...prev])
          return queued
        }
      }

      // Offline (live) or mock: keep it local. Under the backend it syncs later.
      setConcerns((prev) => [local, ...prev])
      if (USE_MOCK) {
        setNotifications((prev) => [
          {
            id: nextId('n'),
            kind: 'new_concern',
            title: 'New concern raised',
            body: `${local.ref} · ${riskLabel} — sent to you.`,
            at,
            read: false,
            concernRef: local.ref,
          },
          ...prev,
        ])
        if (!input.offline) notify('New concern raised', `${local.ref} · ${riskLabel}`)
      }
      return local
    },
    [displayName, notify, profile],
  )

  const updateConcernStatus = useCallback((id: string, status: ConcernStatus) => {
    // Optimistic in-progress transition (closing goes through closeConcern).
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
    if (!USE_MOCK && status !== 'closed') {
      concernsApi
        .updateStatus(id, status)
        .then((u) => setConcerns((prev) => prev.map((c) => (c.id === id ? u : c))))
        .catch(() => {})
    }
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
      if (USE_MOCK) {
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
      } else {
        // Server closes it (computes cycle-time, notifies the reporter) and
        // returns the authoritative record to reconcile against.
        concernsApi
          .close(id, riskReduction)
          .then((u) => setConcerns((prev) => prev.map((c) => (c.id === id ? u : c))))
          .catch(() => {})
      }
      notify('Concern closed', `${ref} has been closed.`)
    },
    [notify],
  )

  const addAction = useCallback((id: string, message: string, actorRole: Role, opts?: { promptId?: string }) => {
    const promptId = opts?.promptId
    // Optimistic append.
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
    if (!USE_MOCK) {
      // Server records the response (author from the token, notifies the worker)
      // and returns the authoritative concern to reconcile against.
      concernsApi
        .addAction(id, message, promptId)
        .then((u) => setConcerns((prev) => prev.map((c) => (c.id === id ? u : c))))
        .catch(() => {})
    }
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (!USE_MOCK) notificationsApi.readAll().catch(() => {})
  }, [])

  // Provisioning goes through the identity provider. Under mock this creates a
  // device-local account; under Circle accounts are managed upstream and this
  // path is disabled (the register screen short-circuits before calling it).
  const register = useCallback(async (input: RegisterInput) => {
    const id = await identity.register(input)
    const p = identityToProfile(id)
    setProfile(p)
    setRole(p.role)
    setAuthed(true)
  }, [])

  // Provisional password sign-in (mock only). The Circle path uses SSO.
  const login = useCallback(async (mobile: string, password: string): Promise<boolean> => {
    const id = await identity.authenticatePassword(mobile, password)
    if (!id) return false
    const p = identityToProfile(id)
    setProfile(p)
    setRole(p.role)
    setAuthed(true)
    return true
  }, [])

  // Circle SSO — hands off to Circle's hosted auth (redirect).
  const loginWithSso = useCallback(async () => {
    await identity.beginSso()
  }, [])

  const logout = useCallback(() => {
    void identity.logout()
    setAuthed(false)
    setRole('worker')
  }, [])

  // Optimistic local update, then persist to the backend (full-replace PUT) and
  // reconcile with the saved rows. Under mock this stays in-memory only.
  const saveHazards = useCallback((next: HazardCategory[]) => {
    setHazards(next)
    if (!USE_MOCK) catalogueApi.saveHazards(next).then(setHazards).catch(() => {})
  }, [])
  const savePrompts = useCallback((next: SupervisorPrompt[]) => {
    setPrompts(next)
    if (!USE_MOCK) catalogueApi.savePrompts(next).then(setPrompts).catch(() => {})
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length
  const pendingSync = concerns.filter((c) => c.offline).length

  const value = useMemo<AppState>(
    () => ({
      authed,
      profile,
      register,
      login,
      loginWithSso,
      logout,
      auth: AUTH_CAPABILITIES,
      supervisors,
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
      loginWithSso,
      logout,
      supervisors,
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
