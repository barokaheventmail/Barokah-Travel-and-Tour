import { NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { groupByVw } from '@/lib/participant-groups'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [buses, participants] = await Promise.all([
    prisma.bus.findMany({
      where: { eventId: id },
      select: { id: true, name: true, order: true },
      orderBy: { order: 'asc' },
    }),
    prisma.participant.findMany({
      where: { eventId: id },
      select: { id: true, busId: true, order: true, name: true, room: true, roomType: true, vw: true },
      orderBy: [{ order: 'asc' }],
    }),
  ])

  const groups = groupByVw(participants, buses)
  return NextResponse.json({ groups }, { headers: { 'Cache-Control': 'no-store' } })
}