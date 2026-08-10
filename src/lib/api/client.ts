import { USE_MOCK } from '@/lib/identity'

/**
 * Thin client for the NQR domain backend (concerns, hazards, analytics, sync)
 * — our own .NET API, distinct from Circle (identity + hierarchy).
 *
 * This is the seam the app will move its data reads/writes behind. While
 * `VITE_USE_MOCK` is on, the app keeps using in-memory/localStorage data and
 * this client stays inert; flipping the flag routes calls to `VITE_API_BASE`.
 */

const BASE = import.meta.env.VITE_API_BASE ?? ''

/** True when live domain data should be used instead of the in-memory mock. */
export const USE_LIVE_DATA = !USE_MOCK

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function circleToken(): string | null {
  try {
    return localStorage.getItem('nqr.circle.token')
  } catch {
    return null
  }
}

/**
 * Fetch JSON from the NQR backend. Auth uses the Circle-issued token (Circle is
 * the IdP), which our backend verifies. Guards against being called before a
 * backend base is configured.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) {
    throw new ApiError(
      0,
      'VITE_API_BASE is not configured. The prototype uses in-memory data (VITE_USE_MOCK=true).',
    )
  }
  const token = circleToken()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new ApiError(res.status, `${init?.method ?? 'GET'} ${path} → ${res.status}`)
  return (await res.json()) as T
}
