import { NextRequest, NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let body: { name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Nama bus wajib diisi.' }, { status: 400 })

  const order = await prisma.bus.count({ where: { eventId: id } })
  try {
    const bus = await prisma.$transaction(async (tx) => {
      const created = await tx.bus.create({ data: { eventId: id, name, order: order + 1 } })
      await tx.activityLog.create({
        data: { eventId: id, userId: session.sub, action: 'bus.create', detail: { name } },
      })
      return created
    })
    logger.info('bus created', { eventId: id, bus: name })
    return NextResponse.json({ bus }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Nama bus sudah ada untuk event ini.' }, { status: 409 })
  }
}

/**
 * Hapus banyak bus sekaligus. Terima `{ busIds: [...] }` untuk bus terpilih atau
 * `{ all: true }` untuk semua bus di event. Peserta, crew, dan layout kursi ikut
 * terhapus mengikuti cascade relasi, jadi jumlah peserta yang hilang
 * dikembalikan supaya UI bisa memberi tahu admin.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let body: { busIds?: unknown; all?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const deleteAll = body?.all === true
  const busIds = Array.isArray(body?.busIds)
    ? [...new Set(body.busIds.filter((x): x is string => typeof x === 'string' && x.length > 0))]
    : []

  if (!deleteAll && busIds.length === 0) {
    return NextResponse.json({ error: 'Pilih minimal satu bus untuk dihapus.' }, { status: 400 })
  }

  // Hanya bus milik event ini yang boleh dihapus lewat endpoint ini.
  const targets = await prisma.bus.findMany({
    where: { eventId: id, ...(deleteAll ? {} : { id: { in: busIds } }) },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, _count: { select: { participants: true, workers: true } } },
  })
  if (targets.length === 0) {
    return NextResponse.json({ error: 'Bus tidak ditemukan.' }, { status: 404 })
  }
  if (!deleteAll && targets.length !== busIds.length) {
    return NextResponse.json({ error: 'Sebagian bus tidak ditemukan di event ini.' }, { status: 404 })
  }

  const targetIds = targets.map((b) => b.id)
  const participants = targets.reduce((acc, b) => acc + b._count.participants, 0)
  const workers = targets.reduce((acc, b) => acc + b._count.workers, 0)
  const names = targets.map((b) => b.name)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          eventId: id,
          userId: session.sub,
          action: 'bus.delete',
          detail: {
            name: names.length === 1 ? names[0] : names.join(', '),
            buses: names.length,
            names,
            participants,
            scope: deleteAll ? 'all' : 'selected',
          },
        },
      })
      await tx.bus.deleteMany({ where: { id: { in: targetIds } } })
      await tx.user.deleteMany({ where: { role: 'CREW', workers: { none: {} } } })
    })
  } catch (err) {
    logger.error('gagal menghapus bus', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Gagal menghapus bus.' }, { status: 500 })
  }

  logger.info('bus deleted', {
    eventId: id,
    by: session.username,
    buses: names.length,
    names,
    participants,
    scope: deleteAll ? 'all' : 'selected',
  })

  return NextResponse.json({ deleted: true, buses: names.length, names, participants, workers })
}
