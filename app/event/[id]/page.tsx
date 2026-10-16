import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { EventNavbar } from '@/components/event-navbar'
import { EventTickets } from '@/components/event-tickets'

export const metadata: Metadata = { title: 'Detail Event – Barokah Tour and Travel', robots: { index: false } }
// Cache 30 detik - data scan tidak perlu real-time untuk publik
export const revalidate = 30

const LIST_LIMIT = 15

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params
  const q = (await searchParams).q ?? undefined
  const [event, totalByBus, attendedByBus] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { buses: { orderBy: { order: 'asc' } } } }),
    prisma.participant.groupBy({ by: ['busId'], where: { eventId: id }, _count: { _all: true } }),
    prisma.participant.groupBy({
      by: ['busId'],
      where: { eventId: id, scannedAt: { not: null } },
      _count: { _all: true },
    }),
  ])

  if (!event || event.status !== 'ACTIVE') notFound()

  const rosters = await Promise.all(
    event.buses.map((bus) =>
      prisma.participant.findMany({
        where: { eventId: id, busId: bus.id },
        select: { id: true, order: true, name: true, token: true, scannedAt: true },
        orderBy: { order: 'asc' },
        take: LIST_LIMIT + 1,
      }),
    ),
  )

  const totalMap = new Map(totalByBus.map((r) => [r.busId, r._count._all]))
  const attendedMap = new Map(attendedByBus.map((r) => [r.busId, r._count._all]))

  const busSections = event.buses.map((bus, i) => ({
    bus,
    participants: rosters[i],
    total: totalMap.get(bus.id) ?? 0,
    attended: attendedMap.get(bus.id) ?? 0,
  }))

  const total = busSections.reduce((acc, s) => acc + s.total, 0)
  const attended = busSections.reduce((acc, s) => acc + s.attended, 0)

  const sections = busSections.map((s) => ({
    busId: s.bus.id,
    busName: s.bus.name,
    participants: s.participants
      .slice(0, LIST_LIMIT)
      .map((p) => ({ id: p.id, order: p.order, name: p.name, token: p.token, present: p.scannedAt !== null })),
    busTotal: s.total,
    busAttended: s.attended,
  }))

  return (
    <main className="min-h-screen bg-[#f4f7fa] pb-8">
      <EventNavbar eventId={event.id} />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <EventTickets
          eventId={event.id}
          eventTitle={event.title}
          eventDate={event.date.toISOString()}
          eventDateEnd={event.dateEnd ? event.dateEnd.toISOString() : null}
          eventLocation={event.location}
          note={event.note}
          imageUrl={event.imageUrl}
          busCount={event.buses.length}
          total={total}
          attended={attended}
          sections={sections}
          limit={LIST_LIMIT}
          initialQuery={q}
        />
      </div>
    </main>
  )
}