import { NextResponse } from 'next/server'
import { z } from 'zod'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

const swapSchema = z.object({
  aId: z.string().trim().min(1, 'Peserta pertama wajib diisi.'),
  bId: z.string().trim().min(1, 'Peserta kedua wajib diisi.'),
  field: z.enum(['room', 'vw']).default('room'),
})

export async function POST(request: Request, { params }: Params) {
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

  const parsed = swapSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  const { aId, bId, field } = parsed.data
  if (aId === bId) {
    return NextResponse.json({ error: 'Pilih dua peserta yang berbeda.' }, { status: 400 })
  }

  const [a, b] = await Promise.all([
    prisma.participant.findFirst({
      where: { id: aId, eventId: id },
      select: { id: true, name: true, room: true, roomType: true, vw: true },
    }),
    prisma.participant.findFirst({
      where: { id: bId, eventId: id },
      select: { id: true, name: true, room: true, roomType: true, vw: true },
    }),
  ])
  if (!a || !b) {
    return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 })
  }

  const dataA = field === 'room' ? { room: b.room, roomType: b.roomType } : { vw: b.vw }
  const dataB = field === 'room' ? { room: a.room, roomType: a.roomType } : { vw: a.vw }
  const detail =
    field === 'room'
      ? { a: a.name, aValue: a.room, b: b.name, bValue: b.room }
      : { a: a.name, aValue: a.vw, b: b.name, bValue: b.vw }

  const participants = await prisma.$transaction(async (tx) => {
    const nextA = await tx.participant.update({ where: { id: a.id }, data: dataA })
    const nextB = await tx.participant.update({ where: { id: b.id }, data: dataB })
    await tx.activityLog.create({
      data: {
        eventId: id,
        userId: session.sub,
        action: field === 'room' ? 'participant.room.swap' : 'participant.vw.swap',
        detail,
      },
    })
    return [nextA, nextB]
  })

  logger.info('participant assignments swapped', { eventId: id, by: session.username, field, aId, bId })

  return NextResponse.json({ participants })
}
