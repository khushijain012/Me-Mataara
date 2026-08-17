import type {
  Concern,
  ConcernPhoto,
  ConcernRisk,
  CorrectiveAction,
  Member,
} from '@prisma/client'
import type {
  ConcernDto,
  CorrectiveActionDto,
  HierarchyIdentityDto,
} from '../types.js'

const iso = (d: Date | null | undefined): string | undefined => d?.toISOString()

/** Project a Member row to the identity shape the PWA consumes. */
export function toIdentity(m: Member): HierarchyIdentityDto {
  return {
    memberId: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    mobile: m.mobile,
    circleRole: m.circleRole,
    companyId: m.companyId,
    companyName: m.companyName,
    supervisorId: m.supervisorId,
    supervisorName: m.supervisorName,
    dob: m.dob ?? undefined,
    gender: m.gender ?? undefined,
    industry: m.industry ?? undefined,
    isHSR: m.isHSR,
    workerNumber: m.workerNumber ?? undefined,
    nzbn: m.nzbn ?? undefined,
    organisation: m.organisation ?? undefined,
  }
}

function toAction(a: CorrectiveAction): CorrectiveActionDto {
  return {
    id: a.id,
    author: a.authorName,
    role: a.role,
    message: a.message,
    at: a.at.toISOString(),
    promptId: a.promptId ?? undefined,
    responseType: a.responseType,
  }
}

/**
 * Project a Concern (with actions) to the frontend shape.
 * Anonymity (doc §4): when raised anonymously, the reporter's name/id are
 * withheld from everyone except the reporter themselves — enforced here, never
 * relied on in the client.
 */
export function toConcern(
  c: Concern & { actions: CorrectiveAction[]; risks: ConcernRisk[]; photos: ConcernPhoto[] },
  viewerId: string,
): ConcernDto {
  const hideReporter = c.reportedAnonymous && c.reportedById !== viewerId
  // Rebuild the flat riskIds[]/photos[] the frontend expects from the linking
  // and child tables (primary risk first; photos in their captured order).
  const riskIds = [...c.risks]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .map((r) => r.categoryId)
  const photos = [...c.photos].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.dataUrl)
  return {
    id: c.id,
    ref: c.ref,
    categoryId: c.categoryId,
    riskIds,
    description: c.description,
    photos,
    status: c.status,
    sceneDate: c.sceneDate ?? undefined,
    reportedBy: hideReporter ? 'Anonymous' : c.reportedByName,
    reportedById: hideReporter ? '' : c.reportedById,
    reportedAnonymous: c.reportedAnonymous,
    reportedAt: c.reportedAt.toISOString(),
    assignedTo: c.assignedTo ?? undefined,
    supervisorId: c.supervisorId ?? undefined,
    closedAt: c.closedAt ?? undefined,
    closedAtIso: iso(c.closedAtIso),
    timeToCloseHours: c.timeToCloseHours ?? undefined,
    riskReduction: c.riskReduction ?? undefined,
    actions: [...c.actions]
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map(toAction),
    offline: c.offline,
    captureStatus: c.captureStatus ?? undefined,
    capturedAt: iso(c.capturedAt),
    syncedAt: iso(c.syncedAt),
  }
}
