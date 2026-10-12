import { NextRequest, NextResponse } from 'next/server'
import { requireCrewSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { countPresent, isCrewVisibleEvent, mapCrewSeats } from '@/lib/crew-seats'

export async function GET(request: NextRequest) {
  const session = await requireCrewSession()
  // requireCrewSession() hanya mengembalikan sesi crew atau sesi admin (ADMIN/OWNER).
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const assignments = await prisma.busWorker.findMany({
    where: { userId: session.sub },
    select: {
      busId: true,
      bus: {
        select: {
          id: true,
          name: true,
          unitImageUrl: true,
          unitLabel: true,
          unitImagePosX: true,
          unitImagePosY: true,
          unitImageZoom: true,
          eventId: true,
          seatRows: true,
          seatCols: true,
          seatCellW: true,
          seatCellH: true,
          seatLayout: true,
          frontLayout: true,
          event: { select: { title: true, status: true } },
        },
      },
    },
  })

  // Event CLOSED ikut dibaca supaya roster/peta kursi crew tidak mendadak
  // kosong setelah event ditutup. Statusnya dikirim ke klien untuk badge
  // "Selesai"; scan sendiri tetap hanya untuk event ACTIVE.
  const visible = assignments.filter((a) => isCrewVisibleEvent(a.bus.event.status))

  const buses = []
  for (const a of visible) {
    const participants = await prisma.participant.findMany({
      where: { busId: a.busId },
      select: { seat: true, order: true, name: true, scannedAt: true },
    })
    buses.push({
      busId: a.busId,
      busName: a.bus.name,
      unitImageUrl: a.bus.unitImageUrl,
      unitLabel: a.bus.unitLabel,
      unitImagePosX: a.bus.unitImagePosX,
      unitImagePosY: a.bus.unitImagePosY,
      unitImageZoom: a.bus.unitImageZoom,
      eventTitle: a.bus.event.title,
      eventStatus: a.bus.event.status,
      seatRows: a.bus.seatRows,
      seatCols: a.bus.seatCols,
      seatCellW: a.bus.seatCellW,
      seatCellH: a.bus.seatCellH,
      seatLayout: a.bus.seatLayout,
      frontLayout: a.bus.frontLayout,
      total: participants.length,
      filled: countPresent(participants),
      seats: mapCrewSeats(participants),
    })
  }

  return NextResponse.json({ buses }, { headers: { 'Cache-Control': 'no-store' } })
}