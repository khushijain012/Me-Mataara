import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export const promptsRouter = Router()
promptsRouter.use(authenticate)

// GET /prompts — preset supervisor responses (active only). Frontend uses {id,label}.
promptsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const prompts = await prisma.supervisorPrompt.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json(prompts.map((p) => ({ id: p.id, label: p.label })))
  }),
)

const promptSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

// PUT /prompts — full replace (upsert present, delete missing). Admin only.
promptsRouter.put(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const items = z.array(promptSchema).parse(req.body)
    const ids = items.map((p) => p.id)
    await prisma.$transaction([
      ...items.map((p, i) =>
        prisma.supervisorPrompt.upsert({
          where: { id: p.id },
          update: { label: p.label, sortOrder: i, isDeleted: false },
          create: { id: p.id, label: p.label, sortOrder: i },
        }),
      ),
      prisma.supervisorPrompt.deleteMany({ where: { id: { notIn: ids } } }),
    ])
    const saved = await prisma.supervisorPrompt.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json(saved.map((p) => ({ id: p.id, label: p.label })))
  }),
)
