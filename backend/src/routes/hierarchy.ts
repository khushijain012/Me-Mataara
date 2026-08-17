import { Router } from 'express'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'
import type { CrewResultDto, SupervisorOptionDto } from '../types.js'

export const hierarchyRouter = Router()

// GET /supervisors — the "claim your supervisor" list (approved + awaiting).
// Public: the registration dropdown and the app's on-mount fetch run pre-auth.
hierarchyRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const sups = await prisma.member.findMany({
      where: { circleRole: 'supervisor' },
      orderBy: { firstName: 'asc' },
    })
    const out: SupervisorOptionDto[] = sups.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      crew: s.crew ?? '',
      approval: s.approval ?? 'awaiting_approval',
    }))
    res.json(out)
  }),
)

// GET /supervisors/:id/crew — claimed crew + unclaimed workers (to chase).
hierarchyRouter.get(
  '/:id/crew',
  authenticate,
  asyncHandler(async (req, res) => {
    const supervisorId = req.params.id
    const [crew, unclaimed] = await Promise.all([
      prisma.member.findMany({ where: { circleRole: 'worker', supervisorId } }),
      prisma.member.findMany({ where: { circleRole: 'worker', supervisorId: null } }),
    ])
    const map = (m: (typeof crew)[number]) => ({
      memberId: m.id,
      name: `${m.firstName} ${m.lastName}`.trim(),
      initials: m.initials ?? '',
      color: m.avatarColor ?? undefined,
      supervisorId: m.supervisorId,
    })
    const out: CrewResultDto = { crew: crew.map(map), unclaimed: unclaimed.map(map) }
    res.json(out)
  }),
)
