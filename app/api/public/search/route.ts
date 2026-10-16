import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100)
  const eventId = (request.nextUrl.searchParams.get('eventId') ?? '').trim().slice(0, 100)
  const busIds = (request.nextUrl.searchParams.get('busIds') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 50)
  if (!q) return NextResponse.json({ matches: [] })

  // Satu kata kunci harusnya otomatis cocok dengan semua peserta yang namanya
  // mengandungnya, termasuk huruf besar-kecil dan urutan kata yang berbeda.
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 6)
  if (terms.length === 0) return NextResponse.json({ matches: [] })

  const rows = await prisma.participant.findMany({
    where: {
      // MySQL default collation sudah case-insensitive, jadi `mode: 'insensitive'`
      // tidak dipakai (Prisma connector MySQL tidak menerima argumen itu).
      AND: terms.map((term) => ({ name: { contains: term } })),
      event: { status: 'ACTIVE' },
      ...(eventId ? { eventId } : {}),
      ...(busIds.length ? { busId: { in: busIds } } : {}),
    },
    select: {
      token: true,
      name: true,
      order: true,
      birthDate: true,
      bus: {
        select: {
          name: true,
          workers: {
            orderBy: { order: 'asc' },
            select: { user: { select: { name: true, username: true, phone: true, photoUrl: true } } },
          },
        },
      },
      event: { select: { id: true, title: true, date: true, dateEnd: true } },
    },
    orderBy: [{ event: { date: 'desc' } }, { order: 'asc' }],
    take: 500,
  })

  const needle = terms.join(' ')

  // Relevance: exact match dulu, lalu nama yang diawali, lalu awal kata,
  // baru Contain di tengah. Tanpa ini hasil untuk satu huruf apa pun akan
  // berantakan dan accuses first participant yang kebetulan match.
  const rank = (name: string) => {
    const n = name.trim().toLowerCase()
    const p = needle.toLowerCase()
    if (n === p) return 0
    if (n.startsWith(p)) return 1
    if (terms.every((t) => n.split(/\s+/).some((w) => w.startsWith(t.toLowerCase())))) return 2
    return 3
  }

  rows.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'id'))
  const total = rows.length
  const matches = rows.slice(0, 200)

  logger.info('public search', { q, hits: matches.length, total })

  return NextResponse.json({
    total,
    matches: matches.map((p) => {
      const resp = p.bus.workers.find((w) => w.user.phone)?.user
      return {
        eventId: p.event.id,
        token: p.token,
        name: p.name,
        order: p.order,
        birthDate: p.birthDate ? p.birthDate.toISOString() : null,
        busName: p.bus.name,
        eventTitle: p.event.title,
        eventDate: p.event.date.toISOString(),
        eventDateEnd: p.event.dateEnd ? p.event.dateEnd.toISOString() : null,
        crew: resp ? { name: resp.name ?? resp.username, phone: resp.phone, photoUrl: resp.photoUrl } : null,
      }
    }),
  })
}