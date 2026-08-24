import { Router } from 'express'
import { z } from 'zod'
import type { MediaAsset, QuickLink, QuickLinkType } from '@prisma/client'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { badRequest } from '../lib/httpError.js'

// Quick links, bucketed as docs / videos (#6).
export const quickLinksRouter = Router()
quickLinksRouter.use(authenticate)

function toDto(l: QuickLink & { type: QuickLinkType; media: MediaAsset | null }) {
  return {
    id: l.id,
    title: l.title,
    type: l.type.code, // docs | videos
    url: l.externalUrl ?? (l.media ? l.media.storageUrl : null),
    mediaId: l.mediaId ?? undefined,
    sortOrder: l.sortOrder,
  }
}

// GET /quick-links — list (optionally by type: docs/videos).
quickLinksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const typeCode = typeof req.query.type === 'string' ? req.query.type : undefined
    const links = await prisma.quickLink.findMany({
      where: typeCode ? { type: { code: typeCode } } : {},
      include: { type: true, media: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json(links.map(toDto))
  }),
)

const createSchema = z
  .object({
    title: z.string().min(1),
    type: z.enum(['docs', 'videos']),
    externalUrl: z.string().url().optional(),
    mediaId: z.string().optional(),
    sortOrder: z.number().int().optional().default(0),
  })
  .refine((v) => v.externalUrl || v.mediaId, {
    message: 'Provide either an externalUrl or a mediaId',
  })

// POST /quick-links — create (admin).
quickLinksRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body)
    const type = await prisma.quickLinkType.findUnique({ where: { code: input.type } })
    if (!type) throw badRequest('Unknown quick-link type')

    const link = await prisma.quickLink.create({
      data: {
        title: input.title,
        typeId: type.id,
        externalUrl: input.externalUrl ?? null,
        mediaId: input.mediaId ?? null,
        sortOrder: input.sortOrder,
      },
      include: { type: true, media: true },
    })
    res.status(201).json(toDto(link))
  }),
)

// DELETE /quick-links/:id — soft-delete (admin).
quickLinksRouter.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await prisma.quickLink.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  }),
)
