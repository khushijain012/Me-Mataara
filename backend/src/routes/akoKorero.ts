import { Router } from 'express'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'

export const akoKoreroRouter = Router()
akoKoreroRouter.use(authenticate)

// GET /ako-korero — cultural learning content shown in the app.
akoKoreroRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.akoKorero.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json(items.map((a) => ({ id: a.id, title: a.title, body: a.body })))
  }),
)
