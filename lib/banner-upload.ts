import { mkdir, rm, writeFile } from 'fs/promises'
import { join, resolve } from 'path'

export const BANNER_UPLOAD_URL_PREFIX = '/uploads/banners/'
export const MAX_BANNER_BYTES = 5 * 1024 * 1024
export const MAX_BANNERS = 12
export const ALLOWED_BANNER_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export function bannerUploadDir(): string {
  return resolve(process.cwd(), 'uploads', 'banners')
}

export async function saveBannerImage(file: File, ext: string): Promise<string> {
  const filename = `${crypto.randomUUID()}.${ext}`
  const dir = bannerUploadDir()
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()))
  return `${BANNER_UPLOAD_URL_PREFIX}${filename}`
}

export async function removeBannerUpload(url: string): Promise<void> {
  if (!url.startsWith(BANNER_UPLOAD_URL_PREFIX)) return
  const filename = url.slice(BANNER_UPLOAD_URL_PREFIX.length)
  if (!filename || filename.includes('/') || filename.includes('..')) return
  await rm(join(bannerUploadDir(), filename), { force: true })
}
