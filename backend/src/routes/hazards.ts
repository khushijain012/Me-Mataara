import { Router } from 'express'
import { z } from 'zod'
import type { HazardCategory } from '@prisma/client'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, currentMember, requireRole } from '../middleware/auth.js'

export const hazardsRouter = Router()
hazardsRouter.use(authenticate)

// The frontend HazardCategory uses `active` + `image`; the DB uses the universal
// `is_active` and a `data_url` column (Prisma field `image`). Map at the edge.
function toDto(h: HazardCategory) {
  return {
    id: h.id,
    label: h.label,
    maoriLabel: h.maoriLabel ?? undefined,
    icon: h.icon,
    image: h.image,
    description: h.description,
    tint: h.tint,
    active: h.isActive,
  }
}

// GET /hazards — workers get active only; admins get everything (to edit).
hazardsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const where = me.role === 'admin' ? {} : { isActive: true }
    const hazards = await prisma.hazardCategory.findMany({ where, orderBy: { sortOrder: 'asc' } })
    res.json(hazards.map(toDto))
  }),
)

const hazardSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  maoriLabel: z.string().nullish(),
  icon: z.string().default(''),
  image: z.string().default(''),
  description: z.string().default(''),
  tint: z.string().default('pounamu'),
  active: z.boolean().default(true),
})

// PUT /hazards — full replace (upsert present, delete missing, order by index). Admin only.
hazardsRouter.put(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const items = z.array(hazardSchema).parse(req.body)
    const ids = items.map((h) => h.id)
    await prisma.$transaction([
      ...items.map((h, i) => {
        const data = {
          label: h.label,
          maoriLabel: h.maoriLabel ?? null,
          icon: h.icon,
          image: h.image,
          description: h.description,
          tint: h.tint,
          isActive: h.active,
          isDeleted: false, // revive if this id was previously soft-deleted
          sortOrder: i,
        }
        return prisma.hazardCategory.upsert({
          where: { id: h.id },
          update: data,
          create: { id: h.id, ...data },
        })
      }),
      prisma.hazardCategory.deleteMany({ where: { id: { notIn: ids } } }),
    ])
    const saved = await prisma.hazardCategory.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json(saved.map(toDto))
  }),
)
