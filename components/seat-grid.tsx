'use client'

import { parseSeatLayout, seatNumberMatrix } from '@/lib/seat'

export type SeatCell = {
  seat: string | null
  order: number
  name: string
  present: boolean
}

export type SeatGridBus = {
  seatRows: number
  seatCols: number
  seatLayout: string | null
  seats: SeatCell[]
}

export function SeatGrid({
  bus,
  highlightSeat,
  onSelect,
}: {
  bus: SeatGridBus
  highlightSeat?: string | null
  onSelect?: (s: { seat: string; name: string }) => void
}) {
  const layout = parseSeatLayout({ seatRows: bus.seatRows, seatCols: bus.seatCols, seatLayout: bus.seatLayout })
  if (layout.rows === 0 || layout.cols === 0) return null
  const numbers = seatNumberMatrix(layout.rows, layout.cols, layout.cells)
  const byNumber = new Map<number, SeatCell>()
  for (const s of bus.seats) {
    const n = Number.parseInt(s.seat ?? '', 10)
    if (!Number.isNaN(n)) byNumber.set(n, s)
  }
  const mine = (n: number) => highlightSeat != null && String(n) === String(highlightSeat)

  return (
    <div className="flex justify-center">
      <div
        className="grid w-full gap-[2px] sm:gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
      >
        {numbers.map((row, r) =>
          row.map((n, c) => {
            if (n === null) {
              return (
                <div
                  key={`${r}-${c}`}
                  className="flex aspect-square items-center justify-center rounded-sm bg-[#f6f8fa] text-[10px] font-bold text-[#c3cad2]"
                >
                </div>
              )
            }
            const s = byNumber.get(n)
            const isMine = mine(n)
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!s?.present && !isMine}
                onClick={() => s?.present && onSelect?.({ seat: String(n), name: s.name })}
                title={s?.present ? s.name : isMine ? 'Kursi Anda' : undefined}
                aria-label={isMine ? `Kursi ${n} — kursi Anda` : `Kursi ${n}`}
                className={`flex aspect-square w-full min-w-0 items-center justify-center overflow-hidden rounded-sm text-sm font-bold tabular-nums leading-none transition-colors duration-150 ${
                  isMine
                    ? 'bg-[#1b4f9c] text-white ring-1 ring-[#e8c54a] ring-offset-1'
                    : s?.present
                      ? 'bg-[#2ca84a] text-white hover:bg-[#219b42] active:scale-95'
                      : 'bg-[#eef1f4] text-[#9aa3af]'
                }`}
              >
                {n}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}