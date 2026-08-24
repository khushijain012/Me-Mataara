import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, currentMember } from '../middleware/auth.js'
import { toConcern } from '../lib/dto.js'
import {
  createConcern,
  createConcernSchema,
  notifySupervisorOfNewConcern,
} from '../services/concernService.js'

export const syncRouter = Router()
syncRouter.use(authenticate)

// Queued concerns arrive with offline=true; the server stores them as synced.
const syncSchema = z.object({
  concerns: z.array(createConcernSchema).default([]),
})

// POST /sync — flush the offline queue. Each item is created idempotently
// (dedup on clientId), then recorded as a single timestamped sync event.
syncRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const { concerns } = syncSchema.parse(req.body)

    const synced = []
    let failures = 0
    for (const item of concerns) {
      try {
        // Store as landed on the server (clear the offline flag).
        const { concern, created } = await createConcern(me, { ...item, offline: false })
        if (created) await notifySupervisorOfNewConcern(concern)
        synced.push(toConcern(concern, me.id))
      } catch {
        failures += 1
      }
    }

    const result = failures ? 'failure' : 'success'
    const message =
      synced.length === 0 && failures === 0
        ? 'Nothing to sync'
        : `${synced.length} record${synced.length === 1 ? '' : 's'} synced` +
          (failures ? `, ${failures} failed` : '')

    const event = await prisma.syncEvent.create({
      data: { memberId: me.id, result, count: synced.length, message },
    })

    res.json({ synced, event })
  }),
)
