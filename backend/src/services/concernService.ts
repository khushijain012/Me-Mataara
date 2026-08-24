import { z } from 'zod'
import { Prisma } from '@prisma/client'
import type { Member } from '@prisma/client'
import { prisma } from '../prisma.js'
import { nextConcernRef } from '../lib/ref.js'
import { deleteStorageFiles } from '../lib/fileStorage.js'
import { storePhotoDataUrl, type StoredPhoto } from '../lib/photos.js'

export const createConcernSchema = z.object({
  categoryId: z.string().min(1),
  riskIds: z.array(z.string()).default([]),
  description: z.string().default(''),
  photos: z.array(z.string()).max(10).default([]), // base64 data URLs; written to disk on arrival
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
 * are written as normalised child rows (concern_risk / concern_photo); photo bytes
 * go to disk under storage/photos/ and the row keeps only the key.
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

  // Decode the uploads to disk first — a rejected photo should fail the request
  // before a concern exists, and files written for a request that then fails are
  // unlinked below rather than left orphaned in storage.
  const storedPhotos: StoredPhoto[] = []
  try {
    for (const dataUrl of input.photos) {
      storedPhotos.push(await storePhotoDataUrl(dataUrl, capturedAt))
    }
  } catch (err) {
    await deleteStorageFiles(storedPhotos.map((p) => p.storageKey))
    throw err
  }

  // A failed insert must not leave the files it was going to reference behind.
  const discardPhotos = async (err: unknown) => {
    await deleteStorageFiles(storedPhotos.map((p) => p.storageKey))
    throw err
  }

  const concern = await prisma.concern
    .create({
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
          create: storedPhotos.map((photo, i) => ({ ...photo, sortOrder: i })),
        },
      },
      include: concernInclude,
    })
    .catch(discardPhotos)

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

/**
 * Photos whose concern (or own row) has been soft-deleted for longer than
 * `retentionDays` — i.e. records nothing in the app can reach any more.
 *
 * Deletes in this codebase are soft (see src/prisma.ts): the rows survive with
 * `is_deleted = true`, so nothing may unlink a photo file at delete time without
 * leaving a surviving row pointing at missing bytes. Reclaiming that disk is a
 * deliberate, separate step — `npm run photos:purge`.
 */
export async function findPurgeablePhotos(retentionDays: number): Promise<
  Array<{ id: string; storageKey: string }>
> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  // Raw, because the soft-delete extension rewrites reads to hide exactly the
  // rows this needs to find.
  return prisma.$queryRaw<Array<{ id: string; storageKey: string }>>`
    SELECT p.id, p.storage_key AS "storageKey"
    FROM concern_photo p
    JOIN concern c ON c.id = p.concern_id
    WHERE p.storage_key <> ''
      AND (
        (p.is_deleted AND p.deleted_at < ${cutoff})
        OR (c.is_deleted AND c.deleted_at < ${cutoff})
      )
  `
}

/**
 * Hard-delete the given photo rows. Raw, to bypass the soft-delete rewrite — a
 * purge is the one place a row is genuinely meant to go away, and it runs only
 * after the backing file has been unlinked.
 */
export async function hardDeletePhotoRows(ids: readonly string[]): Promise<number> {
  if (ids.length === 0) return 0
  return prisma.$executeRaw`DELETE FROM concern_photo WHERE id IN (${Prisma.join([...ids])})`
}
