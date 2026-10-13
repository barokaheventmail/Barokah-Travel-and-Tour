import { NextResponse } from 'next/server'
import { z } from 'zod'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { MAX_ROOM_TYPE_NAME } from '@/lib/room-types'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const roomTypes = await prisma.roomType.findMany({
    where: { eventId: id },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  })

  return NextResponse.json({ roomTypes }, { headers: { 'Cache-Control': 'no-store' } })
}

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama tipe kamar wajib diisi.')
    .max(MAX_ROOM_TYPE_NAME, `Nama tipe kamar maksimal ${MAX_ROOM_TYPE_NAME} karakter.`),
})

export async function POST(request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }
  const name = parsed.data.name

  const existing = await prisma.roomType.findUnique({
    where: { eventId_name: { eventId: id, name } },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ error: 'Tipe kamar ini sudah ada.' }, { status: 409 })

  const last = await prisma.roomType.findFirst({
    where: { eventId: id },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const created = await prisma.$transaction(async (tx) => {
    const roomType = await tx.roomType.create({
      data: { eventId: id, name, order: (last?.order ?? -1) + 1 },
      select: { id: true, name: true },
    })
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'roomType.create', detail: { name } },
    })
    return roomType
  })

  logger.info('room type created', { eventId: id, by: session.username, name })

  return NextResponse.json({ roomType: created }, { status: 201 })
}
