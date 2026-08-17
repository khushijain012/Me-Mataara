import type { CircleRole, Gender, Role } from '@/lib/types'

export type { CircleRole }

/**
 * Identity + hierarchy contract.
 *
 * Client decision (Aug 2026): Circle is the system of record for ALL accounts
 * (Platform Owner, Company Owner, Supervisor, Worker) AND the reporting
 * hierarchy. The PWA is a read-only consumer — it authenticates against Circle
 * and reads the Worker→Supervisor edge to route concerns. See the Circle
 * integration notes for the full boundary.
 *
 * Everything the app needs from Circle flows through {@link IdentityProvider}.
 * A `mock` implementation reproduces the current device-local prototype; a
 * `circle` implementation talks to Circle's APIs. The active one is chosen by
 * `VITE_USE_MOCK` in `./index`.
 */

/**
 * A resolved identity as the PWA consumes it. Under Circle this is projected
 * from a Circle member + the hierarchy edges; under mock it is built from the
 * device-local registration.
 */
export interface HierarchyIdentity {
  memberId: string // Circle member id (stable key our backend mirrors)
  firstName: string
  lastName: string
  email: string
  mobile: string
  circleRole: CircleRole
  companyId: string | null // Circle company/org id (Company Owner tier)
  companyName: string | null
  // Worker→Supervisor edge — who receives this worker's concerns. Owned by
  // Circle; the PWA never writes it (read-only under the client's decision).
  supervisorId: string | null
  supervisorName: string | null
  // Domain-profile fields. Under mock these are captured at registration; under
  // Circle they come from Circle member profile fields (mapped by the adapter).
  dob?: string
  gender?: Gender
  industry?: string
  isHSR?: boolean
  workerNumber?: string
  nzbn?: string
  organisation?: string
}

/** A supervisor option for the "claim your supervisor" affordance. */
export interface SupervisorOption {
  id: string
  name: string
  crew: string
  approval: 'approved' | 'awaiting_approval'
}

/** A crew member under a supervisor (for the Supervisor Toolbox view). */
export interface CrewMember {
  memberId: string
  name: string
  initials: string
  color?: string
  supervisorId: string | null // null → unclaimed (to chase)
}

export interface CrewResult {
  crew: CrewMember[]
  unclaimed: CrewMember[]
}

/** What the registration form submits (mock only; Circle owns provisioning). */
export interface RegisterDraft {
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

export interface IdentityProvider {
  readonly kind: 'mock' | 'circle'

  // --- Capabilities the UI adapts to ---
  /** true → mobile+password form; false → SSO redirect ("Sign in with Circle"). */
  readonly supportsPasswordLogin: boolean
  /** true → in-app registration; false → accounts are created/managed in Circle. */
  readonly managesAccounts: boolean
  /** true → the app may switch roles for demo; false → role is fixed by Circle. */
  readonly allowsRoleSwitch: boolean

  // --- Auth ---
  /** Restore the current identity if the device already has a session. */
  getMe(): Promise<HierarchyIdentity | null>
  /** Password sign-in (mock/provisional only). */
  authenticatePassword(mobile: string, password: string): Promise<HierarchyIdentity | null>
  /** Begin Circle SSO (redirect). No-op/throws under mock. */
  beginSso(): Promise<void>
  /** Provision a new account (mock only; throws when Circle owns accounts). */
  register(input: RegisterDraft): Promise<HierarchyIdentity>
  logout(): Promise<void>

  // --- Hierarchy (read-only consumption of Circle's tree) ---
  listSupervisors(): Promise<SupervisorOption[]>
  listCrew(supervisorId: string): Promise<CrewResult>
}

/** Map Circle's four tiers onto the app's current three UI roles. */
export function toAppRole(r: CircleRole): Role {
  switch (r) {
    case 'worker':
      return 'worker'
    case 'supervisor':
      return 'supervisor'
    // Company Owner has no dedicated experience yet — treat as an admin view
    // until a Company Owner surface is built. Platform Owner = platform admin.
    case 'company_owner':
    case 'platform_owner':
      return 'admin'
  }
}
