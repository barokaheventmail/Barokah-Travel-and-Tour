import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { eventPatchSchema } from '@/lib/excel'

type Params = { params: Promise<{ id: string }> }

async function loadEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      buses: { orderBy: { order: 'asc' }, include: { _count: { select: { participants: true } } } },
      participants: {
        orderBy: [{ busId: 'asc' }, { order: 'asc' }],
        include: { bus: { select: { id: true, name: true } }, scannedBy: { select: { username: true } } },
      },
    },
  })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = eventPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  const { title, date, location, status, note, panduanItinerary, crewName, crewPhone, crewPhotoUrl } = parsed.data

  const data: Prisma.EventUpdateInput = {}
  if (title !== undefined) data.title = title
  if (date !== undefined) {
    const d = new Date(date)
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'Tanggal tidak valid.' }, { status: 400 })
    data.date = d
  }
  if (location !== undefined) data.location = location
  if (status !== undefined) data.status = status
  if (note !== undefined) data.note = note || null
  if (panduanItinerary !== undefined) data.panduanItinerary = panduanItinerary || null
  if (crewName !== undefined) data.crewName = crewName || null
  if (crewPhone !== undefined) data.crewPhone = crewPhone || null
  if (crewPhotoUrl !== undefined) data.crewPhotoUrl = crewPhotoUrl || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah.' }, { status: 400 })
  }

  const event = await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id },
      data,
    })
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'event.update', detail: { title } },
    })
    return updated
  })
  logger.info('event updated', { eventId: id, by: session.username })

  return NextResponse.json({ event })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.bus.deleteMany({ where: { eventId: id } })
    await tx.user.deleteMany({ where: { role: 'CREW', workers: { none: {} } } })
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'event.delete', detail: { title: existing.title } },
    })
    await tx.event.delete({ where: { id } })
  })
  logger.info('event deleted', { eventId: id, title: existing.title, by: session.username })

  return NextResponse.json({ ok: true })
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const event = await loadEvent(id)
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })
  return NextResponse.json({ event })
}