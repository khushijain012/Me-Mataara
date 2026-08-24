import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { createReadStream } from 'node:fs'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate } from '../middleware/auth.js'
import { resolveStorageKey } from '../lib/fileStorage.js'
import { verifyPhotoToken } from '../lib/photos.js'
import { notFound, unauthorized } from '../lib/httpError.js'

/**
 * Serve worker-captured concern photos from disk (#8).
 *
 * Mounted ahead of `/concerns` so `/concerns/photos/:id` is not swallowed by the
 * `/concerns/:key` detail route.
 */
export const concernPhotosRouter = Router()

/**
 * Authorise a photo read. `<img src>` cannot send an Authorization header, so the
 * signed `?t=` the DTO mints for each photo id is the primary credential — it is
 * handed only to viewers already allowed to see the concern, and it expires. A
 * plain Bearer token is still accepted for API clients fetching a photo directly.
 */
function authorizePhotoRead(req: Request, res: Response, next: NextFunction) {
  const token = typeof req.query.t === 'string' ? req.query.t : ''
  if (verifyPhotoToken(req.params.photoId, token)) return next()
  // No usable signature: fall back to bearer auth, so a stale link gets a clear
  // 401 rather than looking like a missing photo.
  if (!req.headers.authorization) return next(unauthorized('Invalid or expired photo link'))
  return authenticate(req, res, next)
}

// GET /concerns/photos/:photoId — stream one stored photo.
concernPhotosRouter.get(
  '/:photoId',
  authorizePhotoRead,
  asyncHandler(async (req, res) => {
    const photo = await prisma.concernPhoto.findFirst({
      // The soft-delete extension hides a deleted photo row; the parent concern is
      // checked here because it does not filter through the relation.
      where: { id: req.params.photoId, concern: { isDeleted: false } },
      select: { storageKey: true, mimeType: true, sizeBytes: true },
    })
    // Rows still awaiting `npm run photos:backfill` have no file behind them yet.
    if (!photo || !photo.storageKey) throw notFound('Photo not found')

    res.setHeader('Content-Type', photo.mimeType)
    res.setHeader('Content-Length', String(photo.sizeBytes))
    res.setHeader('Content-Disposition', 'inline')
    // A stored photo never changes, so let the browser and the service worker
    // hold it for the life of the signed link.
    res.setHeader('Cache-Control', `private, max-age=${config.photoUrlTtlSeconds}, immutable`)

    createReadStream(resolveStorageKey(photo.storageKey))
      .on('error', () => {
        if (res.headersSent) res.destroy()
        else res.status(404).json({ error: 'Photo file is missing' })
      })
      .pipe(res)
  }),
)
