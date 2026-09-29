'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Loader2, Search, Users } from 'lucide-react'

type Seat = {
  seat: string | null
  order: number
  name: string
  present: boolean
}

type BusSeats = {
  busId: string
  busName: string
  eventTitle: string
  eventStatus?: string
  total: number
  filled: number
  seats: Seat[]
}

const REFRESH_MS = 3000

type Mode = 'belum' | 'semua'

export function CrewRoster() {
  const [buses, setBuses] = useState<BusSeats[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<Mode>('belum')

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
        if (data) setBuses(data.buses ?? [])
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

  const needle = q.trim().toLowerCase()

  const visible = useMemo(() => {
    const byName = (bus: BusSeats) => (needle ? bus.seats.filter((s) => s.name.toLowerCase().includes(needle)) : bus.seats)
    return buses
      .map((bus) => ({ ...bus, seats: byName(bus).filter((s) => (mode === 'belum' ? !s.present : true)) }))
      .filter((bus) => bus.seats.length > 0)
  }, [buses, q, mode])

  const totalFilled = buses.reduce((a, b) => a + b.filled, 0)
  const totalPeople = buses.reduce((a, b) => a + b.total, 0)
  const totalBelum = totalPeople - totalFilled

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#1b4f9c]" />
          <h2 className="text-sm font-bold text-[#1b3555]">Daftar Nama</h2>
          {!loading && buses.length > 0 && (
            <span className="ml-auto rounded-full bg-[#eef3fb] px-3 py-1 text-[11px] font-bold text-[#1b4f9c]">
              {totalFilled}/{totalPeople} hadir
            </span>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2.5">
          <Search size={15} className="shrink-0 text-[#9aa3af]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama peserta…"
            className="w-full bg-transparent text-sm font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af]"
          />
        </label>

        {!loading && buses.length > 0 && (
          <div className="mt-3 grid grid-cols-2 rounded-full bg-[#f1f3f5] p-1">
            <button
              type="button"
              onClick={() => setMode('belum')}
              className={`rounded-full py-1.5 text-xs font-bold transition-colors duration-150 ${
                mode === 'belum' ? 'bg-[#1b4f9c] text-white shadow-sm' : 'text-[#657080] hover:text-[#1b3555]'
              }`}
            >
              Belum · {totalBelum}
            </button>
            <button
              type="button"
              onClick={() => setMode('semua')}
              className={`rounded-full py-1.5 text-xs font-bold transition-colors duration-150 ${
                mode === 'semua' ? 'bg-[#1b4f9c] text-white shadow-sm' : 'text-[#657080] hover:text-[#1b3555]'
              }`}
            >
              Semua · {totalPeople}
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
            <Loader2 size={15} className="animate-spin" /> Memuat daftar nama…
          </div>
        ) : buses.length === 0 ? (
          <div className="mt-4 rounded-xl bg-[#f8fafc] px-4 py-6 text-center">
            <Users className="mx-auto text-[#c3cad2]" size={26} />
            <p className="mt-2 text-xs font-bold text-[#657080]">Belum ada unit aktif</p>
            <p className="mt-0.5 text-[11px] text-[#9aa3af]">Daftar nama muncul saat kamu ditugaskan ke unit.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-xl bg-[#f8fafc] px-4 py-6 text-center">
            <BadgeCheck className="mx-auto text-[#2ca84a]" size={26} />
            <p className="mt-2 text-xs font-bold text-[#2ca84a]">
              {mode === 'belum' && !needle ? 'Semua sudah hadir' : 'Tidak ada yang cocok'}
            </p>
            <p className="mt-0.5 text-[11px] text-[#9aa3af]">
              {mode === 'belum' && !needle ? 'Pakai tab "Semua" untuk melihat seluruh peserta.' : `Tidak ditemukan peserta sesuai "${q}".`}
            </p>
          </div>
        ) : (
          visible.map((bus) => (
            <div key={bus.busId} className="mt-4 overflow-hidden rounded-2xl border border-[#edf0f3]">
              <div className="flex items-center justify-between gap-3 bg-[linear-gradient(100deg,#071e3d_0%,#0d2850_55%,#163d78_100%)] px-4 py-2.5">
                <p className="flex min-w-0 items-center gap-2 truncate text-sm font-bold text-white">
                  {bus.busName}
                  {bus.eventStatus === 'CLOSED' && (
                    <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/80">
                      Selesai
                    </span>
                  )}
                </p>
                <span className="shrink-0 rounded-full border border-[#f5b915]/30 bg-[#f5b915]/12 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-[#f7dda1]">
                  {bus.filled}/{bus.total} hadir
                </span>
              </div>
              <div className="divide-y divide-[#f0f3f6]">
                {bus.seats.map((s) => (
                  <div
                    key={s.order}
                    className="flex items-center gap-x-2.5 px-3 py-2"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
                        s.present ? 'bg-emerald-100 text-emerald-600' : 'bg-[#eef3fb] text-[#163d78]'
                      }`}
                    >
                      {s.order}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#1b3555]">{s.name}</p>
                    {s.seat && <span className="shrink-0 text-[10px] font-semibold text-[#9aa3af]">Kursi {s.seat}</span>}
                    {s.present ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        <BadgeCheck size={11} /> Hadir
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-[#f1f3f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9aa3af]">
                        Belum
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}