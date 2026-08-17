// DTO shapes returned to the PWA. These mirror the frontend contracts in
// src/lib/types.ts and src/lib/identity/types.ts so the app can consume the API
// behind its existing seams (apiFetch + IdentityProvider) without reshaping.

import type { AppRole, CircleRole } from '@prisma/client'

/** Resolved identity — matches HierarchyIdentity in src/lib/identity/types.ts. */
export interface HierarchyIdentityDto {
  memberId: string
  firstName: string
  lastName: string
  email: string
  mobile: string
  circleRole: CircleRole
  companyId: string | null
  companyName: string | null
  supervisorId: string | null
  supervisorName: string | null
  dob?: string
  gender?: string
  industry?: string
  isHSR?: boolean
  workerNumber?: string
  nzbn?: string
  organisation?: string
}

/** Matches CorrectiveAction in src/lib/types.ts. */
export interface CorrectiveActionDto {
  id: string
  author: string
  role: AppRole
  message: string
  at: string
  promptId?: string
  responseType: 'preset' | 'custom'
}

/** Matches Concern in src/lib/types.ts. */
export interface ConcernDto {
  id: string
  ref: string
  categoryId: string
  riskIds: string[]
  description: string
  photos: string[]
  status: 'open' | 'in_progress' | 'closed'
  sceneDate?: string
  reportedBy: string
  reportedById: string
  reportedAnonymous?: boolean
  reportedAt: string
  assignedTo?: string
  supervisorId?: string
  closedAt?: string
  closedAtIso?: string
  timeToCloseHours?: number
  riskReduction?: string
  actions: CorrectiveActionDto[]
  offline?: boolean
  captureStatus?: 'captured' | 'queued' | 'synced' | 'failed'
  capturedAt?: string
  syncedAt?: string
}

/** Matches SupervisorOption in src/lib/identity/types.ts. */
export interface SupervisorOptionDto {
  id: string
  name: string
  crew: string
  approval: 'approved' | 'awaiting_approval'
}

/** Matches CrewMember / CrewResult in src/lib/identity/types.ts. */
export interface CrewMemberDto {
  memberId: string
  name: string
  initials: string
  color?: string
  supervisorId: string | null
}
export interface CrewResultDto {
  crew: CrewMemberDto[]
  unclaimed: CrewMemberDto[]
}
