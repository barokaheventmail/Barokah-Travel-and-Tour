import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, Bus, CalendarDays, History, MapPin, Printer, ShieldAlert } from 'lucide-react'
import { prisma } from '@/lib/db'
import { formatWaktuLengkap } from '@/lib/dates'
import { EditEvent } from '@/components/admin/edit-event'
import { DeleteEvent } from '@/components/admin/delete-event'
import { ImportExcel } from '@/components/admin/import-excel'
import { ExportMenu } from '@/components/admin/export-menu'
import { type RowBus } from '@/components/admin/participant-table'
import { AddParticipant } from '@/components/admin/add-participant'
import { PesertaTabs } from '@/components/admin/peserta-tabs'
import { ArmadaActions } from '@/components/admin/armada-actions'
import { BusArmadaSection, type BusWithWorkersData } from '@/components/admin/bus-crew'
import { SeatLayoutEditor, type SeatBus } from '@/components/admin/seat-layout-editor'
import { PanduanEditor } from '@/components/admin/panduan-editor'
import { EventImage } from '@/components/admin/event-image'
import type { GenerateBus } from '@/components/admin/generate-crew'
import type { CredentialBus } from '@/components/admin/crew-credentials-modal'
import { ResetAttendance } from '@/components/admin/reset-attendance'
import { LogEntry } from '@/components/admin/log-entry'
import { HIDDEN_LOG_ACTIONS } from '@/lib/log-labels'
import { armadasTanpaCrew, totalPesertaTanpaCrew } from '@/lib/crew-coverage'
import { parsePanduanPreset, parseKursiPreset, type PanduanPresetOption, type KursiPresetOption } from '@/lib/preset'
import { TabBar, isEventTab, type EventTabId } from '@/components/admin/tab-bar'

const MANAGEMENT_ACTIONS: string[] = ['scan.attended', 'scan.duplicate', ...HIDDEN_LOG_ACTIONS]

export const metadata: Metadata = { title: 'Detail Event – Panel Admin', robots: { index: false } }

export const dynamic = 'force-dynamic'

export default async function EventDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const active: EventTabId = isEventTab(tab) ? tab : 'ringkasan'

  const [event, totalByBus, attendedByBus, eventLogs, eventLogCount, allPresets] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        buses: {
          orderBy: { order: 'asc' },
          include: { workers: { orderBy: { order: 'asc' }, include: { user: { select: { id: true, username: true, name: true, phone: true, photoUrl: true, customPassword: true } } } } },
        },
      },
    }),
    prisma.participant.groupBy({ by: ['busId'], where: { eventId: id }, _count: { _all: true } }),
    prisma.participant.groupBy({
      by: ['busId'],
      where: { eventId: id, scannedAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.activityLog.findMany({
      where: { eventId: id, action: { notIn: MANAGEMENT_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { user: { select: { username: true } } },
    }),
    prisma.activityLog.count({ where: { eventId: id, action: { notIn: MANAGEMENT_ACTIONS } } }),
    prisma.preset.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
  ])

  if (!event) notFound()

  const panduanPresets: PanduanPresetOption[] = allPresets
    .filter((p) => p.kind === 'PANDUAN')
    .flatMap((p) => {
      const data = parsePanduanPreset(p.data)
      if (!data) return []
      return [
        {
          id: p.id,
          name: p.name,
          panduanItinerary: data.panduanItinerary,
          panduanLogoLeft: data.panduanLogoLeft,
          panduanLogoRight: data.panduanLogoRight,
          panduanLogoTopRight: data.panduanLogoTopRight,
          panduanLogoTopRight2: data.panduanLogoTopRight2,
        },
      ]
    })
  const kursiPresets: KursiPresetOption[] = allPresets
    .filter((p) => p.kind === 'KURSI')
    .flatMap((p) => {
      const data = parseKursiPreset(p.data)
      if (!data) return []
      return [{ id: p.id, name: p.name, ...data }]
    })

  const totalMap = new Map(totalByBus.map((r) => [r.busId, r._count._all]))
  const attendedMap = new Map(attendedByBus.map((r) => [r.busId, r._count._all]))

  const buses: RowBus[] = event.buses.map((b) => ({
    id: b.id,
    name: b.name,
    order: b.order,
    count: totalMap.get(b.id) ?? 0,
    attended: attendedMap.get(b.id) ?? 0,
  }))

  const busesWithWorkers: BusWithWorkersData[] = event.buses.map((b) => ({
    id: b.id,
    name: b.name,
    order: b.order,
    count: totalMap.get(b.id) ?? 0,
    attended: attendedMap.get(b.id) ?? 0,
    workers: b.workers.map((w) => ({
      id: w.id,
      order: w.order,
      user: {
        id: w.user.id,
        username: w.user.username,
        name: w.user.name,
        phone: w.user.phone,
        photoUrl: w.user.photoUrl,
        customPassword: w.user.customPassword,
      },
    })),
  }))

  const generateBuses: GenerateBus[] = event.buses.map((b) => ({
    id: b.id,
    name: b.name,
    workerCount: b.workers.length,
  }))
  const credentialBuses: CredentialBus[] = event.buses.map((b) => ({
    name: b.name,
    usernames: b.workers.map((w) => w.user.username).sort((a, c) => a.localeCompare(c)),
    customUsernames: b.workers.filter((w) => w.user.customPassword).map((w) => w.user.username),
  }))

  const seatBuses: SeatBus[] = event.buses.map((b) => ({
    id: b.id,
    name: b.name,
    count: totalMap.get(b.id) ?? 0,
    seatRows: b.seatRows,
    seatCols: b.seatCols,
    seatCellW: b.seatCellW,
    seatCellH: b.seatCellH,
    seatLayout: b.seatLayout,
    frontLayout: b.frontLayout,
    facilities: b.facilities,
    unitImageUrl: b.unitImageUrl,
    unitLabel: b.unitLabel,
    unitImagePosX: b.unitImagePosX,
    unitImagePosY: b.unitImagePosY,
    unitImageZoom: b.unitImageZoom,
  }))

  const uniqueCrewCount = new Set(event.buses.flatMap((b) => b.workers.map((w) => w.user.id))).size

  const totalParticipants = buses.reduce((acc, b) => acc + b.count, 0)
  const totalAttended = buses.reduce((acc, b) => acc + b.attended, 0)

  // Peserta di unit tanpa crew tetap dihitung admin, tapi tidak akan muncul
  // di aplikasi crew dan QR-nya ditolak => beri tahu admin sejak awal.
  const busesWithoutCrew = armadasTanpaCrew(
    event.buses.map((b) => ({ name: b.name, count: totalMap.get(b.id) ?? 0, workerCount: b.workers.length })),
  )
  const participantsWithoutCrew = totalPesertaTanpaCrew(busesWithoutCrew)

  const stats = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {buses.length > 0 && (
        <div className="rounded-2xl border border-[#dfe4e8] bg-white p-4 shadow-sm">
          <Bus className="text-[#1b4f9c]" size={18} />
          <p className="mt-2 text-2xl font-black text-[#1b3555]">{buses.length}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Bus / Unit</p>
        </div>
      )}
      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-4 shadow-sm">
        <p className="text-2xl font-black text-[#1b3555]">{totalParticipants}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Total Peserta</p>
      </div>
      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-4 shadow-sm">
        <p className="text-2xl font-black text-[#2ca84a]">{totalAttended}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Sudah Hadir</p>
      </div>
      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-4 shadow-sm">
        <p className="text-2xl font-black text-[#b98a12]">{totalParticipants - totalAttended}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Belum Hadir</p>
      </div>
    </div>
  )

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <ImportExcel eventId={event.id} />
      <ExportMenu eventId={event.id} buses={buses} />
      <Link
        href={`/admin/events/${event.id}/qr`}
        className="flex items-center gap-1.5 rounded-full bg-[#f5b915] px-5 py-2.5 text-sm font-bold text-[#1d2733] transition-colors duration-200 hover:bg-[#e4aa09] active:scale-95"
      >
        <Printer size={15} /> Cetak QR Peserta
      </Link>
    </div>
  )

  const riwayatList = eventLogs.map((log) => (
    <LogEntry
      key={log.id}
      showEvent={false}
      log={{
        id: log.id,
        action: log.action,
        detail: log.detail,
        createdAt: log.createdAt,
        user: log.user,
        event: null,
      }}
    />
  ))

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="inline-flex items-center gap-1 text-xs font-bold text-[#657080] hover:text-[#1b4f9c]">
        <ArrowLeft size={13} /> Kembali ke daftar event
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[#1b3555]">{event.title}</h1>
            <span className="flex items-center gap-2">
<EditEvent
                  event={{
                    id: event.id,
                    title: event.title,
                    date: event.date.toISOString(),
                    location: event.location,
                    vwName: event.vwName,
                    status: event.status,
                    note: event.note ?? '',
                  }}
                />
              <DeleteEvent eventId={event.id} />
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#657080]">
            <span className="flex items-center gap-1">
              <CalendarDays size={13} /> {formatWaktuLengkap(new Date(event.date))}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {event.location}
              </span>
            )}
          </div>
        </div>
      </div>

      <TabBar eventId={event.id} active={active} />

      {active === 'ringkasan' && (
        <div className="mt-5 space-y-4">
          {stats}

          <EventImage eventId={event.id} imageUrl={event.imageUrl} />

          <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#1b3555]">Aksi Cepat</h2>
            <p className="mt-0.5 text-xs text-[#657080]">
              Import peserta dari Excel, cetak QR untuk scan crew, atau unduh data.
            </p>
            <div className="mt-3">{actionButtons}</div>
          </div>

          <div className="rounded-2xl border border-[#f0c4c4] bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#c03a3a]">
              <ShieldAlert size={15} /> Pengaturan
            </h2>
            <p className="mt-0.5 text-xs text-[#657080]">Aksi berisiko: hapus catatan kehadiran semua peserta.</p>
            <div className="mt-3">
              <ResetAttendance eventId={event.id} attendedCount={totalAttended} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#1b3555]">
                  <History size={15} /> Aktivitas Terbaru
                </h2>
                <p className="mt-0.5 text-xs text-[#657080]">Aksi kelola terakhir di event ini.</p>
              </div>
              <Link
                href={`/admin/events/${event.id}?tab=riwayat`}
                className="shrink-0 text-xs font-bold text-[#1b4f9c] hover:text-[#16407d]"
              >
                Lihat semua →
              </Link>
            </div>
            {riwayatList.length === 0 ? (
              <p className="mt-4 text-xs text-[#9aa3af]">Belum ada aktivitas kelola untuk event ini.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#eef1f4]">
                {riwayatList.slice(0, 6)}
              </ul>
            )}
          </div>
        </div>
      )}

      {active === 'panduan' && (
        <PanduanEditor
          eventId={event.id}
          eventTitle={event.title}
          presets={panduanPresets}
          initialItinerary={event.panduanItinerary ?? '[]'}
          initialRules={event.panduanRules ?? ''}
          initialCrewName={event.crewName ?? ''}
          initialCrewPhone={event.crewPhone ?? ''}
          initialCrewRole={event.crewRole ?? ''}
          initialCrewPhotoUrl={event.crewPhotoUrl ?? null}
          initialDenahCrewName={event.denahKamarCrewName ?? ''}
          initialDenahCrewRole={event.denahKamarCrewRole ?? ''}
          initialDenahCrewPhotoUrl={event.denahKamarCrewPhotoUrl ?? null}
          initialDenahVwCrewName={event.denahVwCrewName ?? ''}
          initialDenahVwCrewRole={event.denahVwCrewRole ?? ''}
          initialDenahVwCrewPhotoUrl={event.denahVwCrewPhotoUrl ?? null}
          initialLogoLeft={event.panduanLogoLeft ?? null}
          initialLogoRight={event.panduanLogoRight ?? null}
          initialLogoTopRight={event.panduanLogoTopRight ?? null}
          initialLogoTopRight2={event.panduanLogoTopRight2 ?? null}
        />
      )}

      {active === 'peserta' && (
        <div className="mt-5 space-y-4">
          {busesWithoutCrew.length > 0 && (
            <div className="rounded-2xl border border-[#f0c4c4] bg-[#fdf0f0] p-5 shadow-sm">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#c03a3a]">
                <ShieldAlert size={15} /> {busesWithoutCrew.length} unit belum punya crew
              </h2>
              <p className="mt-0.5 text-xs text-[#657080]">
                {participantsWithoutCrew} peserta ({busesWithoutCrew.map((b) => b.name).join(', ')}) tidak bisa discan
                dari aplikasi crew sampai ada crew yang ditugaskan.
              </p>
              <Link
                href={`/admin/events/${event.id}?tab=unit`}
                className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#f0c4c4] bg-white px-4 py-2 text-xs font-bold text-[#c03a3a] transition-colors duration-200 hover:bg-[#fdecec] active:scale-95"
              >
                Tambahkan crew di tab Unit <ArrowRight size={13} />
              </Link>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#1b3555]">Peserta</h2>
              <p className="text-xs text-[#657080]">
                {totalParticipants} peserta · cari, filter, dan kelola per peserta.
              </p>
            </div>
            <AddParticipant eventId={event.id} buses={buses} />
          </div>
          <PesertaTabs
            eventId={event.id}
            buses={buses}
            totalParticipants={totalParticipants}
            totalAttended={totalAttended}
          />
        </div>
      )}

      {active === 'unit' && (
        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <ArmadaActions
              eventId={event.id}
              eventTitle={event.title}
              eventDate={event.date.toISOString()}
              defaultPrefix={event.crewPrefix}
              buses={generateBuses}
              credentialBuses={credentialBuses}
              totalCrew={uniqueCrewCount}
              totalAccounts={generateBuses.reduce((sum, b) => sum + b.workerCount, 0)}
              hasBuses={event.buses.length > 0}
            />
            <div>
              <h2 className="text-sm font-bold text-[#1b3555]">Bus & Unit</h2>
              <p className="text-xs text-[#657080]">
                Klik unit untuk kelola crew dan namanya. Akun crew dibuat dari Generate Akun Crew.
              </p>
            </div>
          </div>
          {event.buses.length > 0 ? (
            <BusArmadaSection eventId={event.id} buses={busesWithWorkers} />
          ) : (
            <p className="rounded-xl bg-[#f8fafc] px-4 py-6 text-center text-xs font-semibold text-[#9aa3af]">
              Belum ada bus/unit. Tambah manual lewat tombol di atas, atau impor dari Excel.
            </p>
          )}
        </div>
      )}

      {active === 'kursi' && <SeatLayoutEditor eventId={event.id} buses={seatBuses} presets={kursiPresets} />}

      {active === 'riwayat' && (
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-[#ece3cd] bg-white shadow-[0_18px_44px_-28px_rgba(27,53,85,0.5)]">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#f9dc8c_0%,#f5b915_50%,#d9a40c_100%)]"
          />

          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(140deg,#1b3555_0%,#0d2850_100%)] text-[#f5b915] shadow-[0_10px_24px_-12px_rgba(13,40,80,0.8)]">
                <History size={19} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-[#1b3555]">Riwayat Event</h2>
                  <span className="rounded-full border border-[#e8d9a8] bg-[#fffdf5] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#8a6a08]">
                    {eventLogCount.toLocaleString('id-ID')} entri
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#657080]">
                  Jejak setiap aksi kelola event ini — import, bus, peserta, crew, hingga reset. Scan crew
                  tercatat terpisah di riwayat crew.
                </p>
              </div>
            </div>

            {/* Gaya link-nya sama dengan "Kembali ke daftar event" di atas dan
                dengan link kembali di halaman riwayat. */}
            <Link
              href={`/admin/logs?eventId=${event.id}`}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#657080] hover:text-[#1b4f9c]"
            >
              Lihat riwayat lengkap <ArrowRight size={13} />
            </Link>
          </div>

          {eventLogs.length === 0 ? (
            <div className="mx-5 mb-5 flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#e6dcc2] bg-[linear-gradient(180deg,#fcfbf6_0%,#ffffff_100%)] px-4 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff7e0] text-[#b98a12]">
                <History size={17} />
              </span>
              <p className="text-xs font-bold text-[#1b3555]">Belum ada aktivitas</p>
              <p className="max-w-xs text-[11px] leading-relaxed text-[#9aa3af]">
                Riwayat akan terisi sendiri begitu ada import, bus, peserta, atau crew yang dikelola.
              </p>
            </div>
          ) : (
            <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-[#eee6d2] bg-[linear-gradient(180deg,#fcfbf6_0%,#ffffff_60%)]">
              <ul className="max-h-[420px] divide-y divide-[#f0ece0] overflow-y-auto">
                {riwayatList}
              </ul>
            </div>
          )}

          {eventLogCount > eventLogs.length && (
            <p className="mx-5 mb-5 rounded-full border border-[#eee6d2] bg-[#fffdf5] px-3.5 py-2 text-center text-[11px] font-bold text-[#8a6a08]">
              Menampilkan {eventLogs.length} terbaru · {eventLogCount - eventLogs.length} entri lainnya
            </p>
          )}
        </div>
      )}
    </div>
  )
}