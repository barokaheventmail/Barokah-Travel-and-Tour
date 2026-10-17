'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Armchair, ChevronLeft, ChevronRight, Loader2, SearchX, Sparkles } from 'lucide-react'
import { FACILITY_ICONS } from '@/components/facility-icon'
import { SeatGrid, type SeatCell } from '@/components/seat-grid'
import { unitImageStyle } from '@/lib/seat'
import type { Facility } from '@/lib/facilities'

type PublicBus = {
  busId: string
  busName: string
  unitImageUrl: string | null
  unitLabel: string | null
  unitImagePosX: number
  unitImagePosY: number
  unitImageZoom: number
  seatRows: number
  seatCols: number
  seatCellW: number
  seatCellH: number
  seatLayout: string | null
  frontLayout: string | null
  total: number
  filled: number
  seats: SeatCell[]
  facilities: Facility[]
}

type Selected = { seat: string; name: string; busName: string }

const REFRESH_MS = 3000

export function PublicSeatMap({
  eventId,
  buses,
  initialBusId,
  highlightSeat,
}: {
  eventId: string
  buses: { id: string; name: string }[]
  initialBusId?: string | null
  highlightSeat?: string | null
}) {
  const [selectedId, setSelectedId] = useState<string>(initialBusId ?? buses[0]?.id ?? '')
  const [data, setData] = useState<PublicBus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isMyBus = initialBusId != null && selectedId === initialBusId
  const mySeat = isMyBus ? highlightSeat : null

  const index = buses.findIndex((b) => b.id === selectedId)
  const current = index >= 0 ? buses[index] : null

  // Daftar nama dipecah per kelompok, maksimal 30 peserta per kelompok, dan
  // paling banyak 2 kelompok berdampingan. Kelompok berikutnya turun ke baris
  // baru dengan pola bergantian kiri → kanan.
  const ROSTER_COLUMN_SIZE = 30
  const ROSTER_COLUMNS_PER_ROW = 2
  const rosterSeats = data?.seats ?? []
  const rosterColumns: (typeof rosterSeats)[] = []
  for (let i = 0; i < rosterSeats.length; i += ROSTER_COLUMN_SIZE) {
    rosterColumns.push(rosterSeats.slice(i, i + ROSTER_COLUMN_SIZE))
  }
  const rosterRows: (typeof rosterSeats)[][] = []
  for (let i = 0; i < rosterColumns.length; i += ROSTER_COLUMNS_PER_ROW) {
    rosterRows.push(rosterColumns.slice(i, i + ROSTER_COLUMNS_PER_ROW))
  }

  function step(dir: 1 | -1) {
    if (buses.length === 0) return
    const from = index >= 0 ? index : 0
    setSelectedId(buses[(from + dir + buses.length) % buses.length].id)
  }

  useEffect(() => {
    setSelectedId((prev) => (prev && buses.some((b) => b.id === prev) ? prev : initialBusId ?? buses[0]?.id ?? ''))
  }, [buses, initialBusId])

  useEffect(() => {
    if (!selectedId) {
      setData(null)
      setLoading(false)
      return
    }
    let cancelled = false
    let inFlight = false

    const load = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const res = await fetch(
          `/api/public/seats?eventId=${encodeURIComponent(eventId)}&busId=${encodeURIComponent(selectedId)}`,
          { cache: 'no-store' },
        )
        if (!res.ok || cancelled) return
        const payload = (await res.json().catch(() => null)) as { buses?: PublicBus[] } | null
        if (!payload || cancelled) return
        const bus = payload.buses?.find((b) => b.busId === selectedId) ?? null
        setData(bus)
        setSelected((prev) => {
          if (!prev || prev.busName !== bus?.busName) return prev
          if (!bus || !bus.seats.some((s) => s.seat === prev.seat)) return null
          return prev
        })
      } catch {
        // abaikan, poll berikutnya
      } finally {
        if (!cancelled) {
          inFlight = false
          setLoading(false)
        }
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [eventId, selectedId])

  return (
    <div className="mt-4 flex flex-1 flex-col">
      {buses.length > 1 && (
        <div className="mt-3 flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Unit sebelumnya"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] bg-white p-0 text-[#1b4f9c] transition-colors duration-150 hover:bg-[#eef4fb] active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-xs font-bold text-[#1b3555]">
            {current?.name ?? '—'}
            <span className="ml-1.5 text-[11px] font-semibold text-[#9aa3af]">
              {index >= 0 ? `${index + 1}/${buses.length}` : ''}
            </span>
          </p>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Unit berikutnya"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] bg-white p-0 text-[#1b4f9c] transition-colors duration-150 hover:bg-[#eef4fb] active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="mt-3 overflow-x-auto print:overflow-visible">
        <div className="flex min-w-[34rem] items-start gap-4 sm:gap-6 print:min-w-0">
          <div className="print-avoid-break w-64 shrink-0 sm:w-72">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
                <Loader2 size={15} className="animate-spin" /> Memuat peta kursi…
              </div>
            ) : !data ? (
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
                <SearchX size={22} className="text-[#c3cad2]" />
                <p className="text-xs font-bold text-[#657080]">Peta kursi belum tersedia</p>
              </div>
            ) : data.seatRows > 0 && data.seatCols > 0 ? (
              <>
                <p className="text-xs font-bold text-[#1b3555]">{data.busName}</p>
                <SeatGrid
                  bus={data}
                  highlightSeat={mySeat}
                  showAttendance={false}
                  onSelect={(s) => setSelected({ seat: s.seat, name: s.name, busName: data.busName })}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
                <Armchair size={22} className="text-[#c3cad2]" />
                <p className="text-xs font-bold text-[#657080]">Belum ada layout kursi</p>
                <p className="text-[11px] text-[#9aa3af]">Peta kursi unit ini diatur oleh admin.</p>
              </div>
            )}
          </div>

          {!loading && data && data.seats.length > 0 && (
            <div className="min-w-0 flex-1 overflow-hidden rounded-none border-2 border-[#dfe4e8]">
              {rosterRows.map((row, ri) => (
                <div
                  key={ri}
                  className={`flex items-stretch${ri > 0 ? ' border-t-2 border-[#dfe4e8]' : ''}`}
                >
                  {row.map((column, ci) => (
                    <div
                      key={ci}
                      className={`min-w-0 flex-1${ci > 0 ? ' border-l-2 border-[#dfe4e8]' : ''}`}
                    >
                      {ri === 0 && (
                        <div className="grid grid-cols-[3.75rem_minmax(0,1fr)] bg-[#00A3E0] text-xl font-extrabold uppercase tracking-wider text-white">
                          <span className="border-r-2 border-white/40 px-[3px] py-[2px] text-center">No</span>
                          <span className="px-[3px] py-[2px] text-center">Nama</span>
                        </div>
                      )}
                      <div className="divide-y-2 divide-[#edf0f3]">
                        {column.map((s) => {
                          const isMine = mySeat != null && s.seat != null && s.seat === mySeat
                          return (
                            <div
                              key={s.order}
                              className={`grid grid-cols-[3.75rem_minmax(0,1fr)] ${isMine ? 'bg-[#bfdbfe]' : ''}`}
                            >
                              <span className="border-r-2 border-[#dfe4e8] px-[3px] py-[2px] text-3xl font-bold tabular-nums text-[#1b3555]">
                                {s.seat ?? s.order}
                              </span>
                              <span className={`truncate px-[3px] py-[2px] text-3xl text-[#1b3555] ${isMine ? 'font-bold' : ''}`}>
                                {s.name}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {row.length < ROSTER_COLUMNS_PER_ROW && (
                    <div aria-hidden className="min-w-0 flex-1 border-l-2 border-[#dfe4e8]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!loading &&
        data &&
        ((data.facilities && data.facilities.length > 0) || data.unitImageUrl) && (
          <div className="mt-auto flex items-start justify-between gap-6 pt-6 pb-5 print:break-inside-avoid">
            {data.facilities && data.facilities.length > 0 && (
              <div className="mt-6 min-w-0 flex-1">
                <p className="mb-1.5 text-3xl font-extrabold uppercase tracking-wide text-[#1b4f9c]">
                  Fasilitas Unit
                </p>
                <ul className="grid grid-cols-[repeat(3,max-content)] gap-x-6 gap-y-0.5">
                  {data.facilities.map((f, i) => {
                    const Icon = FACILITY_ICONS[f.icon] ?? Armchair
                    return (
                      <li key={`${f.name}-${i}`} className="flex items-start gap-2.5">
                        <span
                          aria-hidden
                          className="mt-[0.5em] h-2 w-2 shrink-0 rounded-full bg-black"
                        />
                        <span className="min-w-0 text-2xl font-semibold leading-snug text-black">
                          {f.name}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {data.unitImageUrl && (
              <div className="mt-5 flex shrink-0 flex-col items-center pr-4 sm:pr-6">
                <div className="relative flex h-44 w-44 shrink-0 items-center justify-center sm:h-52 sm:w-52">
                  <span
                    aria-hidden
                    className="absolute -inset-8 rounded-full blur-lg sm:-inset-10"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(59,130,246,1) 0%, rgba(59,130,246,0.85) 50%, rgba(59,130,246,0) 78%)',
                    }}
                  />
                  <div
                    className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full sm:h-52 sm:w-52"
                    style={{ clipPath: 'circle(50% at 50% 50%)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.unitImageUrl}
                      alt={`Unit ${data.unitLabel?.trim() || data.busName}`}
                      className="h-full w-full object-cover"
                      style={unitImageStyle(data.unitImagePosX, data.unitImagePosY, data.unitImageZoom)}
                    />
                  </div>
                </div>
                <strong
                  className="relative z-[1] -mt-2 inline-block max-w-full truncate bg-[#f5b915] px-8 py-2 text-base font-extrabold uppercase tracking-wide text-white sm:text-lg"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, calc(100% - 14px) 50%, 100% 100%, 0 100%, 14px 50%)',
                  }}
                >
                  {data.unitLabel?.trim() || data.busName}
                </strong>
              </div>
            )}
          </div>
        )}

      {selected && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm print:hidden">
          <div className="animate-fade-up w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">Nomor kursi</p>
                <h3 className="mt-0.5 text-lg font-black text-[#1b3555]">Kursi {selected.seat}</h3>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-[#1b4f9c]">
                <Armchair size={20} />
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="rounded-xl bg-[#f8fafc] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Nama Peserta</p>
                <p className="mt-0.5 text-xl font-black text-[#1b3555]">{selected.name}</p>
              </div>
              <div className="rounded-xl bg-[#f8fafc] p-3 text-xs font-semibold text-[#657080]">
                {selected.busName}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full bg-[#1b4f9c] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#143d79] active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
