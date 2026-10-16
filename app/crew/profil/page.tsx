import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, CircleUserRound, History, Route } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { requireCrewSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatTanggalRentang } from '@/lib/dates'
import { parseItineraryDoc, groupItineraryByDay, type ItineraryDay } from '@/lib/itinerary'
import { SessionGuard } from '@/components/crew/session-guard'
import { LogoutButton } from '@/components/admin/logout-button'
import { CrewProfileEditor } from '@/components/crew/profile-editor'
import { CrewRiwayatList, type RiwayatLog, type RiwayatScope } from '@/components/crew/riwayat-list'
import { CREW_VISIBLE_EVENT_STATUS } from '@/lib/crew-seats'

export const metadata: Metadata = { title: 'Profil & Riwayat – Barokah Tour', robots: { index: false } }
export const dynamic = 'force-dynamic'

const PER_PAGE = 50
type SearchParams = Promise<{ tab?: string; page?: string; q?: string; scope?: string }>

export default async function CrewProfilPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireCrewSession()
  if (!session) redirect('/login?scope=CREW&next=/crew/profil')

  const sp = await searchParams
  const tab = sp.tab === 'riwayat' ? 'riwayat' : sp.tab === 'itinerary' ? 'itinerary' : 'profile'
  const scope: RiwayatScope = sp.scope === 'saya' ? 'saya' : 'unit'
  const page = Math.max(1, Number(sp.page) || 1)
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : ''
  const userId = session.sub

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true, phone: true, photoUrl: true },
  })
  if (!user) redirect('/login?scope=CREW&next=/crew/profil')

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  let logs: RiwayatLog[] = []
  let total = 0
  let todayCount = 0

  if (tab === 'riwayat') {
    if (scope === 'unit') {
      // Kehadiran di unit crew, siapa pun yang mencatatnya (admin, crew lain,
      // atau device lain). Ini yang dipakai tab scan supaya sinkron dengan panel admin.
      // Event CLOSED ikut dibaca: setelah event ditutup, riwayat tetap berguna
      // walau tidak bisa discan lagi.
      const assignments = await prisma.busWorker.findMany({
        where: { userId, bus: { event: { status: { in: [...CREW_VISIBLE_EVENT_STATUS] } } } },
        select: { busId: true },
      })
      const busIds = assignments.map((a) => a.busId)
      const where: Prisma.ParticipantWhereInput = {
        busId: { in: busIds },
        scannedAt: { not: null },
        ...(q ? { name: { contains: q } } : {}),
      }
      const [rows, t, tc] = await Promise.all([
        prisma.participant.findMany({
          where,
          orderBy: { scannedAt: 'desc' },
          skip: (page - 1) * PER_PAGE,
          take: PER_PAGE,
          select: {
            id: true,
            scannedAt: true,
            name: true,
            order: true,
            seat: true,
            room: true,
            scannedBy: { select: { id: true, username: true, name: true } },
            bus: { select: { name: true } },
            event: { select: { title: true } },
          },
        }),
        prisma.participant.count({ where }),
        prisma.participant.count({ where: { ...where, scannedAt: { not: null, gte: startOfToday } } }),
      ])
      logs = rows
        .filter((r): r is typeof r & { scannedAt: Date } => r.scannedAt !== null)
        .map((r) => ({
          id: r.id,
          status: 'attended',
          createdAt: r.scannedAt,
          scannedBy: r.scannedBy
            ? { name: r.scannedBy.name, username: r.scannedBy.username, isMe: r.scannedBy.id === userId }
            : null,
          participant: {
            name: r.name,
            order: r.order,
            seat: r.seat,
            room: r.room,
            bus: r.bus,
            event: r.event,
          },
        }))
      total = t
      todayCount = tc
    } else {
      // Riwayat pribadi: hanya scan yang dilakukan crew ini.
      const logWhere: Prisma.ScanLogWhereInput = q
        ? { userId, participant: { name: { contains: q } } }
        : { userId }
      const [l, t, tc] = await Promise.all([
        prisma.scanLog.findMany({
          where: logWhere,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * PER_PAGE,
          take: PER_PAGE,
          include: {
            participant: {
              select: {
                name: true,
                order: true,
                seat: true,
                room: true,
                bus: { select: { name: true } },
                event: { select: { title: true } },
              },
            },
          },
        }),
        prisma.scanLog.count({ where: logWhere }),
        prisma.scanLog.count({ where: { userId, createdAt: { gte: startOfToday } } }),
      ])
      // Di scope "saya" semua baris memang milik crew ini.
      logs = l.map((row) => ({
        ...row,
        scannedBy: { name: user.name, username: user.username, isMe: true },
      }))
      total = t
      todayCount = tc
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  type ItineraryGroup = {
    event: { id: string; title: string; date: Date; dateEnd: Date | null; location: string }
    buses: string[]
    dayGroups: ItineraryDay[]
    footerNote: string
  }

  let itineraryGroups: ItineraryGroup[] = []
  if (tab === 'itinerary') {
    const workers = await prisma.busWorker.findMany({
      where: { userId },
      select: {
        bus: {
          select: {
            name: true,
            event: { select: { id: true, title: true, date: true, dateEnd: true, location: true, panduanItinerary: true } },
          },
        },
      },
    })
    const groupMap = new Map<string, { event: ItineraryGroup['event']; buses: Set<string>; dayGroups: ItineraryGroup['dayGroups']; footerNote: string }>()
    for (const w of workers) {
      const ev = w.bus.event
      let group = groupMap.get(ev.id)
      if (!group) {
        group = {
          event: { id: ev.id, title: ev.title, date: ev.date, dateEnd: ev.dateEnd, location: ev.location },
          buses: new Set(),
          dayGroups: (() => {
            const doc = parseItineraryDoc(ev.panduanItinerary)
            return groupItineraryByDay(doc.rows, doc.notes, doc.sideNotes)
          })(),
          footerNote: parseItineraryDoc(ev.panduanItinerary).footerNote,
        }
        groupMap.set(ev.id, group)
      }
      group.buses.add(w.bus.name)
    }
    itineraryGroups = [...groupMap.values()].map((g) => ({ event: g.event, buses: [...g.buses], dayGroups: g.dayGroups, footerNote: g.footerNote }))
  }

  const deel = 'rounded-xl px-2 py-2 text-center text-xs font-bold transition-colors duration-200'
  const tabClass = (active: boolean) =>
    active ? `${deel} bg-[#f5b915] text-[#1d2733]` : `${deel} text-white/70 hover:bg-white/10 hover:text-white`

  return (
    <main className="min-h-screen bg-[#0f2a52] pb-16">
      <SessionGuard scope="CREW" />
      <header className="border-b border-white/10 px-4 py-5">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/crew"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Kembali ke scan"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <p className="text-left text-[11px] font-bold uppercase tracking-widest text-white/50">
                Barokah Tour and Travel
              </p>
              <h1 className="mt-0.5 flex items-center gap-1.5 text-left text-lg font-bold text-white">
                <CircleUserRound size={17} /> Profile {tab === 'riwayat' && <>&amp; Riwayat</>}
                {tab === 'itinerary' && <>&amp; Itinerary</>}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LogoutButton variant="dark" scope="CREW" />
          </div>
        </div>
        <p className="mx-auto mt-1 max-w-md text-left text-xs text-white/60">Crew: {user.username}</p>
      </header>

      <div className="mx-auto mt-5 w-full max-w-md px-4">
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5">
          <Link
            href="/crew/profil"
            className={`${tabClass(tab === 'profile')} inline-flex items-center justify-center gap-1`}
          >
            <CircleUserRound size={13} /> Profile
          </Link>
          <Link
            href="/crew/profil?tab=itinerary"
            className={`${tabClass(tab === 'itinerary')} inline-flex items-center justify-center gap-1`}
          >
            <Route size={13} /> Itinerary
          </Link>
          <Link
            href="/crew/profil?tab=riwayat"
            className={`${tabClass(tab === 'riwayat')} inline-flex items-center justify-center gap-1`}
          >
            <History size={13} /> Riwayat
          </Link>
        </div>

        <div className="mt-5">
          {tab === 'profile' ? (
            <CrewProfileEditor initial={user} />
          ) : tab === 'itinerary' ? (
            itineraryGroups.length === 0 ? (
              <div className="rounded-2xl border border-[#dfe4e8] bg-white p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4fb]">
                  <Route size={22} className="text-[#1b4f9c]" />
                </div>
                <p className="mt-3 text-sm font-bold text-[#1b3555]">Belum Ada Itinerary</p>
                <p className="mt-1 text-xs leading-relaxed text-[#657080]">
                  Kamu belum terdaftar di unit/event sehingga belum ada itinerary untuk ditampilkan.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {itineraryGroups.map((group) => (
                  <div key={group.event.id} className="rounded-2xl border border-[#dfe4e8] bg-white p-4">
                    <h3 className="text-base font-bold text-[#1b3555]">{group.event.title}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#657080]">
                      <CalendarDays size={13} className="text-[#2ca84a]" /> {formatTanggalRentang(group.event.date, group.event.dateEnd)}
                      {group.event.location && <> · {group.event.location}</>}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#eef4fb] px-2.5 py-1 text-[11px] font-bold text-[#1b4f9c]">
                      <CircleUserRound size={11} /> {group.buses.join(', ')}
                    </p>

                    {group.dayGroups.length === 0 ? (
                      <p className="mt-3 rounded-xl bg-[#f8fafc] px-4 py-3 text-xs text-[#657080]">
                        Itinerary belum diisi untuk {group.event.title}.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-6">
                        {group.dayGroups.map((dayGroup) => (
                          <div key={dayGroup.day}>
                            {(group.dayGroups.length > 1 || dayGroup.sideNote) && (
                              <div className="mb-2 flex items-start gap-2">
                                <h4 className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-bold text-[#1b4f9c]">
                                  <CalendarDays size={13} /> Day {dayGroup.day}
                                </h4>
                                {dayGroup.sideNote && <span className="whitespace-pre-wrap text-xs font-bold text-[#00A3E0]">{dayGroup.sideNote}</span>}
                              </div>
                            )}
                            {dayGroup.note && (
                              <p className="mb-3 whitespace-pre-wrap text-sm font-bold leading-relaxed text-[#00A3E0]">{dayGroup.note}</p>
                            )}
                            {dayGroup.rows.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                  <tr className="border-b border-[#dfe4e8] text-[11px] font-bold uppercase tracking-wide text-[#657080]">
                                    <th className="px-2 py-2">Waktu</th>
                                    <th className="px-2 py-2">Agenda</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dayGroup.rows.map((row, i) => (
                                    <tr key={`${dayGroup.day}-${row.time}-${i}`} className="border-b border-[#dfe4e8] last:border-0">
                                      <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[#1b4f9c]">{row.time}</td>
                                      <td className={`px-2 py-2.5 text-[#1b3555] ${row.bold ? 'text-[0.95rem] font-bold' : 'font-normal'} ${row.italic ? 'italic' : ''}`}>{row.agenda}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {group.footerNote && (
                      <p className="mt-5 whitespace-pre-wrap text-sm font-bold italic text-black">{group.footerNote}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <CrewRiwayatList
              basePath="/crew/profil"
              tab="riwayat"
              scope={scope}
              q={q}
              page={page}
              total={total}
              todayCount={todayCount}
              totalPages={totalPages}
              logs={logs}
            />
          )}
        </div>
      </div>
    </main>
  )
}