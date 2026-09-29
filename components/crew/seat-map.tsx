'use client'

import { useEffect, useState } from 'react'
import { Armchair, Bus, Loader2, MapPinOff } from 'lucide-react'
import { SeatGrid, type SeatCell } from '@/components/seat-grid'
import { unmappedSeats } from '@/lib/crew-seats'

type BusSeats = {
  busId: string
  busName: string
  eventTitle: string
  eventStatus?: string
  seatRows: number
  seatCols: number
  seatLayout: string | null
  total: number
  filled: number
  seats: SeatCell[]
}

type Selected = { seat: string; name: string; busName: string; eventTitle: string }

const REFRESH_MS = 3000

export function CrewSeatMap() {
  const [buses, setBuses] = useState<BusSeats[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selected | null>(null)

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    const load = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const res = await fetch('/api/crew/seats', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const data = (await res.json().catch(() => null)) as { buses?: BusSeats[] } | null
        if (data) {
          setBuses(data.buses ?? [])
          setSelected((prev) => {
            if (!prev) return prev
            const bus = data.buses?.find((b) => b.busName === prev.busName)
            if (!bus || !bus.seats.some((s) => s.seat === prev.seat)) return null
            return prev
          })
        }
      } catch {
        // abaikan, poll berikutnya
      } finally {
        inFlight = false
        setLoading(false)
      }
    }

    const onScanDone = () => {
      load()
      window.setTimeout(load, 400)
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    window.addEventListener('crew:scan-done', onScanDone)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('crew:scan-done', onScanDone)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <Armchair size={18} className="text-[#1b4f9c]" />
          <h2 className="text-sm font-bold text-[#1b3555]">Peta Kursi Terisi</h2>
          {!loading && buses.length > 0 && (
            <span className="ml-auto rounded-full bg-[#eef3fb] px-3 py-1 text-[11px] font-bold text-[#1b4f9c]">
              {buses.reduce((a, b) => a + b.filled, 0)}/{buses.reduce((a, b) => a + b.total, 0)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
            <Loader2 size={15} className="animate-spin" /> Memuat peta kursi…
          </div>
        ) : buses.length === 0 ? (
          <div className="mt-4 rounded-xl bg-[#f8fafc] px-4 py-6 text-center">
            <Bus className="mx-auto text-[#c3cad2]" size={26} />
            <p className="mt-2 text-xs font-bold text-[#657080]">Belum ada unit aktif</p>
            <p className="mt-0.5 text-[11px] text-[#9aa3af]">
              Peta kursi muncul saat kamu ditugaskan ke unit pada event yang sedang berjalan.
            </p>
          </div>
        ) : (
          buses.map((bus) => (
            <div key={bus.busId} className="mt-4 rounded-2xl border border-[#edf0f3] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-black text-[#1b3555]">
                    {bus.busName}
                    {bus.eventStatus === 'CLOSED' && (
                      <span className="rounded-full bg-[#f1f3f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#657080]">
                        Selesai
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-[#9aa3af]">{bus.eventTitle}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                    bus.filled === bus.total ? 'bg-[#e6f4ea] text-[#2ca84a]' : 'bg-[#eef3fb] text-[#1b4f9c]'
                  }`}
                >
                  {bus.filled}/{bus.total} terisi
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {(() => {
                  const punyaLayout = bus.seatRows > 0 && bus.seatCols > 0
                  // Peserta yang nomornya tidak ada di layout (atau unitnya
                  // belum punya layout) tidak bisa digambar di peta, jadi
                  // ditampilkan terpisah supaya Peta Kursi dan Daftar Nama
                  // tidak terlihat berbeda.
                  const diLuarPeta = unmappedSeats(bus)
                  return (
                    <>
                      {punyaLayout ? (
                        <>
                          <SeatGrid
                            bus={bus}
                            onSelect={(s) =>
                              setSelected({ seat: s.seat, name: s.name, busName: bus.busName, eventTitle: bus.eventTitle })
                            }
                          />
                          <div className="flex items-center gap-4 text-[11px] font-semibold text-[#657080]">
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-3 w-3 rounded bg-[#2ca84a]" /> Terisi{' '}
                              <span className="font-black text-[#2ca84a]">{bus.filled}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-3 w-3 rounded bg-[#eef1f4]" /> Kosong{' '}
                              <span className="font-black text-[#657080]">{bus.total - bus.filled}</span>
                            </span>
                            <span className="ml-auto text-[11px] text-[#9aa3af]">Ketuk kursi hijau untuk lihat nama</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
                          <Armchair size={22} className="text-[#c3cad2]" />
                          <p className="text-xs font-bold text-[#657080]">Belum ada layout kursi</p>
                          <p className="text-[11px] text-[#9aa3af]">Peta kursi unit ini diatur oleh admin.</p>
                        </div>
                      )}

                      {diLuarPeta.length > 0 && (
                        <div className="rounded-xl border border-dashed border-[#dfe4e8] bg-[#f8fafc] px-3 py-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#657080]">
                            <MapPinOff size={13} className="text-[#9aa3af]" /> Di luar peta · {diLuarPeta.length} peserta
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#9aa3af]">
                            {punyaLayout
                              ? 'Nomor kursinya tidak ada di layout unit ini, jadi tidak muncul di peta.'
                              : 'Peta kursi unit ini belum diatur, jadi peserta belum bisa digambar.'}
                          </p>
                          <ul className="mt-2 space-y-1">
                            {diLuarPeta.map((s) => (
                              <li key={`${s.order}-${s.name}`} className="truncate text-[11px] font-semibold text-[#657080]">
                                {s.name} · {s.seat ? `Kursi ${s.seat}` : 'tanpa nomor kursi'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
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
                {selected.busName} · {selected.eventTitle}
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
        </div>
      )}
    </div>
  )
}