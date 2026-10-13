import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const eventId = (request.nextUrl.searchParams.get('eventId') ?? '').trim().slice(0, 100)
  if (!eventId) return NextResponse.json({ rooms: [] })

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true },
  })
  if (!event || event.status !== 'ACTIVE') return NextResponse.json({ rooms: [] })

  const buses = await prisma.bus.findMany({
    where: { eventId },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  })
  if (buses.length === 0) return NextResponse.json({ rooms: [] })

  const busOrder = new Map(buses.map((b, i) => [b.id, i]))
  const busName = new Map(buses.map((b) => [b.id, b.name]))

  const participants = await prisma.participant.findMany({
    where: { eventId },
    select: { busId: true, room: true, roomType: true, name: true, order: true },
  })

  type Member = { name: string; busName: string; busOrder: number; order: number }
  type Room = { room: string; roomTypes: Set<string>; members: Member[] }
  const UNASSIGNED = 'Tanpa Kamar'
  const groups = new Map<string, Room>()

  for (const p of participants) {
    const room = (p.room ?? '').trim()
    const key = room || UNASSIGNED
    let group = groups.get(key)
    if (!group) {
      group = { room: key, roomTypes: new Set<string>(), members: [] }
      groups.set(key, group)
    }
    const type = room ? p.roomType?.trim() : null
    if (type) group.roomTypes.add(type)
    group.members.push({
      name: p.name,
      busName: busName.get(p.busId) ?? '',
      busOrder: busOrder.get(p.busId) ?? Number.MAX_SAFE_INTEGER,
      order: p.order,
    })
  }

  const rooms = [...groups.values()]
    .map((group) => {
      group.members.sort((a, b) => a.busOrder - b.busOrder || a.order - b.order)
      return {
        room: group.room,
        roomType: group.roomTypes.size > 0 ? [...group.roomTypes].join(' / ') : null,
        members: group.members.map((m) => ({ name: m.name, busName: m.busName })),
      }
    })
    .sort((a, b) => {
      if (a.room === UNASSIGNED) return 1
      if (b.room === UNASSIGNED) return -1
      return a.room.localeCompare(b.room, undefined, { numeric: true })
    })

  return NextResponse.json({ rooms }, { headers: { 'Cache-Control': 'no-store' } })
}
