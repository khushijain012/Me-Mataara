import type {
  CrewResult,
  HierarchyIdentity,
  IdentityProvider,
  RegisterDraft,
  SupervisorOption,
} from './types'

/**
 * Live identity provider backed by our own NQR backend (Node/Express/Prisma).
 *
 * Auth is our own JWT (mobile + password) for now. The token is stored under the
 * same key the domain API client (src/lib/api/client.ts) reads, so both identity
 * and domain calls are authenticated by one token. This is the seam that swaps to
 * Circle SSO later — see circleProvider.ts for that future path.
 *
 * Active when VITE_USE_MOCK=false (see ./index). Talks to VITE_API_BASE.
 */

const TOKEN_KEY = 'nqr.circle.token' // shared with apiFetch (src/lib/api/client.ts)
const BASE = import.meta.env.VITE_API_BASE ?? ''

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* private mode — ignore */
  }
}
function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function requireBase(): string {
  if (!BASE) {
    throw new Error('VITE_API_BASE is not configured. Set it to the NQR backend URL, or use VITE_USE_MOCK=true.')
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
  if (!res.ok) {
    let message = `${init?.method ?? 'GET'} ${path} → ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

interface AuthResponse {
  token: string
  identity: HierarchyIdentity
}

export const apiProvider: IdentityProvider = {
  kind: 'circle', // occupies the non-mock (live) slot; our own JWT backend for now
  supportsPasswordLogin: true, // mobile + password
  managesAccounts: true, // in-app registration
  allowsRoleSwitch: false, // role comes from the account, not a demo switch

  async getMe() {
    if (!getToken()) return null
    try {
      const { identity } = await api<{ identity: HierarchyIdentity }>('/auth/me')
      return identity
    } catch {
      clearToken()
      return null
    }
  },

  async authenticatePassword(mobile, password) {
    // Distinguish the failure modes so the UI can be honest:
    //   • can't reach the server → throw (network / backend down)
    //   • 401 → return null (wrong mobile or password — no account looks the same)
    //   • other non-2xx → throw (server error)
    let res: Response
    try {
      res = await fetch(`${requireBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password }),
      })
    } catch {
      throw new Error('Can’t reach the server. Make sure the backend is running, then try again.')
    }
    if (res.status === 401) return null
    if (!res.ok) throw new Error('Something went wrong signing in. Please try again.')
    const { token, identity } = (await res.json()) as AuthResponse
    setToken(token)
    return identity
  },

  async beginSso() {
    throw new Error('SSO is not available — this build uses mobile + password sign-in.')
  },

  async register(input: RegisterDraft) {
    const { token, identity } = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setToken(token)
    return identity
  },

  async logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      /* best-effort */
    }
    clearToken()
  },

  async listSupervisors(): Promise<SupervisorOption[]> {
    return api<SupervisorOption[]>('/supervisors')
  },

  async listCrew(supervisorId: string): Promise<CrewResult> {
    return api<CrewResult>(`/supervisors/${encodeURIComponent(supervisorId)}/crew`)
  },
}
