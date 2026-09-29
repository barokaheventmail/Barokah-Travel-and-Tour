'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, Sheet } from 'lucide-react'

export type ExportBusOption = {
  id: string
  name: string
  count?: number
}

type Props = {
  eventId: string
  buses: ExportBusOption[]
}

/** Lebar panel (w-80) + jarak aman dari tepi viewport. */
const PANEL_WIDTH = 320

/**
 * Popover export. Sengaja pakai pola invisibilitas + opacity (tanpa transform/
 * filter) seperti components/admin/action-menu.tsx supaya tidak jadi ancestor
 * yang mengukur overlay fixed, dan tidak memakai createPortal karena panelnya
 * kecil dan tidak perlu.
 */
export function ExportMenu({ eventId, buses }: Props) {
  const [open, setOpen] = useState(false)
  const [bus, setBus] = useState('all')
  const [status, setStatus] = useState('all')
  // Geser panel ke kiri kalau tidak muat di sisi kanan viewport (layar sempit).
  const [shift, setShift] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const overflow = rect.right + PANEL_WIDTH + 16 - window.innerWidth
    setShift(overflow > 0 ? overflow : 0)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (bus !== 'all') p.set('bus', bus)
    if (status !== 'all') p.set('status', status)
    return p.toString()
  }, [bus, status])

  const base = `/api/admin/events/${eventId}/export`
  const xlsxHref = query ? `${base}?${query}` : base
  const csvHref = `${base}?format=csv${query ? `&${query}` : ''}`

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-4 py-2.5 text-sm font-bold text-[#1b3555] transition-colors duration-200 hover:bg-[#f1f3f5] active:scale-95"
      >
        <Download size={15} /> Export
        <span
          className={`flex h-4 w-4 items-center justify-center transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <ChevronDown size={13} />
        </span>
      </button>

      <div
        role="dialog"
        aria-label="Pilihan export peserta"
        aria-hidden={!open}
        style={{ marginRight: -shift }}
        className={`absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[#ece3cd] bg-white p-3 transition-[opacity,visibility,box-shadow] duration-200 ease-out ${
          open
            ? 'visible opacity-100 shadow-[0_28px_70px_-22px_rgba(9,32,74,0.6)]'
            : 'pointer-events-none invisible opacity-0 shadow-[0_12px_28px_-20px_rgba(9,32,74,0.4)]'
        }`}
      >
        <p className="text-[13px] font-bold text-[#1b3555]">Export Peserta</p>
        <p className="mt-0.5 text-[11px] font-semibold text-[#8a93a3]">
          Hasilnya 1 sheet per unit + sheet Rekap, sudah dikelompokkan dan rapi.
        </p>

        <label className="mt-3 block text-[11px] font-bold text-[#1b3555]">
          Unit
          <select
            value={bus}
            onChange={(e) => setBus(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#dfe4e8] bg-white px-2.5 py-2 text-xs font-semibold text-[#1b3555] outline-none focus:border-[#1b4f9c]"
          >
            <option value="all">Semua unit</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {typeof b.count === 'number' ? ` · ${b.count} peserta` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-2 block text-[11px] font-bold text-[#1b3555]">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#dfe4e8] bg-white px-2.5 py-2 text-xs font-semibold text-[#1b3555] outline-none focus:border-[#1b4f9c]"
          >
            <option value="all">Semua peserta</option>
            <option value="hadir">Sudah hadir (sudah scan)</option>
            <option value="belum">Belum hadir</option>
          </select>
        </label>

        <a
          href={xlsxHref}
          download
          onClick={() => setOpen(false)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2ca84a] px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#219b42] active:scale-95"
        >
          <FileSpreadsheet size={14} /> Unduh Excel (.xlsx)
        </a>
        <a
          href={csvHref}
          download
          onClick={() => setOpen(false)}
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-[#dfe4e8] px-4 py-2 text-[11px] font-bold text-[#657080] transition-colors duration-200 hover:bg-[#f1f3f5]"
        >
          <Sheet size={13} /> Unduh CSV (satu file)
        </a>
      </div>
    </div>
  )
}
