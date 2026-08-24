import { apiProvider } from './apiProvider'
import { mockProvider } from './mockProvider'
import type { IdentityProvider } from './types'

/**
 * Which identity/hierarchy backend the app runs against.
 *
 * Default is the device-local mock so the prototype runs with no backend. Set
 * `VITE_USE_MOCK=false` (plus `VITE_API_BASE`) to run against the NQR backend
 * (own JWT auth). This is the single switch the whole app flows through.
 * (The Circle SSO provider in ./circleProvider is kept for the future swap.)
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const identity: IdentityProvider = USE_MOCK ? mockProvider : apiProvider

export * from './types'
