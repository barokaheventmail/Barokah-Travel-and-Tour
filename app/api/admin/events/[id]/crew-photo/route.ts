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

// Tiga slot foto crew: section Tata Tertib, section Denah Kamar, dan section
// Denah VW. Masing-masing punya kolom sendiri supaya bisa diedit terpisah.
type CrewSlot = 'crew' | 'denah' | 'vw'
const SLOT_COLUMN: Record<CrewSlot, 'crewPhotoUrl' | 'denahKamarCrewPhotoUrl' | 'denahVwCrewPhotoUrl'> = {
  crew: 'crewPhotoUrl',
  denah: 'denahKamarCrewPhotoUrl',
  vw: 'denahVwCrewPhotoUrl',
}
const SLOT_SELECT = { id: true, crewPhotoUrl: true, denahKamarCrewPhotoUrl: true, denahVwCrewPhotoUrl: true } as const

function parseSlot(value: unknown): CrewSlot {
  return value === 'denah' ? 'denah' : value === 'vw' ? 'vw' : 'crew'
}

const UPLOAD_REL = join('uploads', 'crew-event')
const UPLOAD_URL_PREFIX = '/uploads/crew-event/'

function uploadPath(): string {
  return resolve(process.cwd(), UPLOAD_REL)
}

/** Hanya hapus file yang benar-benar milik folder foto crew event. */
async function rmPhoto(url: string | null): Promise<void> {
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

  const event = await prisma.event.findUnique({ where: { id }, select: SLOT_SELECT })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  const slot = parseSlot(form.get('slot'))
  const column = SLOT_COLUMN[slot]

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
  const previous = event[column]
  const photoData =
    slot === 'denah'
      ? { denahKamarCrewPhotoUrl: url }
      : slot === 'vw'
        ? { denahVwCrewPhotoUrl: url }
        : { crewPhotoUrl: url }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: photoData })
      await tx.activityLog.create({
        data: { eventId: id, userId: session.sub, action: 'event.crewPhoto', detail: { url, slot } },
      })
    })
  } catch (err) {
    await rmPhoto(url).catch(() => undefined)
    logger.error('event crew photo upload failed', { eventId: id, err })
    return NextResponse.json({ error: 'Gagal menyimpan foto.' }, { status: 500 })
  }

  await rmPhoto(previous).catch(() => undefined)
  logger.info('event crew photo uploaded', { eventId: id, slot, by: session.username })
  return NextResponse.json({ url, photoUrl: url })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const event = await prisma.event.findUnique({ where: { id }, select: SLOT_SELECT })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  const slot = parseSlot(new URL(request.url).searchParams.get('slot'))
  const column = SLOT_COLUMN[slot]

  const previous = event[column]
  if (!previous) return NextResponse.json({ ok: true })

  const clearData =
    slot === 'denah'
      ? { denahKamarCrewPhotoUrl: null }
      : slot === 'vw'
        ? { denahVwCrewPhotoUrl: null }
        : { crewPhotoUrl: null }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id }, data: clearData })
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'event.crewPhotoRemove', detail: { url: previous, slot } },
    })
  })

  await rmPhoto(previous).catch(() => undefined)
  logger.info('event crew photo removed', { eventId: id, slot, by: session.username })
  return NextResponse.json({ ok: true })
}