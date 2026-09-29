import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { canManage, requireAdminSession } from '@/lib/auth'
import { crewPassword } from '@/lib/crew-password'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string; busId: string; workerId: string }> }

const MIN_LENGTH = 6
const MAX_LENGTH = 64

/**
 * Ganti password satu crew. Body boleh berisi `{ password }`:
 * - ada isinya  -> password itu dipakai apa adanya (mode manual), minimal 6 karakter.
 * - kosong/tidak ada -> dikembalikan ke pola username+1123.
 *
 * Password tidak pernah disimpan plaintext, jadi yang dikembalikan ke client
 * hanya nilai yang barusan dikirim admin (atau pola yang dihitung ulang).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, busId, workerId } = await params

  let body: { password?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // Body kosong sah: artinya "kembalikan ke pola".
  }

  const raw = typeof body?.password === 'string' ? body.password.trim() : ''
  if (raw && (raw.length < MIN_LENGTH || raw.length > MAX_LENGTH)) {
    return NextResponse.json(
      { error: `Password minimal ${MIN_LENGTH} karakter, maksimal ${MAX_LENGTH}.` },
      { status: 400 },
    )
  }

  const worker = await prisma.busWorker.findFirst({
    where: { id: workerId, busId, bus: { eventId: id } },
    include: { bus: { select: { name: true } }, user: { select: { username: true } } },
  })
  if (!worker) return NextResponse.json({ error: 'Crew tidak ditemukan.' }, { status: 404 })

  const manual = raw.length > 0
  const password = manual ? raw : crewPassword(worker.user.username)
  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: worker.userId },
      data: { passwordHash, customPassword: manual },
    })
    await tx.activityLog.create({
      data: {
        eventId: id,
        userId: session.sub,
        action: 'busCrew.resetPassword',
        detail: { bus: worker.bus.name, username: worker.user.username, manual },
      },
    })
  })

  logger.info('crew password changed', {
    eventId: id,
    by: session.username,
    bus: worker.bus.name,
    username: worker.user.username,
    manual,
  })
  return NextResponse.json({ ok: true, manual, password })
}
