import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

const updateSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama wajib diisi').optional(),
    birthPlace: z.string().trim().nullish(),
    birthDate: z.string().nullish(),
    phone: z.string().trim().nullish(),
    seat: z.string().trim().nullish(),
    room: z.string().trim().nullish(),
    vw: z.string().trim().nullish(),
    busId: z.string().min(1, 'Pilih bus.').optional(),
    order: z.coerce.number().int('Nomor urut harus angka bulat.').positive('Nomor urut harus lebih dari 0.').optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Tidak ada data yang diubah.' })

type Params = { params: Promise<{ id: string; participantId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, participantId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  const existing = await prisma.participant.findFirst({ where: { id: participantId, eventId: id } })
  if (!existing) return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 })

  const data = parsed.data

  const patch: Record<string, string | Date | null> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.birthPlace !== undefined) patch.birthPlace = data.birthPlace || null
  if ('birthDate' in data) patch.birthDate = data.birthDate ? new Date(data.birthDate) : null
  if (data.phone !== undefined) patch.phone = data.phone || null
  if (data.seat !== undefined) patch.seat = data.seat || null
  if (data.room !== undefined) patch.room = data.room || null
  if (data.vw !== undefined) patch.vw = data.vw || null

  let busId = existing.busId
  if (data.busId) {
    const bus = await prisma.bus.findFirst({ where: { id: data.busId, eventId: id } })
    if (!bus) return NextResponse.json({ error: 'Bus tidak ditemukan untuk event ini.' }, { status: 400 })
    busId = bus.id
  }
  const nextOrder = data.order ?? existing.order

  try {
    let participant: Awaited<ReturnType<typeof prisma.participant.update>>

    if (busId !== existing.busId || nextOrder !== existing.order) {
      const occupant = await prisma.participant.findFirst({
        where: { eventId: id, busId, order: nextOrder, id: { not: participantId } },
      })
      const temp = existing.order

      participant = await prisma.$transaction(async (tx) => {
        if (occupant) {
          await tx.participant.update({ where: { id: occupant.id }, data: { order: -1 } })
          await tx.participant.update({ where: { id: participantId }, data: { ...patch, busId, order: nextOrder } })
          await tx.participant.update({ where: { id: occupant.id }, data: { order: temp, busId: occupant.busId } })
          const updated = await tx.participant.findUniqueOrThrow({ where: { id: participantId } })
          await tx.activityLog.create({
            data: { eventId: id, userId: session.sub, action: 'participant.update', detail: { name: updated.name, busId, order: updated.order } },
          })
          return updated
        }
        await tx.participant.update({ where: { id: participantId }, data: { order: -1 } })
        const updated = await tx.participant.update({ where: { id: participantId }, data: { ...patch, busId, order: nextOrder } })
        await tx.activityLog.create({
          data: { eventId: id, userId: session.sub, action: 'participant.update', detail: { name: updated.name, busId, order: updated.order } },
        })
        return updated
      })
    } else {
      participant = await prisma.$transaction(async (tx) => {
        const updated = await tx.participant.update({ where: { id: participantId }, data: patch })
        await tx.activityLog.create({
          data: { eventId: id, userId: session.sub, action: 'participant.update', detail: { name: updated.name, busId, order: updated.order } },
        })
        return updated
      })
    }

    logger.info('participant updated', { eventId: id, by: session.username, participantId, name: participant.name })

    return NextResponse.json({ participant })
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui peserta.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, participantId } = await params
  const existing = await prisma.participant.findFirst({ where: { id: participantId, eventId: id } })
  if (!existing) return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.participant.delete({ where: { id: participantId } })
    await tx.participant.updateMany({
      where: { eventId: id, busId: existing.busId, order: { gt: existing.order } },
      data: { order: { decrement: 1 } },
    })
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'participant.delete', detail: { name: existing.name } },
    })
  })
  logger.info('participant deleted', { eventId: id, by: session.username, participantId, name: existing.name })

  return NextResponse.json({ deleted: true })
}