import type {
  CircleRole,
  CrewResult,
  HierarchyIdentity,
  IdentityProvider,
  SupervisorOption,
} from './types'

/**
 * Circle-backed identity provider.
 *
 * Circle is the system of record for accounts + hierarchy; the PWA only
 * consumes it. This adapter targets a PROPOSED contract (endpoints below) that
 * Circle's team must build and confirm — it is the spec we hand them, and the
 * shape our own backend will mirror. It is inactive by default (mock is the
 * default) and is enabled with `VITE_USE_MOCK=false` once the endpoints exist.
 *
 * Proposed Circle contract (base = VITE_CIRCLE_API_BASE):
 *   GET  /me                       → CircleMemberDto              (auth: Bearer)
 *   GET  /supervisors              → CircleSupervisorDto[]
 *   GET  /supervisors/:id/crew     → { crew: [], unclaimed: [] }
 *   SSO  GET  {base}/authorize?redirect_uri=…  → returns to app with #token=…
 *   POST /logout
 */

const TOKEN_KEY = 'nqr.circle.token'
const BASE = import.meta.env.VITE_CIRCLE_API_BASE ?? ''

interface CircleMemberDto {
  id: string
  firstName: string
  lastName: string
  email: string
  mobile: string
  role: CircleRole
  companyId: string | null
  companyName: string | null
  supervisorId: string | null
  supervisorName: string | null
  dob?: string
  industry?: string
  isHSR?: boolean
  workerNumber?: string
  nzbn?: string
  organisation?: string
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function requireBase(): string {
  if (!BASE) {
    throw new Error(
      'VITE_CIRCLE_API_BASE is not configured. Set VITE_USE_MOCK=true for the prototype, ' +
        'or provide the Circle API base URL to run against Circle.',
    )
  }
  return BASE
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${requireBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`Circle API ${path} → ${res.status}`)
  return (await res.json()) as T
}

function toIdentity(m: CircleMemberDto): HierarchyIdentity {
  return {
    memberId: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    mobile: m.mobile,
    circleRole: m.role,
    companyId: m.companyId,
    companyName: m.companyName,
    supervisorId: m.supervisorId,
    supervisorName: m.supervisorName,
    dob: m.dob,
    industry: m.industry,
    isHSR: m.isHSR,
    workerNumber: m.workerNumber,
    nzbn: m.nzbn,
    organisation: m.organisation,
  }
}

export const circleProvider: IdentityProvider = {
  kind: 'circle',
  supportsPasswordLogin: false, // Circle owns login (SSO/OAuth)
  managesAccounts: false, // accounts are created + managed in Circle
  allowsRoleSwitch: false, // role is fixed by the Circle hierarchy

  async getMe() {
    if (!getToken()) return null
    try {
      return toIdentity(await api<CircleMemberDto>('/me'))
    } catch {
      return null
    }
  },

  async authenticatePassword() {
    throw new Error('Password sign-in is disabled — authentication is handled by Circle SSO.')
  },

  async beginSso() {
    const base = requireBase()
    const redirect = encodeURIComponent(window.location.origin)
    // Hand off to Circle's hosted auth; it returns to the app with a token.
    window.location.href = `${base}/authorize?redirect_uri=${redirect}`
  },

  async register() {
    throw new Error('Accounts are created and managed in Circle — in-app registration is disabled.')
  },

  async logout() {
    try {
      await api('/logout', { method: 'POST' })
    } catch {
      /* best-effort */
    }
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },

  async listSupervisors(): Promise<SupervisorOption[]> {
    return api<SupervisorOption[]>('/supervisors')
  },

  async listCrew(supervisorId: string): Promise<CrewResult> {
    return api<CrewResult>(`/supervisors/${encodeURIComponent(supervisorId)}/crew`)
  },
}
