import { NextRequest, NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  buildExportCsv,
  buildExportWorkbook,
  exportFileName,
  type ExportBus,
  type ExportStatusFilter,
} from '@/lib/export'

// exceljs memakai API Node, jadi route harus jalan di runtime Node.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

function parseStatus(raw: string | null): ExportStatusFilter {
  return raw === 'hadir' || raw === 'belum' ? raw : 'all'
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const sp = request.nextUrl.searchParams
  const busParam = sp.get('bus')
  const status = parseStatus(sp.get('status'))
  const format = sp.get('format') === 'csv' ? 'csv' : 'xlsx'

  const event = await prisma.event.findUnique({
    where: { id },
    include: { buses: { orderBy: { order: 'asc' } } },
  })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  if (busParam && busParam !== 'all' && !event.buses.some((b) => b.id === busParam)) {
    return NextResponse.json({ error: 'Unit tidak ditemukan.' }, { status: 400 })
  }

  const participants = await prisma.participant.findMany({
    where: { eventId: id },
    include: { bus: { select: { id: true, name: true, order: true } }, scannedBy: { select: { username: true } } },
    orderBy: [{ bus: { order: 'asc' } }, { order: 'asc' }],
  })

  const grouped = new Map<string, ExportBus>()
  for (const bus of event.buses) {
    grouped.set(bus.id, { id: bus.id, name: bus.name, order: bus.order, participants: [] })
  }
  for (const p of participants) {
    grouped.get(p.bus.id)?.participants.push({
      order: p.order,
      name: p.name,
      birthPlace: p.birthPlace,
      birthDate: p.birthDate,
      phone: p.phone,
      seat: p.seat,
      room: p.room,
      roomType: p.roomType,
      vw: p.vw,
      scannedAt: p.scannedAt,
      scannedBy: p.scannedBy?.username ?? null,
    })
  }

  const buses = [...grouped.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  const filter = { busId: busParam && busParam !== 'all' ? busParam : null, status }
  const selectedBus = busParam && busParam !== 'all' ? buses.find((b) => b.id === busParam) ?? null : null
  const input = { eventTitle: event.title, eventDate: event.date, eventDateEnd: event.dateEnd, buses }
  const fileName = exportFileName(event.title, selectedBus?.name ?? null, status, format)

  logger.info('export peserta', {
    eventId: id,
    by: session.username,
    format,
    bus: selectedBus?.name ?? 'semua',
    status,
  })

  if (format === 'csv') {
    return new NextResponse('﻿' + buildExportCsv(input, filter), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  }

  const wb = buildExportWorkbook(input, filter)
  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
