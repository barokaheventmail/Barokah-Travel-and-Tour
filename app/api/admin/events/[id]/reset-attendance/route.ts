import { NextRequest, NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.participant.updateMany({
      where: { eventId: id, scannedAt: { not: null } },
      data: { scannedAt: null, scannedById: null, scannedAtEvent: null },
    })
    // ScanLog SENGAJA tidak dihapus: itu jejak audit Scan crew + riwayat
    // "Scan saya". Sumber kebenaran kehadiran tetap `participant.scannedAt`.
    if (updated.count > 0) {
      await tx.activityLog.create({
        data: {
          eventId: id,
          userId: session.sub,
          action: 'attendance.reset',
          detail: { participants: updated.count },
        },
      })
    }
    return { participants: updated.count }
  })

  logger.info('attendance reset', { eventId: id, by: session.username, ...result })

  return NextResponse.json(result)
}