import { NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  const deleted = await prisma.$transaction(async (tx) => {
    const scanLogs = await tx.scanLog.deleteMany({ where: { participant: { eventId: id } } })
    const participants = await tx.participant.deleteMany({ where: { eventId: id } })
    const buses = await tx.bus.deleteMany({ where: { eventId: id } })
    const orphans = await tx.user.deleteMany({ where: { role: 'CREW', workers: { none: {} } } })
    const summary = { buses: buses.count, participants: participants.count, scanLogs: scanLogs.count, orphans: orphans.count }
    await tx.activityLog.create({
      data: {
        eventId: id,
        userId: session.sub,
        action: 'event.clearData',
        detail: { by: session.username, title: event.title, ...summary },
      },
    })
    return summary
  })

  logger.warn('event data cleared', { eventId: id, title: event.title, by: session.username, ...deleted })

  return NextResponse.json({ ok: true, deleted })
}