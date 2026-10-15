import { mkdir, rm, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { parseBusIds, resolveScope } from '@/lib/target-scope'

type Params = { params: Promise<{ id: string; busId: string }> }

const ALLOWED = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const MAX_BYTES = 5 * 1024 * 1024

const UPLOAD_REL = join('uploads', 'units')
const UPLOAD_URL_PREFIX = '/uploads/units/'

function uploadPath(): string {
  return resolve(process.cwd(), UPLOAD_REL)
}

// Tentukan unit tujuan: semua unit, unit terpilih (termasuk unit aktif), atau
// hanya unit aktif. Dipakai bersama oleh unggah & hapus gambar.
async function cleanupOrphans(urls: string[]): Promise<void> {
  for (const url of new Set(urls)) {
    if (!url || url.startsWith(UPLOAD_URL_PREFIX) === false) continue
    const remaining = await prisma.bus.count({ where: { unitImageUrl: url } })
    if (remaining === 0) await rmPrevious(url).catch(() => undefined)
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, busId } = await params
  const existing = await prisma.bus.findFirst({ where: { id: busId, eventId: id }, select: { id: true, name: true } })
  if (!existing) return NextResponse.json({ error: 'Bus tidak ditemukan.' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Pilih file gambar terlebih dahulu.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ukuran file maksimal 5 MB.' }, { status: 400 })
  }
  const ext = ALLOWED.get(file.type)
  if (!ext) {
    return NextResponse.json({ error: 'Hanya mendukung gambar JPG, PNG, atau WebP.' }, { status: 400 })
  }

  const filename = `${crypto.randomUUID()}.${ext}`
  const dir = uploadPath()
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()))

  const url = `${UPLOAD_URL_PREFIX}${filename}`

  const { targetIds, scope } = resolveScope(form.get('applyToAll') === 'true', parseBusIds(form.get('busIds') as string | null), busId)
  const where = targetIds ? { eventId: id, id: { in: targetIds } } : { eventId: id }

  const targets = await prisma.bus.findMany({ where, select: { unitImageUrl: true } })

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bus.updateMany({ where, data: { unitImageUrl: url } })
      await tx.activityLog.create({
        data: {
          eventId: id,
          userId: session.sub,
          action: 'bus.unitImage',
          detail: { name: existing.name, url, scope, count: targets.length },
        },
      })
    })
    const stale = targets.map((t) => t.unitImageUrl).filter((u): u is string => !!u && u !== url)
    cleanupOrphans(stale).catch(() => undefined)
    logger.info('bus unit image uploaded', { eventId: id, by: session.username, busId, url, scope, applied: targets.length })
    return NextResponse.json({ url, unitImageUrl: url, applied: targets.length })
  } catch (err) {
    rmPrevious(url).catch(() => undefined)
    logger.error('bus unit image upload failed', { eventId: id, busId, err })
    return NextResponse.json({ error: 'Gagal menyimpan gambar.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, busId } = await params
  const existing = await prisma.bus.findFirst({ where: { id: busId, eventId: id }, select: { id: true, name: true } })
  if (!existing) return NextResponse.json({ error: 'Bus tidak ditemukan.' }, { status: 404 })

  const sp = request.nextUrl.searchParams
  const allParam = sp.get('applyToAll')
  const { targetIds, scope } = resolveScope(allParam === 'true' || allParam === '1', parseBusIds(sp.get('busIds')), busId)
  const where = targetIds ? { eventId: id, id: { in: targetIds } } : { eventId: id }

  const targets = await prisma.bus.findMany({ where, select: { unitImageUrl: true } })
  const previous = targets.map((t) => t.unitImageUrl).filter((u): u is string => !!u)
  if (previous.length === 0) return NextResponse.json({ ok: true, applied: 0 })

  await prisma.$transaction(async (tx) => {
    await tx.bus.updateMany({ where, data: { unitImageUrl: null } })
    await tx.activityLog.create({
      data: {
        eventId: id,
        userId: session.sub,
        action: 'bus.unitImageRemove',
        detail: { name: existing.name, scope, count: targets.length },
      },
    })
  })
  cleanupOrphans(previous).catch(() => undefined)
  logger.info('bus unit image removed', { eventId: id, by: session.username, busId, scope, applied: targets.length })
  return NextResponse.json({ ok: true, applied: targets.length })
}

async function rmPrevious(url: string): Promise<void> {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return
  const filename = url.slice(UPLOAD_URL_PREFIX.length)
  if (!filename || filename.includes('/') || filename.includes('..')) return
  await rm(join(uploadPath(), filename), { force: true })
}
