import { CREW, DEFAULT_SUPERVISOR, SUPERVISORS } from '@/lib/mockData'
import { hashPassword } from '@/lib/utils'
import type {
  CrewResult,
  HierarchyIdentity,
  IdentityProvider,
  RegisterDraft,
  SupervisorOption,
} from './types'

/**
 * Device-local prototype identity provider. Reproduces the original in-app
 * behaviour: one self-registered worker per device, mobile+password sign-in.
 *
 * PROTOTYPE ONLY. The client's decision moves accounts + hierarchy into Circle;
 * this exists so the demo keeps working while Circle's APIs are pending. All
 * password handling here is provisional — the real path is token-based SSO with
 * no client-side hashing (see circleProvider).
 */

const LS_KEY = 'nqr.identity'

interface StoredAccount {
  identity: HierarchyIdentity
  mobile: string
  passwordHash: string
}

function load(): StoredAccount | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as StoredAccount
  } catch {
    /* ignore */
  }
  return null
}

function save(acc: StoredAccount) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(acc))
  } catch {
    /* quota / private mode — ignore */
  }
}

const norm = (s: string) => s.replace(/\s/g, '')

export const mockProvider: IdentityProvider = {
  kind: 'mock',
  supportsPasswordLogin: true,
  managesAccounts: true,
  allowsRoleSwitch: true,

  async getMe() {
    return load()?.identity ?? null
  },

  async authenticatePassword(mobile, password) {
    const acc = load()
    if (!acc) return null
    const hash = await hashPassword(password)
    if (norm(acc.mobile) === norm(mobile) && acc.passwordHash === hash) {
      return acc.identity
    }
    return null
  },

  async beginSso() {
    throw new Error('SSO is not available in the mock provider.')
  },

  async register(input: RegisterDraft) {
    const passwordHash = await hashPassword(input.password)
    const identity: HierarchyIdentity = {
      memberId: 'u-self',
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      mobile: input.mobile,
      // Self-registered users are workers; the other tiers are provisioned in Circle.
      circleRole: 'worker',
      companyId: input.nzbn || null,
      companyName: input.organisation || null,
      // "Claim your supervisor" — under Circle this edge is owned upstream; here
      // we record the worker's pick (falling back to the default supervisor).
      supervisorId: input.supervisorId || DEFAULT_SUPERVISOR.id,
      supervisorName: input.supervisorName || DEFAULT_SUPERVISOR.name,
      dob: input.dob,
      gender: input.gender,
      industry: input.industry,
      isHSR: input.isHSR,
      workerNumber: input.workerNumber?.trim() || undefined,
      nzbn: input.nzbn,
      organisation: input.organisation,
    }
    save({ identity, mobile: input.mobile, passwordHash })
    return identity
  },

  async logout() {
    // Keep the account on the device so the login screen can show "registered
    // as …" (matches the original prototype). Session state is cleared by the
    // app layer, not here.
  },

  async listSupervisors(): Promise<SupervisorOption[]> {
    return SUPERVISORS.map((s) => ({ id: s.id, name: s.name, crew: s.crew, approval: s.approval }))
  },

  async listCrew(supervisorId: string): Promise<CrewResult> {
    return {
      crew: CREW.filter((c) => c.supervisorId === supervisorId).map((c) => ({
        memberId: c.name,
        name: c.name,
        initials: c.initials,
        color: c.color,
        supervisorId: c.supervisorId,
      })),
      unclaimed: CREW.filter((c) => c.supervisorId === null).map((c) => ({
        memberId: c.name,
        name: c.name,
        initials: c.initials,
        color: c.color,
        supervisorId: null,
      })),
    }
  },
}
