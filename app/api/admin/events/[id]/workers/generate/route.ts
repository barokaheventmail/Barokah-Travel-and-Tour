import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { requireAdminSession } from '@/lib/auth'
import { CREW_PASSWORD_SUFFIX, crewPassword } from '@/lib/crew-password'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

const PREFIX_RE = /^[a-z0-9_]{1,20}$/

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({
    where: { id },
    include: { buses: { orderBy: { order: 'asc' }, include: { workers: { select: { id: true } } } } },
  })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let body: { prefix?: unknown; perBus?: unknown; perBusByBus?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const prefix = typeof body?.prefix === 'string' ? body.prefix.trim().toLowerCase() : ''
  const rawPer = typeof body?.perBus === 'string' ? Number(body.perBus) : body?.perBus
  const perBus = Number.isFinite(rawPer) ? Math.min(Math.max(1, Math.floor(Number(rawPer))), 10) : 1
  if (!PREFIX_RE.test(prefix)) {
    return NextResponse.json({ error: 'Kode event hanya huruf/angka tanpa spasi, maks 20 karakter.' }, { status: 400 })
  }

  // Jumlah akun diinput manual per unit. Bus yang tidak mentioned pakai nilai
  // global `perBus` supaya request lama (tanpa peta per bus) tetap jalan.
  const perBusByBus = new Map<string, number>()
  if (body?.perBusByBus && typeof body.perBusByBus === 'object' && !Array.isArray(body.perBusByBus)) {
    for (const [busId, raw] of Object.entries(body.perBusByBus as Record<string, unknown>)) {
      const n = typeof raw === 'string' ? Number(raw) : raw
      if (typeof n === 'number' && Number.isFinite(n)) {
        perBusByBus.set(busId, Math.min(Math.max(0, Math.floor(n)), 10))
      }
    }
  }

  // Nomor yang sedang dipakai untuk prefix ini (global). Generate memakai
  // angka bebas terkecil, jadi setelah akun dihapus dan digenerate ulang,
  // penomoran mulai lagi dari 1 (tidak loncat ke angka terakhir).
  const used = new Set<number>()
  const existing = await prisma.user.findMany({
    where: { username: { startsWith: prefix } },
    select: { username: true },
  })
  for (const u of existing) {
    const tail = u.username.slice(prefix.length)
    if (/^\d+$/.test(tail)) used.add(Number(tail))
  }

  const plan = event.buses
    .map((b) => ({ bus: b, target: perBusByBus.get(b.id) ?? perBus }))
    .map((p) => ({ ...p, needed: p.target - p.bus.workers.length }))
    .filter((p) => p.needed > 0)

  const created: { busName: string; username: string; password: string }[] = []
  let nextNum = 1

  // Siapkan data user (username & password) di awal
  const plannedUsers: { bus: typeof plan[0]['bus']; order: number; username: string; password: string; hash: string }[] = []
  
  for (const { bus, needed } of plan) {
    for (let i = 0; i < needed; i++) {
      while (used.has(nextNum)) nextNum += 1
      const username = prefix + nextNum
      used.add(nextNum)
      
      plannedUsers.push({ 
        bus, 
        order: bus.workers.length + i + 1, 
        username, 
        password: crewPassword(username), 
        hash: '' 
      })
      nextNum += 1
    }
  }

  // Hash seluruh password secara paralel DI LUAR transaksi agar tidak timeout (hashing bcrypt sangat berat)
  await Promise.all(
    plannedUsers.map(async (pu) => {
      pu.hash = await bcrypt.hash(pu.password, 10)
    })
  )

  if (plannedUsers.length > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        for (const pu of plannedUsers) {
          const user = await tx.user.create({ data: { username: pu.username, passwordHash: pu.hash, role: 'CREW' } })
          await tx.busWorker.create({ data: { busId: pu.bus.id, userId: user.id, order: pu.order } })
          created.push({ busName: pu.bus.name, username: pu.username, password: pu.password })
        }
        await tx.event.update({ where: { id }, data: { crewPrefix: prefix } })
      }, {
        maxWait: 15000,
        timeout: 60000 // Beri kelonggaran waktu 60 detik jika unit sangat banyak
      })
    } catch (err) {
      logger.error('gagal membuat akun crew', { error: err instanceof Error ? err.message : String(err) })
      return NextResponse.json({ error: 'Gagal menyimpan akun ke database.' }, { status: 500 })
    }
  }

  await prisma.activityLog.create({
    data: {
      eventId: id,
      userId: session.sub,
      action: 'busCrew.generate',
      detail: {
        prefix,
        perBus,
        perBusByBus: Object.fromEntries(perBusByBus),
        buses: plan.length,
        created: created.length,
        pattern: `username+${CREW_PASSWORD_SUFFIX}`,
      },
    },
  })

  logger.info('crew accounts generated', { eventId: id, by: session.username, prefix, created: created.length })
  return NextResponse.json({ created, prefix, skipped: event.buses.length - plan.length })
}
