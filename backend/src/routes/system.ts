import { Router } from 'express'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, currentMember, requireRole } from '../middleware/auth.js'

export const systemRouter = Router()
systemRouter.use(authenticate)

// GET /system/sync-events — caller's sync history (admins see everything).
systemRouter.get(
  '/sync-events',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const where = me.role === 'admin' ? {} : { memberId: me.id }
    const events = await prisma.syncEvent.findMany({ where, orderBy: { at: 'desc' }, take: 50 })
    res.json(events)
  }),
)

// GET /system/errors — error / retry log (admin only).
systemRouter.get(
  '/errors',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const errors = await prisma.errorLog.findMany({ orderBy: { at: 'desc' }, take: 50 })
    res.json(errors)
  }),
)
