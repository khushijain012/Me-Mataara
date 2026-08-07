export type Role = 'worker' | 'supervisor' | 'admin'

export interface User {
  id: string
  name: string
  role: Role
  crew: string
  site: string
  initials: string
  avatarColor: string
}

export type ConcernStatus = 'open' | 'in_progress' | 'closed'

export interface HazardCategory {
  id: string
  label: string
  maoriLabel?: string // nickname shown on the risk image (doc §3)
  icon: string // lucide icon name
  image: string // doc §3: each risk shown WITH its matching image (embedded data-URL)
  description: string
  tint: string // tailwind color token for the tile
  active: boolean
}

// Doc §4: which prompt or response the supervisor used (preset vs custom).
export type ResponseType = 'preset' | 'custom'

export interface CorrectiveAction {
  id: string
  author: string
  role: Role
  message: string
  at: string // ISO
  promptId?: string // preset supervisor prompt used
  responseType: ResponseType
}

// Per-record offline capture state (doc §6: held on device, synced on reconnect).
export type CaptureStatus = 'captured' | 'queued' | 'synced' | 'failed'

export interface Concern {
  id: string
  ref: string // human ref e.g. HZ-1042
  categoryId: string // primary risk selected
  riskIds: string[] // selected risk(s) from the fixed list (doc §3)
  description: string // doc §4: richer detail captured up front
  status: ConcernStatus // Open / In Progress / Closed (doc §4)
  sceneDate?: string // "when noticed" (ISO date)
  reportedBy: string
  reportedById: string // worker–supervisor linkage (who reported)
  reportedAnonymous?: boolean // doc §4: worker may raise a concern anonymously
  reportedAt: string // ISO
  assignedTo?: string // supervisor display name
  supervisorId?: string // linked supervisor (routing — one supervisor per concern)
  closedAt?: string // closure date (ISO date)
  closedAtIso?: string // full timestamp used to compute time-to-close
  timeToCloseHours?: number // doc §4: cycle-time metric
  riskReduction?: string // doc §4: the reduction in risk at the point of closing
  actions: CorrectiveAction[]
  offline?: boolean // pending sync
  captureStatus?: CaptureStatus // offline capture status
  capturedAt?: string // ISO — when captured on device
  syncedAt?: string // ISO — when it reached the server
}

// Sync status — timestamp + success/failure (doc §6).
export interface SyncEvent {
  id: string
  at: string // ISO
  result: 'success' | 'failure'
  count: number // records synced
  message?: string
}

// Error / retry logs (offline resilience).
export interface ErrorLog {
  id: string
  at: string // ISO
  code: string
  message: string
  retries: number
  resolved: boolean
}

// Registration profile (doc §1 + §2 fields).
export type Gender = 'female' | 'male' | 'gender_diverse' | 'prefer_not' | ''
export type VerificationStatus = 'unverified' | 'verified'

export interface RegisteredProfile {
  firstName: string
  lastName: string
  dob: string // ISO date
  age: number // derived from DOB, stored
  gender: Gender // optional demographic — reported in aggregate only (doc §2)
  ageBand: string // demographic age band derived from DOB (aggregate reporting)
  industry: string // doc §2: NZ industry category (not personal — granular reporting)
  mobile: string
  email: string // doc §1: email captured at registration
  isHSR: boolean // holds a health & safety role in their business (doc §1)
  workerNumber?: string // doc §1: optional, never blocks registration
  nzbn: string // stored behind the company-name lookup (doc §1)
  organisation: string
  passwordHash: string // password stored encrypted (SHA-256 hash, never plaintext)
  verificationStatus: VerificationStatus
  supervisorId: string // doc §5: worker claims their supervisor
  supervisorName: string
}

// Cultural learning content shown in the app.
export interface AkoKorero {
  id: string
  title: string
  body: string
}

// Editable preset supervisor prompt (doc §4: selectable prompts).
export interface SupervisorPrompt {
  id: string
  label: string
}

export interface AppNotification {
  id: string
  kind: 'new_concern' | 'status' | 'reminder' | 'closed'
  title: string
  body: string
  at: string
  read: boolean
  concernRef?: string
}
