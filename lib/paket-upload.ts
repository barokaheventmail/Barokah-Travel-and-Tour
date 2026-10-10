import { mkdir, rm, writeFile } from 'fs/promises'
import { join, resolve } from 'path'

export const UPLOAD_URL_PREFIX = '/uploads/paket-events/'
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export function paketUploadDir(): string {
  return resolve(process.cwd(), 'uploads', 'paket-events')
}

export async function savePaketImage(file: File, ext: string): Promise<string> {
  const filename = `${crypto.randomUUID()}.${ext}`
  const dir = paketUploadDir()
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()))
  return `${UPLOAD_URL_PREFIX}${filename}`
}

export async function removePaketUpload(url: string): Promise<void> {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return
  const filename = url.slice(UPLOAD_URL_PREFIX.length)
  if (!filename || filename.includes('/') || filename.includes('..')) return
  await rm(join(paketUploadDir(), filename), { force: true })
}
