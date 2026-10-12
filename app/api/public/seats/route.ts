import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseFacilities } from '@/lib/facilities'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const eventId = (request.nextUrl.searchParams.get('eventId') ?? '').trim().slice(0, 100)
  const busIds = (request.nextUrl.searchParams.get('busId') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 50)
  if (!eventId) return NextResponse.json({ buses: [] })

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true },
  })
  if (!event || event.status !== 'ACTIVE') return NextResponse.json({ buses: [] })

  const buses = await prisma.bus.findMany({
    where: {
      eventId,
      ...(busIds.length ? { id: { in: busIds } } : {}),
    },
    select: { id: true, name: true, seatRows: true, seatCols: true, seatCellW: true, seatCellH: true, seatLayout: true, frontLayout: true, facilities: true },
    orderBy: { order: 'asc' },
  })

  if (buses.length === 0) return NextResponse.json({ buses: [] })

  const participants = await prisma.participant.findMany({
    where: {
      eventId,
      ...(busIds.length ? { busId: { in: busIds } } : {}),
    },
    select: { busId: true, seat: true, order: true, name: true, scannedAt: true },
  })
  participants.sort((x, y) => {
    const xs = Number.parseInt(x.seat ?? '', 10)
    const ys = Number.parseInt(y.seat ?? '', 10)
    if (!Number.isNaN(xs) && !Number.isNaN(ys)) return xs - ys
    return (x.seat ?? '').localeCompare(y.seat ?? '')
  })

  const byBus = new Map<string, typeof participants>(buses.map((b) => [b.id, [] as typeof participants]))
  for (const p of participants) byBus.get(p.busId)?.push(p)

  const result = buses.map((bus) => {
    const seats = byBus.get(bus.id) ?? []
    return {
      busId: bus.id,
      busName: bus.name,
      seatRows: bus.seatRows,
      seatCols: bus.seatCols,
      seatCellW: bus.seatCellW,
      seatCellH: bus.seatCellH,
      seatLayout: bus.seatLayout,
      frontLayout: bus.frontLayout,
      total: seats.length,
      filled: seats.filter((p) => p.scannedAt !== null).length,
      facilities: parseFacilities(bus.facilities),
      seats: seats.map((p) => ({
        seat: p.seat,
        order: p.order,
        name: p.name,
        present: p.scannedAt !== null,
      })),
    }
  })

  logger.info('public seats map', { eventId, busIds, hits: result.length })

  return NextResponse.json({ buses: result }, { headers: { 'Cache-Control': 'no-store' } })
}