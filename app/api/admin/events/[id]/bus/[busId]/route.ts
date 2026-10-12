import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  clampCellSize,
  seatCount,
  serializeSeatLayout,
  validateSeatShape,
  UNIT_IMAGE_POS_MAX,
  UNIT_IMAGE_POS_MIN,
  UNIT_IMAGE_ZOOM_MAX,
  UNIT_IMAGE_ZOOM_MIN,
} from '@/lib/seat'
import { serializeFrontLayout, validateFrontLayout } from '@/lib/front'
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
            data: { seatRows: 0, seatCols: 0, seatCellW: 1, seatCellH: 1, seatLayout: null, frontLayout: null },
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
    if (!existing.seatRows && !existing.seatCols && !existing.seatLayout && !existing.frontLayout) {
      return NextResponse.json({ bus: existing })
    }
    try {
      const bus = await prisma.$transaction(async (tx) => {
        const updated = await tx.bus.update({
          where: { id: busId },
          data: { seatRows: 0, seatCols: 0, seatCellW: 1, seatCellH: 1, seatLayout: null, frontLayout: null },
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

  if (body.unitLabel !== undefined) {
    const raw = typeof body.unitLabel === 'string' ? body.unitLabel.trim() : ''
    const value = raw ? raw.slice(0, 60) : null
    if (value === existing.unitLabel) return NextResponse.json({ bus: existing })
    try {
      const bus = await prisma.$transaction(async (tx) => {
        const updated = await tx.bus.update({ where: { id: busId }, data: { unitLabel: value } })
        await tx.activityLog.create({
          data: { eventId: id, userId: session.sub, action: 'bus.unitLabel', detail: { name: existing.name, label: value } },
        })
        return updated
      })
      logger.info('bus unit label updated', { eventId: id, by: session.username, busId, hasLabel: value !== null })
      return NextResponse.json({ bus })
    } catch (err) {
      return NextResponse.json({ error: 'Gagal menyimpan nama unit.' }, { status: 500 })
    }
  }

  const hasCropFields =
    body.unitImagePosX !== undefined || body.unitImagePosY !== undefined || body.unitImageZoom !== undefined

  if (hasCropFields) {
    const read = (key: string, fallback: number, min: number, max: number): number | null => {
      const raw = body[key]
      if (raw === undefined) return fallback
      const n = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(n)) return null
      return Math.min(max, Math.max(min, Math.round(n)))
    }
    const posX = read('unitImagePosX', existing.unitImagePosX, UNIT_IMAGE_POS_MIN, UNIT_IMAGE_POS_MAX)
    const posY = read('unitImagePosY', existing.unitImagePosY, UNIT_IMAGE_POS_MIN, UNIT_IMAGE_POS_MAX)
    const zoom = read('unitImageZoom', existing.unitImageZoom, UNIT_IMAGE_ZOOM_MIN, UNIT_IMAGE_ZOOM_MAX)
    if (posX === null || posY === null || zoom === null) {
      return NextResponse.json({ error: 'Nilai posisi/zoom tidak valid.' }, { status: 400 })
    }
    if (posX === existing.unitImagePosX && posY === existing.unitImagePosY && zoom === existing.unitImageZoom) {
      return NextResponse.json({ bus: existing })
    }
    try {
      const bus = await prisma.$transaction(async (tx) => {
        const updated = await tx.bus.update({
          where: { id: busId },
          data: { unitImagePosX: posX, unitImagePosY: posY, unitImageZoom: zoom },
        })
        await tx.activityLog.create({
          data: { eventId: id, userId: session.sub, action: 'bus.unitImageCrop', detail: { name: existing.name, posX, posY, zoom } },
        })
        return updated
      })
      logger.info('bus unit image crop updated', { eventId: id, by: session.username, busId, posX, posY, zoom })
      return NextResponse.json({ bus })
    } catch (err) {
      return NextResponse.json({ error: 'Gagal menyimpan posisi gambar.' }, { status: 500 })
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

  const frontProvided = body.frontLayout !== undefined
  const front = validateFrontLayout(body.frontLayout, shape.cols)
  if (front.error) return NextResponse.json({ error: front.error }, { status: 400 })
  const frontData = frontProvided ? { frontLayout: serializeFrontLayout(front.front) } : {}

  const cellData = { seatCellW: clampCellSize(body.seatCellW), seatCellH: clampCellSize(body.seatCellH) }

  try {
    const layout = serializeSeatLayout(shape.rows, shape.cols, shape.cells)
    const applyToAll = body.applyToAll === true
    const bus = await prisma.$transaction(async (tx) => {
      const updated = await tx.bus.update({
        where: { id: busId },
        data: { seatRows: shape.rows, seatCols: shape.cols, ...cellData, seatLayout: layout, ...frontData },
      })
      let appliedToAll = 0
      if (applyToAll) {
        const result = await tx.bus.updateMany({
          where: { eventId: id, id: { not: busId } },
          data: { seatRows: shape.rows, seatCols: shape.cols, ...cellData, seatLayout: layout, ...frontData },
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
    logger.error('bus seat layout save failed', {
      eventId: id,
      busId,
      by: session.username,
      error: err instanceof Error ? err.message : String(err),
    })
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