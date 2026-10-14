'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Armchair, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, SearchX } from 'lucide-react'
import { SeatGrid, type SeatCell } from '@/components/seat-grid'
import { FacilityIconBadge } from '@/components/facility-icon'
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
  const [rosterOpen, setRosterOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isMyBus = initialBusId != null && selectedId === initialBusId
  const mySeat = isMyBus ? highlightSeat : null

  const index = buses.findIndex((b) => b.id === selectedId)
  const current = index >= 0 ? buses[index] : null

  // Daftar nama dibagi dua kolom: separuh kiri, separuh kanan (mis. 50 peserta
  // -> 25 kiri, 25 kanan). Tiap kolom hanya menampilkan No dan Nama.
  const rosterSeats = data?.seats ?? []
  const rosterHalf = Math.ceil(rosterSeats.length / 2)
  const rosterColumns = [rosterSeats.slice(0, rosterHalf), rosterSeats.slice(rosterHalf)]

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
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {!loading && data && (
          <span
            className={`ml-auto text-[11px] font-bold ${
              data.filled === data.total ? 'text-[#2ca84a]' : 'text-[#1b4f9c]'
            }`}
          >
            {data.filled}/{data.total} terisi
          </span>
        )}
      </div>

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
              onSelect={(s) => setSelected({ seat: s.seat, name: s.name, busName: data.busName })}
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-[#657080]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 bg-[#2ca84a]" /> Terisi{' '}
                <span className="font-black text-[#2ca84a]">{data.filled}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 bg-[#eef1f4]" /> Kosong{' '}
                <span className="font-black text-[#657080]">{data.total - data.filled}</span>
              </span>
              {mySeat && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 bg-[#1b4f9c] ring-2 ring-[#e8c54a] ring-offset-1" />
                </span>
              )}
              <span className="ml-auto text-[11px] text-[#9aa3af] print:hidden">Ketuk kursi hijau untuk lihat nama</span>
            </div>
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
        <div className="min-w-0 flex-1 overflow-hidden rounded-none border border-[#edf0f3]">
          <button
            type="button"
            onClick={() => setRosterOpen((o) => !o)}
            aria-expanded={rosterOpen}
            aria-label={rosterOpen ? 'Tutup daftar nama' : 'Buka daftar nama'}
            className="flex w-full shrink-0 items-center justify-between gap-3 rounded-none bg-[#00A3E0] px-4 py-2 text-left transition-[filter] duration-150 hover:brightness-110 active:scale-[0.995]"
          >
            <p className="min-w-0 break-words text-sm font-bold text-white">Daftar Nama — {data.busName}</p>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] font-bold tabular-nums text-white">
                {data.filled}/{data.total} hadir
              </span>
              {rosterOpen ? (
                <ChevronUp size={14} className="text-white/90 print:hidden" />
              ) : (
                <ChevronDown size={14} className="text-white/90 print:hidden" />
              )}
            </span>
          </button>
          <div className={`roster-rows items-start divide-x divide-[#f0f3f6] ${rosterOpen ? 'flex' : 'hidden print:flex'}`}>
            {rosterColumns.map((column, ci) => (
              <div key={ci} className="min-w-0 flex-1">
                <div className="flex items-stretch divide-x divide-[#f0f3f6] bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                  <span className="flex w-9 shrink-0 items-center justify-center px-1.5 py-1.5">No</span>
                  <span className="min-w-0 flex-1 px-2.5 py-1.5">Nama</span>
                </div>
                <div className="divide-y divide-[#f0f3f6]">
                  {column.map((s) => {
                    const isMine = mySeat != null && s.seat != null && s.seat === mySeat
                    return (
                      <div
                        key={s.order}
                        className={`flex items-stretch divide-x divide-[#f0f3f6] ${isMine ? 'bg-[#bfdbfe]' : ''}`}
                      >
                        <span className="flex w-9 shrink-0 items-center justify-center px-1.5 py-1.5 text-xs font-bold tabular-nums text-[#1b3555]">
                          {s.seat ?? s.order}
                        </span>
                        <p className="flex min-w-0 flex-1 items-center px-2.5 py-1.5 text-sm text-[#1b3555]">
                          <span className={`min-w-0 break-words ${isMine ? 'font-bold' : ''}`}>{s.name}</span>
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      </div>

      {!loading &&
        data &&
        ((data.facilities && data.facilities.length > 0) || data.unitImageUrl) && (
          <div className="mt-16 flex flex-row items-center justify-between gap-3 pb-6 sm:gap-6 print:break-inside-avoid">
            {data.facilities && data.facilities.length > 0 && (
              <div className="relative -top-6 min-w-0 flex-1">
                <p className="text-xs font-bold text-[#1b3555]">Fasilitas Unit — {data.busName}</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {data.facilities.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2">
                      <span className="shrink-0 text-[#1b4f9c]">
                        <FacilityIconBadge icon={f.icon} />
                      </span>
                      <p className="min-w-0 text-[11px] font-semibold text-[#1b3555]">
                        {f.name}
                        {f.note && <span className="ml-1 font-normal text-[#657080]">— {f.note}</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.unitImageUrl && (
              <div className="ml-auto flex shrink-0 flex-col items-end pr-8">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                  <span
                    aria-hidden
                    className="absolute -inset-6 rounded-full blur-lg"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(59,130,246,1) 0%, rgba(59,130,246,0.85) 50%, rgba(59,130,246,0) 78%)',
                    }}
                  />
                  <div
                    className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
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
                  className="relative z-[1] -mt-1 inline-block max-w-full truncate bg-[#f5b915] px-6 py-1 text-sm font-extrabold uppercase tracking-wide text-white"
                  style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%)' }}
                >
                  {data.unitLabel?.trim() || data.busName}
                </strong>
              </div>
            )}
          </div>
        )}

      {/* Dirender lewat portal ke <body> supaya `fixed inset-0` tetap menempel
          ke viewport — bukan ke ancestor yang punya `transform: scale()` di
          komponen <A4Section>, yang akan membuat modal ikut mengecil. */}
      {selected && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm print:hidden">
          <div className="animate-fade-up w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">Kursi terisi</p>
                <h3 className="mt-0.5 text-lg font-black text-[#1b3555]">Kursi {selected.seat}</h3>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6f4ea] text-[#2ca84a]">
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