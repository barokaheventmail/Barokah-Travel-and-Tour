import Link from 'next/link'
import type { Metadata } from 'next'
import { Bus, CalendarDays, ClipboardList, MapPin, QrCode, Search, Users } from 'lucide-react'
import { prisma } from '@/lib/db'
import { formatTanggalPendek } from '@/lib/dates'
import { CreateEvent } from '@/components/admin/create-event'

export const metadata: Metadata = { title: 'Panel Admin – Barokah Tour', robots: { index: false } }

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Draf', cls: 'bg-[#eff1f4] text-[#657080]' },
  ACTIVE: { label: 'Aktif', cls: 'bg-[#e6f4ea] text-[#2ca84a]' },
  CLOSED: { label: 'Selesai', cls: 'bg-[#eef3fb] text-[#1b4f9c]' },
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : ''

  const [events, attendedRows] = await Promise.all([
    prisma.event.findMany({
      where: q ? { title: { contains: q } } : {},
      orderBy: { date: 'desc' },
      include: { _count: { select: { buses: true, participants: true } } },
    }),
    prisma.participant.groupBy({
      by: ['eventId'],
      where: { scannedAt: { not: null } },
      _count: { _all: true },
    }),
  ])
  const attendedMap = new Map(attendedRows.map((r) => [r.eventId, r._count._all]))

  return (
    <div className="mx-auto max-w-4xl" suppressHydrationWarning>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1b3555]">Event</h1>
          <p className="mt-0.5 text-sm text-[#657080]">
            Kelola event, import peserta dari Excel, dan cetak QR absensi.
          </p>
        </div>
        <CreateEvent />
      </div>

      <form className="mt-5 flex items-center gap-2" method="get">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#dfe4e8] bg-white px-3 py-2.5">
          <Search size={15} className="shrink-0 text-[#9aa3af]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari event…"
            className="w-full bg-transparent text-sm font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af]"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-[#1b4f9c] px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#16407d]"
        >
          Cari
        </button>
        {q && (
          <Link
            href="/admin"
            className="rounded-xl border border-[#dfe4e8] bg-white px-4 py-2.5 text-sm font-bold text-[#657080] hover:bg-[#f1f3f5]"
          >
            Reset
          </Link>
        )}
      </form>

      {events.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#bfd3c4] bg-white p-10 text-center">
          <ClipboardList className="mx-auto text-[#9aa3af]" size={36} />
          <p className="mt-3 text-sm font-bold text-[#1b3555]">{q ? 'Tidak ada event yang cocok' : 'Belum ada event'}</p>
          <p className="mt-1 text-xs text-[#657080]">
            {q
              ? `Tidak ditemukan event dengan judul mengandung "${q}".`
              : 'Buat event pertama, lalu upload data peserta dari Excel.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {events.map((event) => {
            const attended = attendedMap.get(event.id) ?? 0
            const status = STATUS_LABEL[event.status] ?? STATUS_LABEL.DRAFT
            return (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="block rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold text-[#1b3555]">{event.title}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#657080]">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} /> {formatTanggalPendek(new Date(event.date))}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} /> {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
                    <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                      <Bus className="mx-auto text-[#1b4f9c]" size={15} />
                      <p className="mt-1 text-base font-black text-[#1b3555]">{event._count.buses}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa3af]">Bus</p>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                      <Users className="mx-auto text-[#2ca84a]" size={15} />
                      <p className="mt-1 text-base font-black text-[#1b3555]">{event._count.participants}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa3af]">Peserta</p>
                    </div>
                    <div className="rounded-xl bg-[#fff7e0] px-3 py-2">
                      <QrCode className="mx-auto text-[#b98a12]" size={15} />
                      <p className="mt-1 text-base font-black text-[#1b3555]">{attended}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa3af]">Hadir</p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}