'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  Bus,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  ListChecks,
  MapPin,
  Search,
  Users,
} from 'lucide-react'
import { TicketSearch, type TicketSearchHandle } from '@/components/ticket-search'
import { formatTanggalPendek } from '@/lib/dates'

export type EventTicketsParticipant = { id: string; order: number; name: string; token: string; present: boolean }

export type EventTicketsSection = {
  busId: string
  busName: string
  participants: EventTicketsParticipant[]
  busTotal: number
  busAttended: number
}

type EventTicketsProps = {
  eventId: string
  eventTitle: string
  eventDate: string
  eventLocation: string | null
  note: string | null
  imageUrl?: string | null
  busCount: number
  total: number
  attended: number
  sections: EventTicketsSection[]
  limit: number
  initialQuery?: string
}

export function EventTickets({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  note,
  imageUrl,
  busCount,
  total,
  attended,
  sections,
  limit,
  initialQuery,
}: EventTicketsProps) {
  const searchRef = useRef<TicketSearchHandle>(null)
  const [busSelection, setBusSelection] = useState<string[]>([])
  const [expandedBusIds, setExpandedBusIds] = useState<Set<string>>(new Set())
  const [rosterCache, setRosterCache] = useState<Record<string, EventTicketsParticipant[]>>({})
  const [rosterLoadingIds, setRosterLoadingIds] = useState<Record<string, boolean>>({})
  const [multiOpen, setMultiOpen] = useState(false)
  const [liveTotal, setLiveTotal] = useState(total)
  const [liveAttended, setLiveAttended] = useState(attended)
  const [livePerBus, setLivePerBus] = useState<Record<string, { attended: number; total: number }>>(() =>
    Object.fromEntries(sections.map((s) => [s.busId, { attended: s.busAttended, total: s.busTotal }])),
  )
  const [livePresent, setLivePresent] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {}
    for (const s of sections) map[s.busId] = new Set(s.participants.filter((p) => p.present).map((p) => p.id))
    return map
  })

  const busOptions = sections.filter((s) => s.busTotal > 0)
  const allBusIds = busOptions.map((s) => s.busId)
  const isFiltered = busSelection.length > 0
  const visibleSections = isFiltered ? sections.filter((s) => busSelection.includes(s.busId)) : sections

  const loadRosters = async (ids: string[]) => {
    const missing = ids.filter((id) => !rosterCache[id])
    if (missing.length === 0) return
    setRosterLoadingIds((prev) => ({ ...prev, ...Object.fromEntries(missing.map((id) => [id, true])) }))
    try {
      const res = await fetch(
        `/api/public/roster?eventId=${encodeURIComponent(eventId)}&busIds=${encodeURIComponent(missing.join(','))}`,
      )
      const data = await res.json()
      const map: Record<string, EventTicketsParticipant[]> = {}
      for (const bus of data.buses ?? []) map[bus.busId] = bus.participants
      setRosterCache((prev) => ({ ...prev, ...map }))
    } catch {
      // abaikan galat jaringan
    } finally {
      setRosterLoadingIds((prev) => {
        const next = { ...prev }
        for (const id of missing) delete next[id]
        return next
      })
    }
  }

  useEffect(() => {
    if (busSelection.length > 0) loadRosters(busSelection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busSelection])

  useEffect(() => {
    let cancelled = false
    let inFlight = false
    let lastSeq: string | null = null

    const tick = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const q = lastSeq ? `?since=${encodeURIComponent(lastSeq)}` : ''
        const res = await fetch(`/api/events/${eventId}/attendance${q}`, { cache: 'no-store' })
        inFlight = false
        if (!res.ok || cancelled) return
        const data = (await res.json().catch(() => null)) as {
          attended?: number
          total?: number
          perBus?: Record<string, { attended?: number; total?: number }>
          seq?: string | null
          reset?: boolean
          changes?: { type?: 'add' | 'remove'; participantId?: string; busId?: string }[]
        } | null
        if (!data) return

        const seq = typeof data.seq === 'string' ? data.seq : null
        if (seq !== lastSeq) {
          if (data.reset) {
            // Reset Kehadiran admin: scanLog sengaja tidak dihapus, jadi
            // penanda kursi harus dikosongkan lewat flag ini.
            setLivePresent((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, new Set<string>()])))
          } else if (lastSeq !== null && seq === null) {
            setLivePresent((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, new Set<string>()])))
          } else if (seq !== null && Array.isArray(data.changes) && data.changes.length > 0) {
            const deltas = data.changes
            setLivePresent((prev) => {
              const next: Record<string, Set<string>> = {}
              for (const k of Object.keys(prev)) next[k] = new Set(prev[k])
              for (const d of deltas) {
                if (typeof d?.participantId !== 'string' || typeof d?.busId !== 'string') continue
                if (!next[d.busId]) next[d.busId] = new Set()
                if (d.type === 'remove') next[d.busId].delete(d.participantId)
                else next[d.busId].add(d.participantId)
              }
              return next
            })
          }
          lastSeq = seq
        }

        if (typeof data.attended === 'number') setLiveAttended(data.attended)
        if (typeof data.total === 'number') setLiveTotal(data.total)
        const perBus = data.perBus
        if (perBus) {
          setLivePerBus((prev) => {
            const next = { ...prev }
            for (const [busId, c] of Object.entries(perBus)) {
              next[busId] = {
                attended: c.attended ?? prev[busId]?.attended ?? 0,
                total: c.total ?? prev[busId]?.total ?? 0,
              }
            }
            return next
          })
        }
      } catch {
        inFlight = false
      }
    }

    tick()
    const timer = setInterval(tick, 3000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const setFilter = (ids: string[]) => {
    setBusSelection(ids)
    setMultiOpen(false)
    if (ids.length === 0) setExpandedBusIds(new Set())
  }

  const toggleBus = (id: string) => {
    setBusSelection((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      if (next.length === 0) setExpandedBusIds(new Set())
      return next
    })
  }

  const selectAllBuses = () => setFilter(allBusIds)
  const clearBuses = () => setFilter([])

  // Persentase kehadiran untuk progress bar pada kartu "Hadir".
  const attendPct = liveTotal > 0 ? Math.min(100, Math.round((liveAttended / liveTotal) * 100)) : 0

  const toggleExpand = (busId: string) => {
    const willExpand = !expandedBusIds.has(busId)
    setExpandedBusIds((prev) => {
      const next = new Set(prev)
      if (willExpand) next.add(busId)
      else next.delete(busId)
      return next
    })
    if (willExpand) loadRosters([busId])
  }

  return (
    <>
      {/* Hero mewah: gradasi navy + semburat emas + pola titik halus */}
      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#071e3d_0%,#0d2850_45%,#163d78_100%)] shadow-[0_24px_60px_-32px_rgba(9,32,74,0.95)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(245,185,21,0.30),transparent_68%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        {imageUrl && (
          <>
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${imageUrl}')` }}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#071e3d]/85 via-[#0d2850]/25 to-[#0d2850]/10"
            />
          </>
        )}

        <div className="relative px-6 py-9 text-white md:px-10 md:py-12 drop-shadow-[0_2px_10px_rgba(9,32,74,0.85)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]">
            Event Wisata - Barokah Event
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{eventTitle}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-[13px] font-semibold text-white/90 backdrop-blur-sm">
              <CalendarDays size={14} className="shrink-0 text-[#f5b915]" />
              {formatTanggalPendek(new Date(eventDate))}
            </span>
            {eventLocation && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-[13px] font-semibold text-white/90 backdrop-blur-sm">
                <MapPin size={14} className="shrink-0 text-[#f5b915]" />
                {eventLocation}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
              </span>
              Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Kartu konten */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-[#e8edf3] bg-white shadow-[0_18px_50px_-32px_rgba(27,53,85,0.5)]">
        <div className="px-5 py-6 md:px-7">
          {note && (
            <div className="mb-6 flex gap-3.5 rounded-2xl border border-[#f0e2ba] bg-[linear-gradient(100deg,#fdf8ec_0%,#fcfbf6_100%)] p-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f9dc8c_0%,#d9a40c_100%)] text-[#5a3f04] shadow-sm">
                <Info size={15} />
              </span>
              <p className="text-sm leading-relaxed text-[#5b4a1f]">{note}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="group relative overflow-hidden rounded-2xl border border-[#e8edf3] bg-white p-4 text-center shadow-[0_10px_30px_-18px_rgba(27,53,85,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(27,53,85,0.55)] md:p-5">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#f9dc8c_0%,#f5b915_50%,#d9a40c_100%)]"
              />
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#eef3fb_0%,#dae6f6_100%)] text-[#163d78]">
                <Bus size={18} />
              </span>
              <p className="mt-2.5 text-2xl font-black tabular-nums tracking-tight text-[#0d2850] md:text-3xl">
                {busCount}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa3af]">Bus</p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-[#e8edf3] bg-white p-4 text-center shadow-[0_10px_30px_-18px_rgba(27,53,85,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(27,53,85,0.55)] md:p-5">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#f9dc8c_0%,#f5b915_50%,#d9a40c_100%)]"
              />
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#eef3fb_0%,#dae6f6_100%)] text-[#163d78]">
                <Users size={18} />
              </span>
              <p className="mt-2.5 text-2xl font-black tabular-nums tracking-tight text-[#0d2850] md:text-3xl">
                {liveTotal}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa3af]">Peserta</p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-[linear-gradient(180deg,#f2fbf5_0%,#ffffff_100%)] p-4 text-center shadow-[0_10px_30px_-18px_rgba(16,124,65,0.5)] transition-all duration-300 hover:-translate-y-0.5 md:p-5">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#4ade80_0%,#059669_100%)]"
              />
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <BadgeCheck size={18} />
              </span>
              <p className="mt-2.5 text-2xl font-black tabular-nums tracking-tight text-emerald-600 md:text-3xl">
                {liveAttended}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa3af]">Hadir</p>
              <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#4ade80_0%,#059669_100%)] transition-[width] duration-500"
                  style={{ width: `${attendPct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] font-bold tabular-nums text-emerald-700/70">{attendPct}%</p>
            </div>
          </div>

          {/* Pencarian dipindah ke bawah hero agar alur baca lebih natural */}
          <div className="mt-6 rounded-2xl border border-[#e8edf3] bg-[linear-gradient(180deg,#fbfcfe_0%,#ffffff_100%)] p-4 shadow-[0_10px_30px_-20px_rgba(27,53,85,0.4)] md:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#071e3d_0%,#163d78_100%)] text-white shadow-[0_8px_20px_-10px_rgba(9,32,74,0.9)]">
                <Search size={16} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#0d2850]">Cari Nama Peserta</h2>
                <p className="text-xs text-[#657080]">Ketik nama Anda untuk melihat tiket &amp; QR di event ini.</p>
              </div>
            </div>
            <div className="mt-4">
              <TicketSearch
                ref={searchRef}
                eventId={eventId}
                busIds={busSelection}
                initialQuery={initialQuery}
              />
            </div>
          </div>

          {busOptions.length > 0 && (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMultiOpen((o) => !o)}
                  aria-expanded={multiOpen}
                  className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all duration-200 ${
                    busSelection.length > 0
                      ? 'border-transparent bg-[linear-gradient(100deg,#071e3d_0%,#163d78_100%)] text-white shadow-[0_12px_28px_-12px_rgba(9,32,74,0.95)]'
                      : multiOpen
                        ? 'border-[#163d78] bg-[#eef3fb] text-[#0d2850]'
                        : 'border-[#e2e8ef] bg-white text-[#1b3555] hover:border-[#163d78]/30 hover:bg-[#f6f9fd] hover:shadow-[0_10px_24px_-16px_rgba(27,53,85,0.7)]'
                  }`}
                >
                  <ListChecks size={14} />
                  Pilih Banyak Bus
                  {busSelection.length > 0 && (
                    <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums">
                      {busSelection.length}
                    </span>
                  )}
                  {multiOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {busSelection.length > 0 && (
                  <button
                    type="button"
                    onClick={clearBuses}
                    className="rounded-full border border-[#e4e8ec] bg-white px-3 py-2 text-xs font-bold text-[#657080] transition-all duration-200 hover:border-[#e0a3a0] hover:bg-[#fdf1f0] hover:text-[#c0392b]"
                  >
                    Hapus Pilihan
                  </button>
                )}
              </div>

              {multiOpen && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-[0_14px_34px_-20px_rgba(27,53,85,0.45)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef1f4] bg-gradient-to-r from-[#f7fafd] to-[#eaf1fa] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f9dc8c_0%,#d9a40c_100%)] text-[#5a3f04] shadow-sm">
                        <ListChecks size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#1b3555]">
                          {busSelection.length === 0
                            ? 'Belum ada bus dipilih'
                            : `${busSelection.length} Bus Dipilih`}
                        </p>
                        <p className="text-[11px] text-[#7a8798]">
                          {busSelection.length === 0
                            ? `Centang bus yang mau dilihat — kosong berarti semua ${busOptions.length} bus`
                            : `dari ${busOptions.length} bus tersedia`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={selectAllBuses}
                        className="rounded-full bg-[linear-gradient(100deg,#071e3d_0%,#163d78_100%)] px-3 py-1.5 text-xs font-bold text-white transition-all duration-200 hover:shadow-[0_10px_22px_-10px_rgba(9,32,74,0.95)]"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={clearBuses}
                        disabled={busSelection.length === 0}
                        className="rounded-full border border-[#e4e8ec] bg-white px-3 py-1.5 text-xs font-bold text-[#657080] transition-all duration-200 hover:border-[#e0a3a0] hover:bg-[#fdf1f0] hover:text-[#c0392b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#e4e8ec] disabled:hover:bg-white disabled:hover:text-[#657080]"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 p-4 sm:grid-cols-2">
                    {busOptions.map((b) => {
                      const checked = busSelection.includes(b.busId)
                      return (
                        <label
                          key={b.busId}
                          className={`flex cursor-pointer select-none items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                            checked
                              ? 'border-[#163d78]/45 bg-[#eef3fb] shadow-[0_10px_24px_-16px_rgba(13,40,80,0.9)]'
                              : 'border-[#e4e8ec] bg-white hover:border-[#163d78]/30 hover:bg-[#f7fafd]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBus(b.busId)}
                            className="peer sr-only"
                          />
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[#163d78]/40 peer-focus-visible:ring-offset-1 ${
                              checked
                                ? 'border-[#163d78] bg-[#163d78] text-white'
                                : 'border-[#cbd3db] bg-white text-transparent'
                            }`}
                          >
                            <Check size={13} strokeWidth={3} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-[#1b3555]">{b.busName}</span>
                            <span className="block text-[11px] text-[#8b96a5]">{b.busTotal} peserta</span>
                          </span>
                          {checked && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#163d78] text-white shadow-sm">
                              <Check size={13} strokeWidth={3} />
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {visibleSections.length > 0 ? (
            <div className="mt-6 space-y-5">
              {visibleSections.map((section) => {
                const cache = rosterCache[section.busId]
                const forceAll = isFiltered && busSelection.includes(section.busId)
                const isExpanded = forceAll || expandedBusIds.has(section.busId)
                const loading = !!rosterLoadingIds[section.busId]
                const list = cache ?? section.participants
                const shown = isExpanded ? list : list.slice(0, limit)
                const hidden = section.busTotal - shown.length

                return (
                  <div
                    key={section.busId}
                    className="overflow-hidden rounded-2xl border border-[#e8edf3] shadow-[0_10px_30px_-20px_rgba(27,53,85,0.4)]"
                  >
                    <div className="flex items-center justify-between gap-3 bg-[linear-gradient(100deg,#071e3d_0%,#0d2850_55%,#163d78_100%)] px-4 py-3">
                      <p className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-white">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#f5b915]">
                          <Bus size={14} />
                        </span>
                        <span className="truncate">{section.busName}</span>
                      </p>
                      <span className="shrink-0 rounded-full border border-[#f5b915]/30 bg-[#f5b915]/12 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-[#f7dda1]">
                        {(livePerBus[section.busId]?.attended ?? section.busAttended)}/{section.busTotal} hadir
                      </span>
                    </div>
                    <div className="divide-y divide-[#f0f3f6]">
                      {shown.map((p) => {
                        const isPresent = p.present || (livePresent[section.busId]?.has(p.id) ?? false)
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-x-4 px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-[#f7fafd] ${isPresent ? 'bg-[#f4fbf6]' : ''}`}
                          >
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${isPresent ? 'bg-emerald-100 text-emerald-600' : 'bg-[#eef3fb] text-[#163d78]'}`}>
                              {p.order}
                            </span>
                            <button
                              type="button"
                              onClick={() => searchRef.current?.search(p.name, p.token)}
                              title={`Cari ${p.name}`}
                              className="min-w-0 flex-1 cursor-pointer truncate text-left font-semibold text-[#1b3555] underline-offset-2 transition-colors duration-150 hover:text-[#163d78] hover:underline"
                            >
                              {p.name}
                            </button>
                            {isPresent && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                                <BadgeCheck size={12} /> Hadir
                              </span>
                            )}
                          </div>
                        )
                      })}

                      {loading && isExpanded && !cache && (
                        <p className="bg-[#fbfcfd] px-4 py-2.5 text-xs font-semibold text-[#657080]">
                          Memuat peserta…
                        </p>
                      )}

                      {!isExpanded && section.busTotal > limit && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(section.busId)}
                          className="flex w-full items-start gap-2 bg-[linear-gradient(100deg,#fdf8ec_0%,#fcfbf6_100%)] px-4 py-3 text-left text-xs font-semibold leading-relaxed text-[#8a6a10] transition-colors duration-150 hover:bg-[#fbf1d8]"
                        >
                          <ChevronDown size={14} className="mt-0.5 shrink-0 text-[#d9a40c]" />
                          <span>
                            Dan {hidden} peserta lainnya — klik untuk menampilkan semua peserta, atau ketik nama Anda pada
                            kolom &quot;Cari Nama Peserta&quot; di atas untuk melihat tiket &amp; QR.
                          </span>
                        </button>
                      )}

                      {isExpanded && section.busTotal > limit && cache && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(section.busId)}
                          className="flex w-full items-center gap-2 bg-[linear-gradient(100deg,#fdf8ec_0%,#fcfbf6_100%)] px-4 py-3 text-left text-xs font-semibold text-[#8a6a10] transition-colors duration-150 hover:bg-[#fbf1d8]"
                        >
                          <ChevronUp size={14} className="shrink-0 text-[#d9a40c]" />
                          <span>Sembunyikan peserta lainnya</span>
                        </button>
                      )}

                      {section.busTotal === 0 && (
                        <p className="px-4 py-3 text-xs text-[#657080]">Belum ada peserta di bus ini.</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#d8e0ea] bg-[linear-gradient(180deg,#fbfcfe_0%,#ffffff_100%)] p-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3fb] text-[#163d78]">
                <Bus size={22} />
              </span>
              <p className="mt-3 text-sm font-bold text-[#1b3555]">Belum ada bus/peserta</p>
              <p className="mt-0.5 text-xs text-[#657080]">Belum ada bus/peserta untuk event ini.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}