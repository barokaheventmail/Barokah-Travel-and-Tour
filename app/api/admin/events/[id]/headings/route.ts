import { NextRequest, NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  parsePanduanHeadings,
  serializePanduanHeadings,
  type SectionHeading,
} from '@/lib/panduan-heading'

type Params = { params: Promise<{ id: string }> }

type RawUpdate = {
  key: string
  title?: string
  keterangan?: string
  keterangan2?: string
}

const MAX_UPDATES = 500
const MAX_TEXT = 200

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim().slice(0, MAX_TEXT) || undefined
}

function isPageKey(key: string): boolean {
  if (key.startsWith('room:') || key.startsWith('vw:') || key.startsWith('seat:')) return key.length > 4
  if (key.startsWith('itinerary:')) return /^itinerary:\d+$/.test(key)
  return false
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: { updates?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.updates)) {
    return NextResponse.json({ error: 'Format permintaan tidak valid.' }, { status: 400 })
  }

  const raw = body.updates as RawUpdate[]
  if (raw.length === 0 || raw.length > MAX_UPDATES) {
    return NextResponse.json({ error: `Jumlah halaman harus 1–${MAX_UPDATES}.` }, { status: 400 })
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, panduanHeadings: true },
  })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  const headings = parsePanduanHeadings(event.panduanHeadings)
  const busUpdates: { busId: string; data: SectionHeading }[] = []
  let changed = 0

  for (const update of raw) {
    if (!update || typeof update.key !== 'string' || !isPageKey(update.key)) {
      return NextResponse.json({ error: `Halaman tidak dikenal: ${update?.key ?? ''}` }, { status: 400 })
    }

    const heading: SectionHeading = {}
    if ('title' in update) heading.title = clean(update.title)
    if ('keterangan' in update) heading.keterangan = clean(update.keterangan)
    if ('keterangan2' in update) heading.keterangan2 = clean(update.keterangan2)

    if (update.key.startsWith('seat:')) {
      busUpdates.push({ busId: update.key.slice('seat:'.length), data: heading })
      continue
    }

    // room:/vw:/itinerary: → simpan sebagai override per halaman (JSON).
    const merged: SectionHeading = { ...(headings[update.key] ?? {}), ...heading }
    if ('title' in update) merged.title = heading.title
    if ('keterangan' in update) merged.keterangan = heading.keterangan
    if ('keterangan2' in update) merged.keterangan2 = heading.keterangan2
    const isEmpty = !merged.title && !merged.keterangan && !merged.keterangan2
    if (isEmpty) delete headings[update.key]
    else headings[update.key] = merged
    changed += 1
  }

  const serialized = serializePanduanHeadings(headings)

  try {
    let busChanged = 0
    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: { panduanHeadings: serialized } })

      for (const { busId, data } of busUpdates) {
        const bus = await tx.bus.findFirst({ where: { id: busId, eventId: id }, select: { id: true } })
        if (!bus) continue
        if ('title' in data) {
          await tx.bus.update({ where: { id: busId }, data: { denahDudukTitle: data.title ?? null } as any })
        } else {
          continue
        }
        busChanged += 1
      }

      await tx.activityLog.create({
        data: {
          eventId: id,
          userId: session.sub,
          action: 'event.panduanHeadings',
          detail: { pages: changed, buses: busChanged, keys: raw.map((u) => u.key) },
        },
      })
    })

    logger.info('panduan page headings saved', {
      eventId: id,
      by: session.username,
      pages: changed,
      buses: busChanged,
    })

    return NextResponse.json({ ok: true, pages: changed, buses: busChanged })
  } catch (err) {
    logger.error('panduan page headings save failed', {
      eventId: id,
      by: session.username,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Gagal menyimpan judul halaman.' }, { status: 500 })
  }
}
