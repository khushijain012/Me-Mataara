import { promises as fs } from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'

/**
 * On-disk storage for uploaded binaries — photos, docs, video, audio. Files live
 * under `STORAGE_ROOT` (backend/storage by default) and the database holds only a
 * relative `storageKey`, never the bytes.
 */
export const STORAGE_ROOT = config.storageRoot

/**
 * Turn a stored key into an absolute path, refusing anything that escapes the
 * storage root (`..`, absolute keys) — keys come from the database, so this is
 * the one place that has to be paranoid about them.
 */
export function resolveStorageKey(key: string): string {
  const full = path.resolve(STORAGE_ROOT, key)
  const root = path.resolve(STORAGE_ROOT)
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error(`Storage key escapes the storage root: ${key}`)
  }
  return full
}

/** Write bytes to `key`, creating parent directories as needed. */
export async function writeStorageFile(key: string, data: Buffer): Promise<void> {
  const full = resolveStorageKey(key)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, data)
}

/**
 * Remove a stored file. Missing files (and unresolvable keys) are ignored: this
 * runs on delete paths where a leftover row must never block the DB write.
 */
export async function deleteStorageFile(key: string): Promise<void> {
  try {
    await fs.unlink(resolveStorageKey(key))
  } catch {
    // already gone, or never written — nothing to reclaim
  }
}

/** Remove many stored files, ignoring the ones that are already gone. */
export async function deleteStorageFiles(keys: readonly string[]): Promise<void> {
  await Promise.all(keys.map(deleteStorageFile))
}
