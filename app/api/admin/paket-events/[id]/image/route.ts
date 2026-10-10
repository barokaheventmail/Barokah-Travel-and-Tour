import { mkdir, rm, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

const ALLOWED = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const MAX_BYTES = 5 * 1024 * 1024

const UPLOAD_REL = join('uploads', 'paket-events')
const UPLOAD_URL_PREFIX = '/uploads/paket-events/'

function uploadPath(): string {
  return resolve(process.cwd(), UPLOAD_REL)
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const paket = await prisma.paketEvent.findUnique({ where: { id }, select: { id: true } })
  if (!paket) return NextResponse.json({ error: 'Paket event tidak ditemukan.' }, { status: 404 })

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

  let previous: string | null = null
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.paketEvent.findUnique({ where: { id }, select: { imageUrl: true } })
      previous = current?.imageUrl ?? null
      const ev = await tx.paketEvent.update({ where: { id }, data: { imageUrl: url } })
      await tx.activityLog.create({
        data: { userId: session.sub, action: 'paket.image', detail: { title: ev.title, url } },
      })
      return ev
    })
    if (previous) rmPrevious(previous).catch(() => undefined)
    logger.info('paket image uploaded', { paketId: id, by: session.username, url })
    return NextResponse.json({ url, imageUrl: updated.imageUrl })
  } catch (err) {
    rmPrevious(url).catch(() => undefined)
    logger.error('paket image upload failed', { paketId: id, err })
    return NextResponse.json({ error: 'Gagal menyimpan gambar.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const paket = await prisma.paketEvent.findUnique({ where: { id }, select: { imageUrl: true } })
  if (!paket) return NextResponse.json({ error: 'Paket event tidak ditemukan.' }, { status: 404 })

  const previous = paket.imageUrl
  if (!previous) return NextResponse.json({ ok: true })

  await prisma.$transaction(async (tx) => {
    const current = await tx.paketEvent.findUnique({ where: { id }, select: { title: true } })
    await tx.paketEvent.update({ where: { id }, data: { imageUrl: null } })
    await tx.activityLog.create({
      data: { userId: session.sub, action: 'paket.imageRemove', detail: { title: current?.title ?? '', url: previous } },
    })
  })
  rmPrevious(previous).catch(() => undefined)
  logger.info('paket image removed', { paketId: id, by: session.username, url: previous })
  return NextResponse.json({ ok: true })
}

async function rmPrevious(url: string): Promise<void> {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return
  const filename = url.slice(UPLOAD_URL_PREFIX.length)
  if (!filename || filename.includes('/') || filename.includes('..')) return
  await rm(join(uploadPath(), filename), { force: true })
}