import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const eventId = (request.nextUrl.searchParams.get('eventId') ?? '').trim().slice(0, 100)
  if (!eventId) return NextResponse.json({ vws: [] })

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true },
  })
  if (!event || event.status !== 'ACTIVE') return NextResponse.json({ vws: [] })

  const buses = await prisma.bus.findMany({
    where: { eventId },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  })
  if (buses.length === 0) return NextResponse.json({ vws: [] })

  const busOrder = new Map(buses.map((b, i) => [b.id, i]))
  const busName = new Map(buses.map((b) => [b.id, b.name]))

  const participants = await prisma.participant.findMany({
    where: { eventId },
    select: { busId: true, vw: true, name: true, order: true },
  })

  type Member = { name: string; busName: string; busOrder: number; order: number }
  type Group = { vw: string; members: Member[] }
  const UNASSIGNED = 'Tanpa VW'
  const groups = new Map<string, Group>()

  for (const p of participants) {
    const vw = (p.vw ?? '').trim()
    const key = vw || UNASSIGNED
    let group = groups.get(key)
    if (!group) {
      group = { vw: key, members: [] }
      groups.set(key, group)
    }
    group.members.push({
      name: p.name,
      busName: busName.get(p.busId) ?? '',
      busOrder: busOrder.get(p.busId) ?? Number.MAX_SAFE_INTEGER,
      order: p.order,
    })
  }

  const vws = [...groups.values()]
    .map((group) => {
      group.members.sort((a, b) => a.busOrder - b.busOrder || a.order - b.order)
      return {
        vw: group.vw,
        members: group.members.map((m) => ({ name: m.name, busName: m.busName })),
      }
    })
    .sort((a, b) => {
      if (a.vw === UNASSIGNED) return 1
      if (b.vw === UNASSIGNED) return -1
      return a.vw.localeCompare(b.vw, undefined, { numeric: true })
    })

  return NextResponse.json({ vws }, { headers: { 'Cache-Control': 'no-store' } })
}
