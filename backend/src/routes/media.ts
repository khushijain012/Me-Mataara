import { Router } from 'express'
import multer from 'multer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createReadStream } from 'node:fs'
import type { MediaAsset, MediaType, MimeType } from '@prisma/client'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, currentMember, requireRole } from '../middleware/auth.js'
import { badRequest, notFound } from '../lib/httpError.js'

// Admin-uploaded content library (#4, #5). Files land in backend/storage/<type>/.
const STORAGE_ROOT = path.resolve(process.cwd(), 'storage')
const MAX_BYTES = 100 * 1024 * 1024 // 100 MB (#4)

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } })

export const mediaRouter = Router()
mediaRouter.use(authenticate)

function toDto(a: MediaAsset & { mediaType: MediaType; mimeType: MimeType }) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    mediaType: a.mediaType.code,
    mimeType: a.mimeType.code,
    extension: a.mimeType.extension,
    originalFilename: a.originalFilename,
    sizeBytes: a.sizeBytes,
    url: a.storageUrl,
    uploadedBy: a.uploadedById,
    createdAt: a.createdAt.toISOString(),
  }
}

// GET /media — list the content library (optionally by type: doc/video/audio).
mediaRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const typeCode = typeof req.query.type === 'string' ? req.query.type : undefined
    const assets = await prisma.mediaAsset.findMany({
      where: typeCode ? { mediaType: { code: typeCode } } : {},
      include: { mediaType: true, mimeType: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(assets.map(toDto))
  }),
)

// POST /media — admin uploads a doc/video/audio file (≤ 100 MB, mp3/mp4/pdf).
mediaRouter.post(
  '/',
  requireRole('admin'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const me = currentMember(req)
    const file = req.file
    if (!file) throw badRequest('No file uploaded (field name must be "file")')

    const title = String(req.body.title ?? file.originalname).trim()
    const description = String(req.body.description ?? '').trim()

    // Resolve the media type (doc/video/audio) and validate the file's format.
    const typeCode = String(req.body.mediaType ?? '').trim()
    const mediaType = typeCode
      ? await prisma.mediaType.findUnique({ where: { code: typeCode } })
      : null
    if (!mediaType) throw badRequest('Unknown mediaType — expected one of doc, video, audio')

    const mimeType = await prisma.mimeType.findFirst({
      where: { mediaTypeId: mediaType.id, code: file.mimetype },
    })
    if (!mimeType) {
      throw badRequest(`Unsupported format "${file.mimetype}" for ${mediaType.code} (allowed: mp3/mp4/pdf per type)`)
    }

    // Write the file under storage/<folder>/.
    const dir = path.join(STORAGE_ROOT, mediaType.storageFolder)
    await fs.mkdir(dir, { recursive: true })
    const filename = `${Date.now()}-${file.originalname.replace(/[^\w.\-]+/g, '_')}`
    const storageKey = path.join(mediaType.storageFolder, filename)
    await fs.writeFile(path.join(STORAGE_ROOT, storageKey), file.buffer)

    const asset = await prisma.mediaAsset.create({
      data: {
        title,
        description,
        mediaTypeId: mediaType.id,
        mimeTypeId: mimeType.id,
        storageKey,
        storageUrl: '', // filled below once we have the id
        originalFilename: file.originalname,
        sizeBytes: file.size,
        uploadedById: me.id,
      },
      include: { mediaType: true, mimeType: true },
    })
    const withUrl = await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { storageUrl: `/media/${asset.id}/file` },
      include: { mediaType: true, mimeType: true },
    })

    res.status(201).json(toDto(withUrl))
  }),
)

// GET /media/:id/file — stream the stored file.
mediaRouter.get(
  '/:id/file',
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: req.params.id },
      include: { mimeType: true },
    })
    if (!asset) throw notFound('Media not found')
    const full = path.join(STORAGE_ROOT, asset.storageKey)
    res.setHeader('Content-Type', asset.mimeType.code)
    res.setHeader('Content-Disposition', `inline; filename="${asset.originalFilename}"`)
    createReadStream(full).on('error', () => res.status(404).end()).pipe(res)
  }),
)

// DELETE /media/:id — soft-delete (admin).
mediaRouter.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await prisma.mediaAsset.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  }),
)
