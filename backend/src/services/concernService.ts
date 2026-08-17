import { z } from 'zod'
import type { Member } from '@prisma/client'
import { prisma } from '../prisma.js'
import { nextConcernRef } from '../lib/ref.js'

export const createConcernSchema = z.object({
  categoryId: z.string().min(1),
  riskIds: z.array(z.string()).default([]),
  description: z.string().default(''),
  photos: z.array(z.string()).max(10).default([]),
  sceneDate: z.string().optional(),
  reportedAnonymous: z.boolean().optional().default(false),
  offline: z.boolean().optional().default(false),
  clientId: z.string().optional(), // idempotency key for offline dedupe
  capturedAt: z.string().datetime().optional(),
})

export type CreateConcernInput = z.infer<typeof createConcernSchema>

// Concern + everything the DTO needs to rebuild the frontend shape.
export const concernInclude = { actions: true, risks: true, photos: true } as const

/**
 * Create a concern for a member, routed to their supervisor. Risks and photos
 * are written as normalised child rows (concern_risk / concern_photo).
 * Idempotent on `clientId` so a replayed offline queue never duplicates.
 */
export async function createConcern(me: Member, input: CreateConcernInput) {
  if (input.clientId) {
    const existing = await prisma.concern.findUnique({
      where: { clientId: input.clientId },
      include: concernInclude,
    })
    if (existing) return { concern: existing, created: false }
  }

  const now = new Date()
  const capturedAt = input.capturedAt ? new Date(input.capturedAt) : now
  const ref = await nextConcernRef()
  const riskIds = input.riskIds.length ? input.riskIds : [input.categoryId]

  const concern = await prisma.concern.create({
    data: {
      ref,
      clientId: input.clientId ?? null,
      categoryId: input.categoryId,
      description: input.description,
      status: 'open',
      sceneDate: input.sceneDate ?? null,
      reportedById: me.id,
      reportedByName: `${me.firstName} ${me.lastName}`.trim(),
      reportedAnonymous: input.reportedAnonymous,
      reportedAt: now,
      supervisorId: me.supervisorId,
      assignedTo: me.supervisorName,
      companyId: me.companyId,
      nzbn: me.nzbn,
      offline: input.offline,
      captureStatus: input.offline ? 'queued' : 'synced',
      capturedAt,
      syncedAt: input.offline ? null : now,
      risks: {
        create: riskIds.map((categoryId) => ({
          categoryId,
          isPrimary: categoryId === input.categoryId,
        })),
      },
      photos: {
        create: input.photos.map((dataUrl, i) => ({ dataUrl, sortOrder: i })),
      },
    },
    include: concernInclude,
  })

  return { concern, created: true }
}

/** Route the "new concern" alert to the linked supervisor. */
export async function notifySupervisorOfNewConcern(concern: {
  supervisorId: string | null
  ref: string
}) {
  if (!concern.supervisorId) return
  await prisma.notification.create({
    data: {
      recipientId: concern.supervisorId,
      kind: 'new_concern',
      title: 'New concern raised',
      body: `${concern.ref} — sent to you.`,
      concernRef: concern.ref,
    },
  })
}
