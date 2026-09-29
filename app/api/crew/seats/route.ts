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
          eventId: true,
          seatRows: true,
          seatCols: true,
          seatLayout: true,
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
      eventTitle: a.bus.event.title,
      eventStatus: a.bus.event.status,
      seatRows: a.bus.seatRows,
      seatCols: a.bus.seatCols,
      seatLayout: a.bus.seatLayout,
      total: participants.length,
      filled: countPresent(participants),
      seats: mapCrewSeats(participants),
    })
  }

  return NextResponse.json({ buses }, { headers: { 'Cache-Control': 'no-store' } })
}