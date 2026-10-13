import { NextResponse } from 'next/server'
import { z } from 'zod'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { groupByRoom } from '@/lib/participant-groups'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [buses, participants] = await Promise.all([
    prisma.bus.findMany({
      where: { eventId: id },
      select: { id: true, name: true, order: true },
      orderBy: { order: 'asc' },
    }),
    prisma.participant.findMany({
      where: { eventId: id },
      select: { id: true, busId: true, order: true, name: true, room: true, roomType: true, vw: true },
      orderBy: [{ order: 'asc' }],
    }),
  ])

  const groups = groupByRoom(participants, buses)
  return NextResponse.json({ groups }, { headers: { 'Cache-Control': 'no-store' } })
}

const roomPatchSchema = z.object({
  room: z.string().trim().min(1, 'No kamar wajib diisi.'),
  roomType: z.string().trim().nullish(),
})

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = roomPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  const { room, roomType } = parsed.data
  const nextType = typeof roomType === 'string' && roomType.trim() ? roomType.trim() : null

  const matching = await prisma.participant.findMany({
    where: { eventId: id },
    select: { id: true, room: true },
  })
  const ids = matching.filter((p) => (p.room ?? '').trim() === room).map((p) => p.id)
  if (ids.length === 0) {
    return NextResponse.json({ error: 'Tidak ada peserta dengan nomor kamar tersebut.' }, { status: 404 })
  }

  const count = await prisma.$transaction(async (tx) => {
    const res = await tx.participant.updateMany({
      where: { id: { in: ids } },
      data: { roomType: nextType },
    })
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'participant.room.update', detail: { room, roomType: nextType, count: res.count } },
    })
    return res.count
  })

  logger.info('room roomType updated', { eventId: id, by: session.username, room, count })

  return NextResponse.json({ updated: count })
}
