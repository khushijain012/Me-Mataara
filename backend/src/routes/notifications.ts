import { Router } from 'express'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, currentMember } from '../middleware/auth.js'

export const notificationsRouter = Router()
notificationsRouter.use(authenticate)

// GET /notifications — the caller's notifications, newest first.
notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const items = await prisma.notification.findMany({
      where: { recipientId: me.id },
      orderBy: { at: 'desc' },
      take: 100,
    })
    res.json(items)
  }),
)

// POST /notifications/read-all — mark all the caller's notifications read.
notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    await prisma.notification.updateMany({
      where: { recipientId: me.id, read: false },
      data: { read: true },
    })
    res.json({ ok: true })
  }),
)
