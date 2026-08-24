import crypto from 'node:crypto'
import { config } from '../config.js'
import { badRequest } from './httpError.js'
import { writeStorageFile } from './fileStorage.js'

/**
 * Concern photos on disk (#8). The PWA still uploads them as data URLs — that is
 * what survives in localStorage while a worker is offline — but the bytes are
 * decoded here and written under storage/photos/, so the database only ever holds
 * a storage key. Reads go back out through GET /concerns/photos/:id.
 */

/** Formats the camera/gallery path can produce, and the extension we store them as. */
const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Per-photo ceiling. The client downscales to ~1280px, so this is generous. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

export const PHOTO_FOLDER = 'photos'

export interface StoredPhoto {
  storageKey: string
  mimeType: string
  sizeBytes: number
}

const DATA_URL_RE = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/s

/** Decode and validate a `data:image/...;base64,...` upload. */
export function parsePhotoDataUrl(input: string): { buffer: Buffer; mimeType: string; extension: string } {
  const match = DATA_URL_RE.exec(input.trim())
  if (!match) throw badRequest('Photo must be a base64 data URL (data:image/jpeg;base64,…)')

  const mimeType = match[1].toLowerCase()
  const extension = PHOTO_EXTENSIONS[mimeType]
  if (!extension) {
    throw badRequest(`Unsupported photo format "${mimeType}" (allowed: jpeg, png, webp)`)
  }

  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0) throw badRequest('Photo is empty')
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw badRequest(`Photo is too large (max ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB)`)
  }
  return { buffer, mimeType, extension }
}

/**
 * Write one uploaded photo to disk and return what the row needs. Files are
 * sharded by capture month so no single directory grows without bound.
 */
export async function storePhotoDataUrl(dataUrl: string, at = new Date()): Promise<StoredPhoto> {
  const { buffer, mimeType, extension } = parsePhotoDataUrl(dataUrl)
  const year = String(at.getUTCFullYear())
  const month = String(at.getUTCMonth() + 1).padStart(2, '0')
  const storageKey = `${PHOTO_FOLDER}/${year}/${month}/${crypto.randomUUID()}.${extension}`
  await writeStorageFile(storageKey, buffer)
  return { storageKey, mimeType, sizeBytes: buffer.length }
}

// ---- signed read URLs --------------------------------------------------------

/**
 * Photos are rendered by `<img src>`, which cannot carry an Authorization header,
 * so the DTO hands out a URL signed for that one photo id. Whoever is allowed to
 * see the concern gets the link; the signature stops ids being walked by anyone
 * else, and expires on its own.
 */
function sign(photoId: string, expiresAt: number): string {
  return crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${photoId}.${expiresAt}`)
    .digest('base64url')
}

/** Mint `<expiry>.<signature>` for a photo id. */
export function signPhotoToken(photoId: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + config.photoUrlTtlSeconds
  return `${expiresAt}.${sign(photoId, expiresAt)}`
}

/** True when `token` is this photo's signature and has not expired. */
export function verifyPhotoToken(photoId: string, token: string, now = Date.now()): boolean {
  const [expiryPart, signature] = token.split('.')
  const expiresAt = Number(expiryPart)
  if (!signature || !Number.isFinite(expiresAt)) return false
  if (expiresAt * 1000 <= now) return false

  const expected = Buffer.from(sign(photoId, expiresAt))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

/** The API-relative URL the frontend puts in `<img src>` (resolved against VITE_API_BASE). */
export function photoUrl(photoId: string): string {
  return `/concerns/photos/${photoId}?t=${signPhotoToken(photoId)}`
}
