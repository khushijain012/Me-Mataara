import { circleProvider } from './circleProvider'
import { mockProvider } from './mockProvider'
import type { IdentityProvider } from './types'

/**
 * Which identity/hierarchy backend the app runs against.
 *
 * Default is the device-local mock so the prototype runs with no backend. Set
 * `VITE_USE_MOCK=false` (plus `VITE_CIRCLE_API_BASE`) to consume Circle once its
 * APIs exist. This is the single switch the whole app flows through.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const identity: IdentityProvider = USE_MOCK ? mockProvider : circleProvider

export * from './types'
