import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

const bodySchema = z.object({
  attended: z.boolean(),
})

type Params = Promise<{ id: string; participantId: string }>

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let attended: boolean
  try {
    const body = bodySchema.parse(await request.json())
    attended = body.attended
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 })
  }

  const { id: eventId, participantId } = await params
  try {
    const result = await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findFirst({
        where: { id: participantId, eventId },
        select: { name: true, scannedAt: true, scannedBy: { select: { username: true, name: true } } },
      })
      if (!participant) return { ok: false, status: 404, error: 'Peserta tidak ditemukan.' }

      const currentlyAttended = participant.scannedAt !== null
      if (attended === currentlyAttended) {
        return { ok: true, participant }
      }

      if (attended) {
        await tx.participant.update({
          where: { id: participantId },
          data: { scannedAt: new Date(), scannedById: session.sub },
        })
        await tx.scanLog.create({
          data: { participantId, userId: session.sub, status: 'attended' },
        })
        await tx.activityLog.create({
          data: { eventId, userId: session.sub, action: 'attendance.set', detail: { name: participant.name } },
        })
      } else {
        await tx.participant.update({
          where: { id: participantId },
          data: { scannedAt: null, scannedById: null, scannedAtEvent: null },
        })
        await tx.scanLog.create({
          data: { participantId, userId: session.sub, status: 'unattended' },
        })
        await tx.activityLog.create({
          data: { eventId, userId: session.sub, action: 'attendance.clear', detail: { name: participant.name } },
        })
      }

      const fresh = await tx.participant.findUnique({
        where: { id: participantId },
        select: { scannedAt: true, scannedBy: { select: { username: true, name: true } } },
      })
      return { ok: true, participant: fresh }
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    logger.info('admin attendance toggle', { eventId, participantId, by: session.username, attended, name: result.participant?.scannedBy ? result.participant.scannedBy.name : null })
    return NextResponse.json({ attended: result.participant?.scannedAt !== null })
  } catch (e) {
    logger.error('admin attendance toggle failed', {
      eventId,
      participantId,
      by: session.username,
      error: e instanceof Error ? e.message : 'unknown',
    })
    return NextResponse.json({ error: 'Gagal mengubah kehadiran.' }, { status: 500 })
  }
}