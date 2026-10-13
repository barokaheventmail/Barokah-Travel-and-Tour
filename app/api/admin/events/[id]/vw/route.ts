import { NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { groupByVw, vehicleSectionTitle } from '@/lib/participant-groups'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [event, buses, participants] = await Promise.all([
    prisma.event.findUnique({ where: { id }, select: { vwName: true, vwTitle: true, denahVwCrewName: true } }),
    prisma.bus.findMany({
      where: { eventId: id },
      select: { id: true, name: true, order: true },
      orderBy: { order: 'asc' },
    }),
    prisma.participant.findMany({
      where: { eventId: id },
      select: {
        id: true,
        busId: true,
        order: true,
        name: true,
        room: true,
        roomType: true,
        vw: true,
        jeepParis: true,
        jeepMerapi: true,
        jeepBromo: true,
      },
      orderBy: [{ order: 'asc' }],
    }),
  ])

  const groups = groupByVw(participants, buses)

  const counts = { vw: 0, jeepParis: 0, jeepMerapi: 0, jeepBromo: 0 }
  for (const p of participants) {
    if ((p.vw ?? '').trim()) counts.vw++
    if ((p.jeepParis ?? '').trim()) counts.jeepParis++
    if ((p.jeepMerapi ?? '').trim()) counts.jeepMerapi++
    if ((p.jeepBromo ?? '').trim()) counts.jeepBromo++
  }
  const autoTitle = vehicleSectionTitle(counts, event?.vwName)
  const vwTitle = (event?.vwTitle ?? '').trim() || null
  const title = vwTitle ?? autoTitle
  const denahVwCrewName = (event?.denahVwCrewName ?? '').trim() || null

  return NextResponse.json(
    { groups, vwName: event?.vwName ?? 'VW MAGELANG', vwTitle, autoTitle, title, denahVwCrewName },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
