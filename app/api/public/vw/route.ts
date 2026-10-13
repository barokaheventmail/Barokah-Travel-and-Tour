import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { compareVehicleLabel, vehicleInfo } from '@/lib/participant-groups'

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
    select: { busId: true, vw: true, jeepParis: true, jeepMerapi: true, jeepBromo: true, name: true, order: true },
  })

  type Member = { name: string; busName: string; busOrder: number; order: number }
  type Group = { vehicle: string; rank: number; members: Member[] }
  const groups = new Map<string, Group>()

  for (const p of participants) {
    const info = vehicleInfo(p)
    let group = groups.get(info.label)
    if (!group) {
      group = { vehicle: info.label, rank: info.rank, members: [] }
      groups.set(info.label, group)
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
        vehicle: group.vehicle,
        rank: group.rank,
        members: group.members.map((m) => ({ name: m.name, busName: m.busName })),
      }
    })
    .sort((a, b) => compareVehicleLabel({ label: a.vehicle, rank: a.rank }, { label: b.vehicle, rank: b.rank }))

  return NextResponse.json({ vws }, { headers: { 'Cache-Control': 'no-store' } })
}
