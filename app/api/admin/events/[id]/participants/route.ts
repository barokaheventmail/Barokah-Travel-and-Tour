import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ticketCodeFromToken } from '@/lib/scan'

const participantSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  phone: z.string().trim().nullish(),
  seat: z.string().trim().nullish(),
  room: z.string().trim().nullish(),
  vw: z.string().trim().nullish(),
  busName: z.string().trim().nullish(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const sp = request.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim().slice(0, 100)
  const busId = (sp.get('busId') ?? '').trim().slice(0, 100)
  // Filter multi-bus: "busIds=<id1>,<id2>,...". Param `busId` tunggal lama
  // tetap diterima supaya tidak memutus pemanggil yang sudah ada.
  const busIds = (sp.get('busIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 500)
  const status = sp.get('status') ?? 'all'

  const rawTake = Number(sp.get('take') ?? '200')
  const rawSkip = Number(sp.get('skip') ?? '0')
  const take = Number.isFinite(rawTake) ? Math.min(Math.max(1, Math.floor(rawTake)), 500) : 200
  const skip = Number.isFinite(rawSkip) ? Math.max(0, Math.floor(rawSkip)) : 0

  const where: Prisma.ParticipantWhereInput = { eventId: id }
  if (busIds.length === 1) where.busId = busIds[0]
  else if (busIds.length > 1) where.busId = { in: busIds }
  else if (busId && busId !== 'all') where.busId = busId
  if (status === 'attended') where.scannedAt = { not: null }
  else if (status === 'pending') where.scannedAt = null
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { room: { contains: q } },
      { vw: { contains: q } },
      { seat: { contains: q } },
      { birthPlace: { contains: q } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.participant.findMany({
      where,
      orderBy: [{ busId: 'asc' }, { order: 'asc' }],
      include: { scannedBy: { select: { username: true, name: true } } },
      take,
      skip,
    }),
    prisma.participant.count({ where }),
  ])
  logger.info('admin participants list', { eventId: id, by: session.username, q, busId, busIds: busIds.length, status, take, skip, hits: total })

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      busId: p.busId,
      order: p.order,
      name: p.name,
      birthPlace: p.birthPlace,
      birthDate: p.birthDate ? p.birthDate.toISOString() : null,
      phone: p.phone,
      seat: p.seat,
      room: p.room,
      vw: p.vw,
      scannedAt: p.scannedAt ? p.scannedAt.toISOString() : null,
      scannedBy: p.scannedBy,
    })),
    total,
    skip,
    take,
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = participantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  const { name, phone, seat, room, vw, busName } = parsed.data
  const wantedBus = busName || 'Bus 1'

  const participant = await prisma.$transaction(async (tx) => {
    let bus = await tx.bus.findUnique({ where: { eventId_name: { eventId: id, name: wantedBus } } })
    if (!bus) {
      const order = await tx.bus.count({ where: { eventId: id } })
      bus = await tx.bus.create({ data: { eventId: id, name: wantedBus, order: order + 1 } })
    }

    const maxOrder = await tx.participant.aggregate({
      where: { busId: bus.id },
      _max: { order: true },
    })

    const token = randomUUID()
    const created = await tx.participant.create({
      data: {
        eventId: id,
        busId: bus.id,
        order: (maxOrder._max.order ?? 0) + 1,
        name,
        phone: phone || null,
        seat: seat || null,
        room: room || null,
        vw: vw || null,
        token,
        ticketCode: ticketCodeFromToken(event.date, token),
      },
    })

    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'participant.create', detail: { name, bus: bus.name } },
    })
    return created
  })

  logger.info('participant created manually', { eventId: id, by: session.username, name })

  return NextResponse.json({ participant }, { status: 201 })
}