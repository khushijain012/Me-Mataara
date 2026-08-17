import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { conflict, notFound } from '../lib/httpError.js'
import { hashPassword } from '../auth/password.js'
import { nextUserId } from '../lib/userId.js'

// Admin user management. Accounts will move to Circle later; for now we own them.
export const membersRouter = Router()
membersRouter.use(authenticate, requireRole('admin'))

// The app's role → Circle role (the normalised member_role points at system_role
// by this code; auth uses the denormalised columns).
const CIRCLE_ROLE = {
  worker: 'worker',
  supervisor: 'supervisor',
  admin: 'platform_owner',
} as const

/** Shape returned to the admin Users screen (mirrors the GET /members rows). */
function toRow(m: Prisma.MemberGetPayload<object>) {
  return {
    id: m.id,
    userId: m.workerId ?? '',
    name: `${m.firstName} ${m.lastName}`.trim(),
    initials: m.initials ?? '',
    color: m.avatarColor ?? 'bg-pounamu-600',
    role: m.role,
    crew: m.crew ?? '',
    site: m.companyName ?? '',
    status: m.approval === 'awaiting_approval' ? 'pending' : 'active',
  }
}

const createSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  mobile: z.string().trim().min(6),
  email: z.string().trim().email(),
  role: z.enum(['worker', 'supervisor', 'admin']).default('worker'),
  password: z.string().min(5),
  supervisorId: z.string().trim().optional(),
  organisation: z.string().trim().optional().default(''),
})

// GET /members — list workers + supervisors for the Users screen.
membersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const members = await prisma.member.findMany({ orderBy: { firstName: 'asc' } })
    res.json(members.map(toRow))
  }),
)

// POST /members — create a worker / supervisor / admin account.
membersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body)
    const circleRole = CIRCLE_ROLE[input.role]

    // Resolve the claimed supervisor (only meaningful for workers).
    let supervisorId: string | null = input.supervisorId || null
    let supervisorName: string | null = null
    if (supervisorId) {
      const sup = await prisma.member.findUnique({ where: { id: supervisorId } })
      if (!sup) supervisorId = null
      else supervisorName = `${sup.firstName} ${sup.lastName}`.trim()
    }

    const initials =
      (input.firstName[0] ?? '').toUpperCase() + (input.lastName[0] ?? '').toUpperCase()

    let member: Prisma.MemberGetPayload<object>
    try {
      member = await prisma.member.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          mobile: input.mobile,
          passwordHash: await hashPassword(input.password),
          workerId: await nextUserId(input.role),
          circleRole,
          role: input.role,
          organisation: input.organisation || null,
          companyName: input.organisation || null,
          supervisorId,
          supervisorName,
          initials,
          avatarColor: 'bg-pounamu-600',
          verificationStatus: 'verified',
          approval: 'approved',
        },
      })
    } catch (err) {
      // Unique constraint on mobile / email.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const field = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'mobile or email'
        throw conflict(`A user with that ${field} already exists`)
      }
      throw err
    }

    // Keep the normalised member_role in sync (best-effort; auth uses the
    // denormalised columns above).
    const systemRole = await prisma.systemRole.findUnique({ where: { code: circleRole } })
    if (systemRole) {
      await prisma.memberRole.create({ data: { memberId: member.id, roleId: systemRole.id } })
    }

    res.status(201).json(toRow(member))
  }),
)

// DELETE /members/:id — remove a member and their reported concerns.
membersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } })
    if (!member) throw notFound('Member not found')

    await prisma.$transaction([
      // Their reported concerns go first (corrective actions cascade).
      prisma.concern.deleteMany({ where: { reportedById: member.id } }),
      // Remaining references (authored actions, notifications, supervised
      // concerns, crew edges) are SetNull by the schema.
      prisma.member.delete({ where: { id: member.id } }),
    ])

    res.json({ ok: true })
  }),
)
