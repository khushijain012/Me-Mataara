import { Router } from 'express'
import { z } from 'zod'
import type { Member, Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, currentMember } from '../middleware/auth.js'
import { forbidden, notFound } from '../lib/httpError.js'
import { toConcern } from '../lib/dto.js'
import {
  concernInclude,
  createConcern,
  createConcernSchema,
  notifySupervisorOfNewConcern,
} from '../services/concernService.js'

export const concernsRouter = Router()
concernsRouter.use(authenticate)

/** Concern visibility by role: worker → own, supervisor → routed-to-me, admin → all. */
function scopeFilter(me: Member): Prisma.ConcernWhereInput {
  if (me.role === 'admin') return {}
  if (me.role === 'supervisor') return { supervisorId: me.id }
  return { reportedById: me.id }
}

/** Only a supervisor the concern is routed to, or an admin, may act on it. */
function assertCanManage(me: Member, concern: { supervisorId: string | null }) {
  if (me.role === 'admin') return
  if (me.role === 'supervisor' && concern.supervisorId === me.id) return
  throw forbidden('You cannot manage this concern')
}

async function notify(
  recipientId: string | null,
  kind: 'new_concern' | 'status' | 'reminder' | 'closed',
  title: string,
  body: string,
  concernRef?: string,
) {
  await prisma.notification.create({ data: { recipientId, kind, title, body, concernRef } })
}

// ---- Create ------------------------------------------------------------------

// POST /concerns — raise a concern, routed to the reporter's supervisor.
concernsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const input = createConcernSchema.parse(req.body)
    const { concern, created } = await createConcern(me, input)
    if (created && !input.offline) await notifySupervisorOfNewConcern(concern)
    res.status(created ? 201 : 200).json(toConcern(concern, me.id))
  }),
)

// ---- List --------------------------------------------------------------------

const listQuery = z.object({
  status: z.enum(['open', 'in_progress', 'closed']).optional(),
  since: z.string().datetime().optional(),
  ref: z.string().optional(),
})

// GET /concerns — role-scoped list with optional status/since/ref filters.
concernsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const q = listQuery.parse(req.query)
    const where: Prisma.ConcernWhereInput = {
      ...scopeFilter(me),
      ...(q.status ? { status: q.status } : {}),
      ...(q.ref ? { ref: q.ref } : {}),
      ...(q.since ? { reportedAt: { gte: new Date(q.since) } } : {}),
    }
    const concerns = await prisma.concern.findMany({
      where,
      include: concernInclude,
      orderBy: { reportedAt: 'desc' },
    })
    res.json(concerns.map((c) => toConcern(c, me.id)))
  }),
)

/** Fetch a concern the member is allowed to see, by ref (HZ-####) or id. */
async function findVisible(me: Member, key: string) {
  const concern = await prisma.concern.findFirst({
    where: { AND: [scopeFilter(me), { OR: [{ ref: key }, { id: key }] }] },
    include: concernInclude,
  })
  if (!concern) throw notFound('Concern not found')
  return concern
}

// GET /concerns/:key — detail by ref or id (anonymity applied in the DTO).
concernsRouter.get(
  '/:key',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const concern = await findVisible(me, req.params.key)
    res.json(toConcern(concern, me.id))
  }),
)

// ---- Status / close / responses ---------------------------------------------

const statusSchema = z.object({ status: z.enum(['open', 'in_progress']) })

// PATCH /concerns/:id/status — move to open/in_progress (closing has its own route).
concernsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const { status } = statusSchema.parse(req.body)
    const concern = await prisma.concern.findUnique({ where: { id: req.params.id }, include: concernInclude })
    if (!concern) throw notFound('Concern not found')
    assertCanManage(me, concern)

    const updated = await prisma.concern.update({
      where: { id: concern.id },
      data: {
        status,
        // Reverting from closed clears the closure fields.
        closedAt: null,
        closedAtIso: null,
        timeToCloseHours: null,
        riskReduction: null,
      },
      include: concernInclude,
    })
    res.json(toConcern(updated, me.id))
  }),
)

const closeSchema = z.object({ riskReduction: z.string().default('') })

// POST /concerns/:id/close — close with an outcome; cycle-time computed here.
concernsRouter.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const { riskReduction } = closeSchema.parse(req.body)
    const concern = await prisma.concern.findUnique({ where: { id: req.params.id }, include: concernInclude })
    if (!concern) throw notFound('Concern not found')
    assertCanManage(me, concern)

    const closedAtIso = new Date()
    const hrs = (closedAtIso.getTime() - concern.reportedAt.getTime()) / 3_600_000
    const updated = await prisma.concern.update({
      where: { id: concern.id },
      data: {
        status: 'closed',
        closedAt: closedAtIso.toISOString().slice(0, 10),
        closedAtIso,
        timeToCloseHours: Math.max(0, Math.round(hrs * 10) / 10),
        riskReduction: riskReduction.trim() || null,
      },
      include: concernInclude,
    })
    await notify(concern.reportedById, 'closed', 'Concern closed', `${concern.ref} · closed and recorded.`, concern.ref)
    res.json(toConcern(updated, me.id))
  }),
)

const actionSchema = z.object({
  message: z.string().min(1),
  promptId: z.string().optional(),
})

// POST /concerns/:id/actions — supervisor/admin response (preset or custom).
concernsRouter.post(
  '/:id/actions',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const { message, promptId } = actionSchema.parse(req.body)
    const concern = await prisma.concern.findUnique({ where: { id: req.params.id } })
    if (!concern) throw notFound('Concern not found')
    assertCanManage(me, concern)

    const updated = await prisma.concern.update({
      where: { id: concern.id },
      data: {
        status: concern.status === 'open' ? 'in_progress' : concern.status,
        assignedTo: concern.assignedTo ?? `${me.firstName} ${me.lastName}`.trim(),
        actions: {
          create: {
            authorId: me.id,
            authorName: `${me.firstName} ${me.lastName}`.trim(),
            role: me.role,
            message,
            promptId: promptId ?? null,
            responseType: promptId ? 'preset' : 'custom',
          },
        },
      },
      include: concernInclude,
    })
    await notify(concern.reportedById, 'status', 'Update on your concern', `${concern.ref} · your supervisor responded.`, concern.ref)
    res.json(toConcern(updated, me.id))
  }),
)
