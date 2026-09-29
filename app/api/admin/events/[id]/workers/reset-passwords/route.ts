import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdminSession } from '@/lib/auth'
import { crewPassword } from '@/lib/crew-password'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const links = await prisma.busWorker.findMany({
    where: { bus: { eventId: id } },
    include: {
      bus: { select: { name: true } },
      user: { select: { id: true, username: true, name: true } },
    },
  })

  if (links.length === 0) {
    await prisma.activityLog.create({
      data: { eventId: id, userId: session.sub, action: 'busCrew.resetPasswords', detail: { count: 0 } },
    })
    return NextResponse.json({ reset: [] })
  }

  const byUser = new Map<string, { user: { id: string; username: string; name: string | null }; buses: string[] }>()
  for (const l of links) {
    const entry = byUser.get(l.user.id)
    if (entry) entry.buses.push(l.bus.name)
    else byUser.set(l.user.id, { user: l.user, buses: [l.bus.name] })
  }

  const reset: { username: string; name: string | null; buses: string[]; password: string }[] = []

  // bcrypt cost 10 itu ~60ms per akun. Dihitung di luar transaksi supaya
  // transaksi tidak menahan lock selama belasan detik saat crew banyak.
  const hashed: { id: string; passwordHash: string; username: string; name: string | null; buses: string[] }[] = []
  for (const { user, buses } of byUser.values()) {
    const password = crewPassword(user.username)
    hashed.push({ id: user.id, passwordHash: await bcrypt.hash(password, 10), username: user.username, name: user.name, buses })
  }

  await prisma.$transaction(async (tx) => {
    for (const row of hashed) {
      // Kembalikan semua crew ke pola: password manual yang sebelumnya disetel
      // ikut ditimpa, makanya flag-nya ikut dibersihkan.
      await tx.user.update({ where: { id: row.id }, data: { passwordHash: row.passwordHash, customPassword: false } })
      reset.push({ username: row.username, name: row.name, buses: row.buses, password: crewPassword(row.username) })
    }
    await tx.activityLog.create({
      data: {
        eventId: id,
        userId: session.sub,
        action: 'busCrew.resetPasswords',
        detail: { count: reset.length, pattern: true },
      },
    })
  })

  logger.info('crew passwords reset', { eventId: id, by: session.username, count: reset.length })
  return NextResponse.json({ reset })
}