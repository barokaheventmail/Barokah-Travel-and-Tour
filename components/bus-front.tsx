'use client'

import { UsersRound } from 'lucide-react'
import type { FrontLayout, FrontSlot } from '@/lib/front'

const STRIP_GAP = 'gap-[2px] sm:gap-[3px]'

/**
 * Ilustrasi depan bus: dashboard sopir + strip tempat Driver & Crew + dinding
 * pembatas ke kabin penumpang. Semua bagian diberi garis pinggir (kotak)
 * supaya batas tiap area jelas.
 *
 * Di editor admin (`interactive`) marker Driver/Crew bisa dipindah lewat klik
 * maupun drag & drop; di peta peserta/crew tampilannya hanya baca.
 */
export function BusFront({
  cols,
  front,
  interactive = false,
  bordered = true,
  placing = null,
  onPlace,
  onMove,
}: {
  cols: number
  front?: FrontLayout | null
  interactive?: boolean
  bordered?: boolean
  placing?: FrontSlot | null
  onPlace?: (col: number) => void
  onMove?: (slot: FrontSlot, col: number) => void
}) {
  if (cols <= 0) return null
  const driver = front?.driver ?? null
  const crew = front?.crew ?? null
  const slotAt = (col: number): FrontSlot | null =>
    col === driver ? 'driver' : col === crew ? 'crew' : null

  return (
    <div className="w-full select-none">
      {/* Dashboard */}
      <div
        className={`${bordered ? 'border-2 border-b-0 border-[#0d2850]' : 'border border-[#0d2850]'} rounded-none p-1.5`}
      >
        <span className="flex items-center justify-center py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1b3555]">
          Dashboard
        </span>
      </div>

      {/* Strip Driver & Crew */}
      {(interactive || driver !== null || crew !== null) && (
        <div
          className={`mt-1.5 grid ${STRIP_GAP} ${
            interactive
              ? `${bordered ? 'border-x-2 border-[#0d2850]' : ''} bg-[#eef2f6] p-1.5`
              : ''
          }`}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, col) => {
            const slot = slotAt(col)
            const isDriver = slot === 'driver'
            const isCrew = slot === 'crew'
            const filled = slot !== null
            const canPlace = interactive
            // Tampilan peserta/crew: kotak kosong tidak digambar, tapi kolomnya
            // tetap disisakan agar marker tetap sejajar dengan grid kursi.
            if (!interactive && !filled) return <div key={col} aria-hidden className="h-10 sm:h-11" />
            return (
              <button
                key={col}
                type="button"
                draggable={interactive && filled}
                onDragStart={(e) => {
                  if (slot) e.dataTransfer.setData('text/front-slot', slot)
                }}
                onDragOver={(e) => {
                  if (interactive) e.preventDefault()
                }}
                onDrop={(e) => {
                  if (!interactive || !onMove) return
                  e.preventDefault()
                  const raw = e.dataTransfer.getData('text/front-slot')
                  if (raw === 'driver' || raw === 'crew') onMove(raw, col)
                }}
                onClick={() => {
                  if (canPlace) onPlace?.(col)
                }}
                aria-label={
                  isDriver
                    ? 'Posisi Driver'
                    : isCrew
                      ? 'Posisi Crew'
                      : canPlace
                        ? `Kosong, klik untuk menempatkan ${placing ?? 'Driver/Crew'}`
                        : 'Kosong'
                }
                className={`flex h-10 min-w-0 items-center justify-center overflow-hidden border-2 px-1 text-[10px] font-bold uppercase leading-none transition-colors sm:h-11 ${
                  filled
                    ? 'border-[#1b3555] bg-white text-[#1b3555]'
                    : 'border-dashed border-[#c3cad2] bg-white text-[#c3cad2]'
                } ${canPlace ? 'cursor-pointer hover:brightness-105 active:scale-95' : 'cursor-default'}`}
                title={
                  !canPlace
                    ? isDriver
                      ? 'Driver'
                      : isCrew
                        ? 'Crew'
                        : undefined
                    : isDriver
                      ? 'Driver — klik untuk melepas, atau geser ke kolom lain'
                      : isCrew
                        ? 'Crew — klik untuk melepas, atau geser ke kolom lain'
                        : `Klik untuk menempatkan ${placing === 'crew' ? 'Crew' : 'Driver'} di sini`
                }
              >
                {isDriver && <span className="leading-none">Driver</span>}
                {isCrew && (
                  <span className="flex items-center gap-1">
                    <UsersRound size={12} /> <span className="hidden sm:inline">Crew</span>
                  </span>
                )}
                {!filled && <span className="text-sm leading-none">·</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Ruang kosong antara Driver/Crew dan kursi penumpang */}
      <div className="h-3 sm:h-4" aria-hidden />
    </div>
  )
}
