import { NextResponse } from 'next/server'
import { z } from 'zod'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { MAX_ROOM_TYPE_NAME } from '@/lib/room-types'

type Params = { params: Promise<{ id: string; roomTypeId: string }> }

const renameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama tipe kamar wajib diisi.')
    .max(MAX_ROOM_TYPE_NAME, `Nama tipe kamar maksimal ${MAX_ROOM_TYPE_NAME} karakter.`),
})

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, roomTypeId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = renameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }
  const name = parsed.data.name

  const current = await prisma.roomType.findFirst({
    where: { id: roomTypeId, eventId: id },
    select: { id: true, name: true },
  })
  if (!current) return NextResponse.json({ error: 'Tipe kamar tidak ditemukan.' }, { status: 404 })
  if (current.name === name) return NextResponse.json({ roomType: current })

  const clash = await prisma.roomType.findUnique({
    where: { eventId_name: { eventId: id, name } },
    select: { id: true },
  })
  if (clash) return NextResponse.json({ error: 'Tipe kamar ini sudah ada.' }, { status: 409 })

  const updated = await prisma.$transaction(async (tx) => {
    const roomType = await tx.roomType.update({
      where: { id: roomTypeId },
      data: { name },
      select: { id: true, name: true },
    })
    // Nama lama diganti di semua peserta supaya tidak menyisakan nilai yatim.
    const res = await tx.participant.updateMany({
      where: { eventId: id, roomType: current.name },
      data: { roomType: name },
    })
    await tx.activityLog.create({
      data: {
        eventId: id,
        userId: session.sub,
        action: 'roomType.update',
        detail: { from: current.name, to: name, participants: res.count },
      },
    })
    return roomType
  })

  logger.info('room type renamed', { eventId: id, by: session.username, from: current.name, to: name })

  return NextResponse.json({ roomType: updated })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, roomTypeId } = await params

  const current = await prisma.roomType.findFirst({
    where: { id: roomTypeId, eventId: id },
    select: { id: true, name: true },
  })
  if (!current) return NextResponse.json({ error: 'Tipe kamar tidak ditemukan.' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.roomType.delete({ where: { id: current.id } })
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'roomType.delete', detail: { name: current.name } },
    })
  })

  logger.info('room type deleted', { eventId: id, by: session.username, name: current.name })

  return NextResponse.json({ ok: true })
}
