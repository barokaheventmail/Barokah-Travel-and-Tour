import { mkdir, rm, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }
type Slot = 'left' | 'right' | 'topright' | 'topright2'

const SLOT_FIELDS: Record<Slot, 'panduanLogoLeft' | 'panduanLogoRight' | 'panduanLogoTopRight' | 'panduanLogoTopRight2'> = {
  left: 'panduanLogoLeft',
  right: 'panduanLogoRight',
  topright: 'panduanLogoTopRight',
  topright2: 'panduanLogoTopRight2',
}

function parseSlot(value: unknown): Slot | null {
  return value === 'left' || value === 'right' || value === 'topright' || value === 'topright2' ? value : null
}

const ALLOWED = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const MAX_BYTES = 5 * 1024 * 1024

const UPLOAD_REL = join('uploads', 'panduan-logo')
const UPLOAD_URL_PREFIX = '/uploads/panduan-logo/'

function uploadPath(): string {
  return resolve(process.cwd(), UPLOAD_REL)
}

/** Hanya hapus file yang benar-benar milik folder logo panduan. */
async function rmLogo(url: string | null): Promise<void> {
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) return
  const filename = url.slice(UPLOAD_URL_PREFIX.length)
  if (!filename || filename.includes('/') || filename.includes('..')) return
  await rm(join(uploadPath(), filename), { force: true })
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, panduanLogoLeft: true, panduanLogoRight: true, panduanLogoTopRight: true, panduanLogoTopRight2: true },
  })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  const slot = parseSlot(form.get('slot'))
  if (!slot) return NextResponse.json({ error: 'Posisi logo tidak valid.' }, { status: 400 })

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
  await mkdir(uploadPath(), { recursive: true })
  await writeFile(join(uploadPath(), filename), Buffer.from(await file.arrayBuffer()))

  const url = `${UPLOAD_URL_PREFIX}${filename}`
  const field = SLOT_FIELDS[slot]
  const previous = event[field]

  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: { [field]: url } })
      await tx.activityLog.create({
        data: { eventId: id, userId: session.sub, action: 'event.panduanLogo', detail: { slot, url } },
      })
    })
  } catch (err) {
    await rmLogo(url).catch(() => undefined)
    logger.error('event panduan logo upload failed', { eventId: id, slot, err })
    return NextResponse.json({ error: 'Gagal menyimpan logo.' }, { status: 500 })
  }

  await rmLogo(previous).catch(() => undefined)
  logger.info('event panduan logo uploaded', { eventId: id, slot, by: session.username })
  return NextResponse.json({ url, slot })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const slot = parseSlot(new URL(request.url).searchParams.get('slot'))
  if (!slot) return NextResponse.json({ error: 'Posisi logo tidak valid.' }, { status: 400 })

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, panduanLogoLeft: true, panduanLogoRight: true, panduanLogoTopRight: true, panduanLogoTopRight2: true },
  })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  const field = SLOT_FIELDS[slot]
  const previous = event[field]
  if (!previous) return NextResponse.json({ ok: true })

  await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id }, data: { [field]: null } })
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'event.panduanLogoRemove', detail: { slot, url: previous } },
    })
  })

  await rmLogo(previous).catch(() => undefined)
  logger.info('event panduan logo removed', { eventId: id, slot, by: session.username })
  return NextResponse.json({ ok: true })
}
