import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { requireAdminSession } from '@/lib/auth'
import { crewPassword } from '@/lib/crew-password'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string; busId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, busId } = await params

  let body: { name?: unknown; phone?: unknown; username?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() || null : null
  // Password boleh dikosongkan: kalau begitu memakai pola username+1123.
  const manualPassword = typeof body?.password === 'string' ? body.password.trim() : ''

  if (!name) return NextResponse.json({ error: 'Nama crew wajib diisi.' }, { status: 400 })
  if (!username) return NextResponse.json({ error: 'Username wajib diisi.' }, { status: 400 })
  if (manualPassword && (manualPassword.length < 6 || manualPassword.length > 64)) {
    return NextResponse.json({ error: 'Password minimal 6 karakter, maksimal 64.' }, { status: 400 })
  }

  const bus = await prisma.bus.findFirst({ where: { id: busId, eventId: id } })
  if (!bus) return NextResponse.json({ error: 'Bus tidak ditemukan.' }, { status: 404 })

  const password = manualPassword || crewPassword(username)
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const worker = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, passwordHash, customPassword: manualPassword.length > 0, name, phone: phone || null, role: 'CREW' },
      })
      const order = await tx.busWorker.count({ where: { busId } })
      const linked = await tx.busWorker.create({ data: { busId, userId: user.id, order: order + 1 } })
      await tx.activityLog.create({
        data: {
          eventId: id,
          userId: session.sub,
          action: 'busCrew.create',
          detail: { bus: bus.name, name, username, phone: phone || null, manual: manualPassword.length > 0 },
        },
      })
      return {
        id: linked.id,
        order: linked.order,
        user: { id: user.id, username: user.username, name: user.name, phone: user.phone, customPassword: user.customPassword },
        password,
      }
    })

    logger.info('crew created', { eventId: id, by: session.username, bus: bus.name, username })
    return NextResponse.json({ worker }, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Username sudah dipakai.' }, { status: 409 })
    }
    logger.error('crew create failed', { eventId: id, username, error: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Gagal menambah crew.' }, { status: 500 })
  }
}