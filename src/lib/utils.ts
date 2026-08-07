import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class names and resolve conflicting Tailwind utilities (later wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Relative "time ago" formatter for the mock timestamps. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Deterministic pseudo-id so we don't need Math.random in the render path. */
let seq = 1000
export function nextId(prefix = 'id'): string {
  seq += 7
  return `${prefix}-${seq}`
}

/** BRD: age derived from date of birth (stored on the profile). */
export function ageFromDob(dob: string): number {
  if (!dob) return 0
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return 0
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age < 0 ? 0 : age
}

/**
 * Demographic age band (doc: gender/age reported in aggregate only, e.g. an
 * average band such as "35–52"). We bucket the exact age so no individual age
 * is ever surfaced.
 */
export function ageBandFromDob(dob: string): string {
  const age = ageFromDob(dob)
  if (!age) return 'Unknown'
  if (age < 25) return 'Under 25'
  if (age < 35) return '25–34'
  if (age < 45) return '35–44'
  if (age < 55) return '45–54'
  if (age < 65) return '55–64'
  return '65+'
}

/**
 * BRD: passwords must be stored encrypted — never in plaintext. We one-way hash
 * with SHA-256 (Web Crypto) and only ever persist/compare the digest. A small
 * non-reversible fallback is used if SubtleCrypto is unavailable (e.g. an
 * insecure context) so a plaintext password is never written to storage.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(`mahipaiex:${password}`)
      const digest = await crypto.subtle.digest('SHA-256', data)
      return (
        'sha256:' +
        Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      )
    }
  } catch {
    /* fall through to fallback */
  }
  // Non-reversible fallback (still never stores the raw password).
  let h = 5381
  const s = `mahipaiex:${password}`
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return 'fnv:' + h.toString(16)
}
