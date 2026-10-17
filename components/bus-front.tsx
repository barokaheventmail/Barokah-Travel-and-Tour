'use client'

import { Crown, UsersRound } from 'lucide-react'
import { FRONT_SLOTS, type FrontLayout, type FrontSlot } from '@/lib/front'

const STRIP_GAP = 'gap-[2px] sm:gap-[3px]'

/**
 * Label singkat tiap slot di strip depan. Dipakai untuk aria/title dan chip
 * penanda supaya penamaan konsisten dengan editor admin.
 */
const SLOT_LABELS: Record<FrontSlot, string> = {
  driver: 'Driver',
  crew: 'Crew',
  tl: 'TL',
}

/**
 * Ilustrasi depan bus: dashboard sopir + strip tempat Driver, Crew & TL +
 * dinding pembatas ke kabin penumpang. Semua bagian diberi garis pinggir
 * (kotak) supaya batas tiap area jelas.
 *
 * Di editor admin (`interactive`) marker bisa dipindah lewat klik maupun drag &
 * drop; di peta peserta/crew tampilannya hanya baca.
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
  const slotAt = (col: number): FrontSlot | null =>
    FRONT_SLOTS.find((slot) => front?.[slot] === col) ?? null
  const hasAny = FRONT_SLOTS.some((slot) => (front?.[slot] ?? null) !== null)

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

      {/* Strip Driver, Crew & TL */}
      {(interactive || hasAny) && (
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
                  if (FRONT_SLOTS.includes(raw as FrontSlot)) onMove(raw as FrontSlot, col)
                }}
                onClick={() => {
                  if (canPlace) onPlace?.(col)
                }}
                aria-label={
                  slot
                    ? `Posisi ${SLOT_LABELS[slot]}`
                    : canPlace
                      ? `Kosong, klik untuk menempatkan ${placing ? SLOT_LABELS[placing] : 'Driver/Crew/TL'}`
                      : 'Kosong'
                }
                className={`flex h-10 min-w-0 items-center justify-center overflow-hidden border-2 px-1 text-[10px] font-bold uppercase leading-none transition-colors sm:h-11 ${
                  filled
                    ? 'border-[#1b3555] bg-white text-[#1b3555]'
                    : 'border-dashed border-[#c3cad2] bg-white text-[#c3cad2]'
                } ${canPlace ? 'cursor-pointer hover:brightness-105 active:scale-95' : 'cursor-default'}`}
                title={
                  !canPlace
                    ? slot
                      ? SLOT_LABELS[slot]
                      : undefined
                    : slot
                      ? `${SLOT_LABELS[slot]} — klik untuk melepas, atau geser ke kolom lain`
                      : `Klik untuk menempatkan ${
                          placing ? SLOT_LABELS[placing] : 'Driver/Crew/TL'
                        } di sini`
                }
              >
                {slot === 'driver' && <span className="leading-none">Driver</span>}
                {slot === 'crew' && (
                  <span className="flex items-center gap-1">
                    <UsersRound size={12} /> <span className="hidden sm:inline">Crew</span>
                  </span>
                )}
                {slot === 'tl' && (
                  <span className="flex items-center gap-1">
                    <Crown size={12} /> <span className="hidden sm:inline">TL</span>
                  </span>
                )}
                {!filled && <span className="text-sm leading-none">·</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Ruang kosong antara strip depan dan kursi penumpang */}
      <div className="h-3 sm:h-4" aria-hidden />
    </div>
  )
}
