import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { seatCount, serializeSeatLayout, validateSeatShape } from '@/lib/seat'
import { serializeFacilities, validateFacilities } from '@/lib/facilities'

type Params = { params: Promise<{ id: string; busId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, busId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const existing = await prisma.bus.findFirst({ where: { id: busId, eventId: id } })
  if (!existing) return NextResponse.json({ error: 'Bus tidak ditemukan.' }, { status: 404 })

  if (body.clearSeatLayout === true) {
    const allScope = body.applyToAll === true
    if (allScope) {
      const affected = await prisma.bus.count({
        where: {
          eventId: id,
          OR: [{ seatRows: { gt: 0 } }, { seatCols: { gt: 0 } }, { seatLayout: { not: null } }],
        },
      })
      if (affected === 0) return NextResponse.json({ buses: 0 })
      try {
        const cleared = await prisma.$transaction(async (tx) => {
          const result = await tx.bus.updateMany({
            where: { eventId: id },
            data: { seatRows: 0, seatCols: 0, seatLayout: null },
          })
          await tx.activityLog.create({
            data: { eventId: id, userId: session.sub, action: 'bus.seatLayoutClear', detail: { scope: 'all', buses: result.count } },
          })
          return result.count
        })
        logger.info('bus seat layouts cleared for all buses', { eventId: id, by: session.username, buses: cleared })
        return NextResponse.json({ buses: cleared })
      } catch (err) {
        return NextResponse.json({ error: 'Gagal menghapus layout kursi semua unit.' }, { status: 500 })
      }
    }
    if (!existing.seatRows && !existing.seatCols && !existing.seatLayout) {
      return NextResponse.json({ bus: existing })
    }
    try {
      const bus = await prisma.$transaction(async (tx) => {
        const updated = await tx.bus.update({
          where: { id: busId },
          data: { seatRows: 0, seatCols: 0, seatLayout: null },
        })
        await tx.activityLog.create({
          data: { eventId: id, userId: session.sub, action: 'bus.seatLayoutClear', detail: { name: existing.name } },
        })
        return updated
      })
      logger.info('bus seat layout cleared', { eventId: id, by: session.username, busId, name: existing.name })
      return NextResponse.json({ bus })
    } catch (err) {
      return NextResponse.json({ error: 'Gagal menghapus layout kursi.' }, { status: 500 })
    }
  }

  if (body.clearFacilities === true) {
    const allScope = body.applyToAll === true
    if (allScope) {
      const affected = await prisma.bus.count({ where: { eventId: id, facilities: { not: null } } })
      if (affected === 0) return NextResponse.json({ buses: 0 })
      try {
        const cleared = await prisma.$transaction(async (tx) => {
          const result = await tx.bus.updateMany({ where: { eventId: id }, data: { facilities: null } })
          await tx.activityLog.create({
            data: { eventId: id, userId: session.sub, action: 'bus.facilitiesClear', detail: { scope: 'all', buses: result.count } },
          })
          return result.count
        })
        logger.info('bus facilities cleared for all buses', { eventId: id, by: session.username, buses: cleared })
        return NextResponse.json({ buses: cleared })
      } catch (err) {
        return NextResponse.json({ error: 'Gagal menghapus fasilitas semua unit.' }, { status: 500 })
      }
    }
    if (!existing.facilities) {
      return NextResponse.json({ bus: existing })
    }
    try {
      const bus = await prisma.$transaction(async (tx) => {
        const updated = await tx.bus.update({ where: { id: busId }, data: { facilities: null } })
        await tx.activityLog.create({
          data: { eventId: id, userId: session.sub, action: 'bus.facilitiesClear', detail: { name: existing.name } },
        })
        return updated
      })
      logger.info('bus facilities cleared', { eventId: id, by: session.username, busId, name: existing.name })
      return NextResponse.json({ bus })
    } catch (err) {
      return NextResponse.json({ error: 'Gagal menghapus fasilitas unit.' }, { status: 500 })
    }
  }

  if (body.facilities !== undefined) {
    const parsed = validateFacilities(body.facilities)
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const value = serializeFacilities(parsed.items)
    const applyToAll = body.applyToAll === true
    const noop = value === null && !existing.facilities
    if (noop) return NextResponse.json({ bus: existing })

    try {
      const bus = await prisma.$transaction(async (tx) => {
        const updated = await tx.bus.update({ where: { id: busId }, data: { facilities: value } })
        let appliedToAll = 0
        if (applyToAll) {
          const result = await tx.bus.updateMany({
            where: { eventId: id, id: { not: busId } },
            data: { facilities: value },
          })
          appliedToAll = result.count
        }
        await tx.activityLog.create({
          data: {
            eventId: id,
            userId: session.sub,
            action: 'bus.facilities',
            detail: { name: updated.name, count: parsed.items.length, names: parsed.items.map((f) => f.name), appliedToAll },
          },
        })
        return updated
      })
      logger.info('bus facilities updated', {
        eventId: id,
        by: session.username,
        busId,
        count: parsed.items.length,
        applyToAll,
      })
      return NextResponse.json({ bus })
    } catch (err) {
      return NextResponse.json({ error: 'Gagal menyimpan fasilitas unit.' }, { status: 500 })
    }
  }

  const hasSeatFields = body.seatRows !== undefined || body.seatCols !== undefined || body.seatLayout !== undefined

  if (!hasSeatFields) {
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Nama bus wajib diisi.' }, { status: 400 })

    if (existing.name === name) return NextResponse.json({ bus: existing })

    try {
      const bus = await prisma.$transaction(async (tx) => {
        const updated = await tx.bus.update({ where: { id: busId }, data: { name } })
        await tx.activityLog.create({
          data: { eventId: id, userId: session.sub, action: 'bus.update', detail: { from: existing.name, to: name } },
        })
        return updated
      })
      logger.info('bus updated', { eventId: id, by: session.username, busId, from: existing.name, to: name })
      return NextResponse.json({ bus })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json({ error: 'Nama bus sudah ada untuk event ini.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Gagal memperbarui bus.' }, { status: 500 })
    }
  }

  const shape = validateSeatShape(body.seatRows, body.seatCols, body.seatLayout)
  if (shape.error) return NextResponse.json({ error: shape.error }, { status: 400 })

  try {
    const layout = serializeSeatLayout(shape.rows, shape.cols, shape.cells)
    const applyToAll = body.applyToAll === true
    const bus = await prisma.$transaction(async (tx) => {
      const updated = await tx.bus.update({
        where: { id: busId },
        data: { seatRows: shape.rows, seatCols: shape.cols, seatLayout: layout },
      })
      let appliedToAll = 0
      if (applyToAll) {
        const result = await tx.bus.updateMany({
          where: { eventId: id, id: { not: busId } },
          data: { seatRows: shape.rows, seatCols: shape.cols, seatLayout: layout },
        })
        appliedToAll = result.count
      }
      await tx.activityLog.create({
        data: {
          eventId: id,
          userId: session.sub,
          action: 'bus.seatLayout',
          detail: {
            name: updated.name,
            rows: shape.rows,
            cols: shape.cols,
            active: seatCount(shape.cells),
            appliedToAll,
          },
        },
      })
      return updated
    })
    logger.info('bus seat layout updated', {
      eventId: id,
      by: session.username,
      busId,
      rows: shape.rows,
      cols: shape.cols,
      active: seatCount(shape.cells),
      applyToAll,
    })
    return NextResponse.json({ bus })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menyimpan layout kursi.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, busId } = await params
  const existing = await prisma.bus.findFirst({ where: { id: busId, eventId: id } })
  if (!existing) return NextResponse.json({ error: 'Bus tidak ditemukan.' }, { status: 404 })

  const totalPeserta = await prisma.participant.count({ where: { busId } })

  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'bus.delete', detail: { name: existing.name, participants: totalPeserta } },
    })
    await tx.bus.delete({ where: { id: busId } })
    await tx.user.deleteMany({ where: { role: 'CREW', workers: { none: {} } } })
  })

  logger.info('bus deleted', { eventId: id, by: session.username, busId, name: existing.name, participants: totalPeserta })

  return NextResponse.json({ deleted: true, participants: totalPeserta })
}