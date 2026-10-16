import { NextRequest, NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { eventSchema } from '@/lib/excel'

export async function GET() {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const events = await prisma.event.findMany({
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { buses: true, participants: true } },
    },
  })

  return NextResponse.json({ events })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  const { title, date, dateEnd, location, status, note, panduanItinerary, crewName, crewPhone, crewRole, crewPhotoUrl, vwName } = parsed.data
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return NextResponse.json({ error: 'Tanggal tidak valid.' }, { status: 400 })
  }
  let de: Date | null = null
  if (dateEnd) {
    de = new Date(dateEnd)
    if (isNaN(de.getTime())) {
      return NextResponse.json({ error: 'Tanggal selesai tidak valid.' }, { status: 400 })
    }
    if (de.getTime() < d.getTime()) {
      return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' }, { status: 400 })
    }
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        title,
        date: d,
        dateEnd: de,
        location,
        vwName: vwName || 'VW MAGELANG',
        status,
        note: note || null,
        panduanItinerary: panduanItinerary || null,
        crewName: crewName || null,
        crewPhone: crewPhone || null,
        crewRole: crewRole || null,
        crewPhotoUrl: crewPhotoUrl || null,
      },
    })
    await tx.activityLog.create({
      data: { eventId: created.id, userId: session.sub, action: 'event.create', detail: { title, date: d.toISOString() } },
    })
    return created
  })
  logger.info('event created', { eventId: event.id, by: session.username })

  return NextResponse.json({ event }, { status: 201 })
}