import 'dotenv/config'
import path from 'node:path'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: required('DATABASE_URL'),
  // Uploaded files (photos, docs, video, audio) live on disk under this root,
  // inside the backend project folder by default. The DB stores only the key.
  storageRoot: path.resolve(process.env.STORAGE_ROOT ?? path.join(process.cwd(), 'storage')),
  // How long a signed photo URL stays valid (seconds; default 7 days).
  photoUrlTtlSeconds: Number(process.env.PHOTO_URL_TTL_SECONDS ?? 7 * 24 * 60 * 60),
}
