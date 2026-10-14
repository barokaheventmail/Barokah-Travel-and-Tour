'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { BedDouble, ChevronLeft, ChevronRight, Loader2, SearchX } from 'lucide-react'
import { ScaleToFit } from '@/components/scale-to-fit'

type Member = { name: string; busName: string }
type Room = { room: string; roomType: string | null; members: Member[] }

const REFRESH_MS = 10000
// Tinggi tiap kolom dibatasi jumlah baris nama (bukan jumlah kamar) supaya
// tabel tidak perlu dikecilkan berlebihan saat dipasang di lembar A4. Satu
// halaman memuat 2 kolom berdampingan; sisanya mengalir ke halaman berikutnya
// (ke kanan dulu, baru ke bawah).
const ROWS_PER_COLUMN = 18
const COLUMNS_PER_PAGE = 2

/** Bagi daftar kamar jadi beberapa kolom, tiap kolom maksimal `rowsPerColumn`
 *  baris nama. Satu kamar tidak pernah dipecah antar kolom. */
function packColumns(rooms: Room[], rowsPerColumn: number): Room[][] {
  const columns: Room[][] = []
  let current: Room[] = []
  let rows = 0
  for (const room of rooms) {
    const roomRows = Math.max(1, room.members.length)
    if (current.length > 0 && rows + roomRows > rowsPerColumn) {
      columns.push(current)
      current = []
      rows = 0
    }
    current.push(room)
    rows += roomRows
  }
  if (current.length > 0) columns.push(current)
  return columns
}

function RoomColumn({
  rooms,
  highlightRoom,
  highlightName,
}: {
  rooms: Room[]
  highlightRoom?: string | null
  highlightName?: string | null
}) {
  return (
    <table className="w-full table-fixed border-collapse border border-[#b9c6d2] text-sm sm:text-[15px]">
      <thead>
        <tr className="bg-[#00A3E0] text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
          <th className="w-[15%] border border-[#7fc7e8] px-1.5 py-1.5">No</th>
          <th className="w-[55%] border border-[#7fc7e8] px-2 py-1.5 text-center">Nama</th>
          <th className="w-[30%] border border-[#7fc7e8] px-1.5 py-1.5 text-center">Tipe Kamar</th>
        </tr>
      </thead>
      <tbody>
        {rooms.map((group, i) => {
          const isMine = highlightRoom != null && group.room === highlightRoom
          const groupBase = isMine ? 'bg-[#eef4fb]' : i % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
          const members = group.members.length > 0 ? group.members : [{ name: '—', busName: '' }]
          return (
            <Fragment key={group.room}>
              {members.map((member, j) => {
                const isMyName = isMine && highlightName != null && member.name === highlightName
                const top = j === 0 ? ' border-t-2 border-t-[#8a99a8]' : ''
                return (
                  <tr key={`${group.room}-${j}`} className={groupBase}>
                    {j === 0 && (
                      <td
                        rowSpan={members.length}
                        className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-1 text-center align-middle font-bold tabular-nums text-[#1b3555]"
                      >
                        {group.room}
                      </td>
                    )}
                    <td
                      className={`border border-[#cdd8e2] px-2 py-1 text-left align-middle font-normal text-[#1b3555]${top} ${isMyName ? 'bg-[#bfdbfe]' : ''}`}
                    >
                      <span className={isMyName ? 'font-bold' : ''}>{member.name}</span>
                    </td>
                    {j === 0 && (
                      <td
                        rowSpan={members.length}
                        className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-1 text-center align-middle font-bold text-[#657080]"
                      >
                        {group.roomType ?? '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

export function PublicRoomMap({
  eventId,
  highlightRoom,
  highlightName,
}: {
  eventId: string
  highlightRoom?: string | null
  highlightName?: string | null
}) {
  const [data, setData] = useState<Room[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  const jumpedRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    const load = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const res = await fetch(`/api/public/rooms?eventId=${encodeURIComponent(eventId)}`, {
          cache: 'no-store',
        })
        if (!res.ok || cancelled) return
        const payload = (await res.json().catch(() => null)) as { rooms?: Room[] } | null
        if (!payload || cancelled) return
        setData(payload.rooms ?? [])
      } catch {
        // abaikan, refresh berikutnya
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
  }, [eventId])

  useEffect(() => {
    setPage(0)
  }, [eventId])

  // Peserta (dari QR): reset penanda saat target highlight berubah.
  useEffect(() => {
    jumpedRef.current = null
  }, [highlightRoom, highlightName])

  const rooms = data ?? []
  const columns = useMemo(() => packColumns(rooms, ROWS_PER_COLUMN), [rooms])
  const pageCount = Math.max(1, Math.ceil(columns.length / COLUMNS_PER_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const startCol = safePage * COLUMNS_PER_PAGE
  const pageColumns = columns.slice(startCol, startCol + COLUMNS_PER_PAGE)

  // Peserta (dari QR): lompat ke halaman yang memuat kamarnya.
  useEffect(() => {
    if (!highlightRoom || !data) return
    if (jumpedRef.current === highlightRoom) return
    const colIdx = columns.findIndex((col) => col.some((room) => room.room === highlightRoom))
    if (colIdx >= 0) {
      setPage(Math.floor(colIdx / COLUMNS_PER_PAGE))
      jumpedRef.current = highlightRoom
    }
  }, [data, columns, highlightRoom])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
          <Loader2 size={15} className="animate-spin" /> Memuat denah kamar…
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
          <SearchX size={22} className="text-[#c3cad2]" />
          <p className="text-xs font-bold text-[#657080]">Denah kamar belum tersedia</p>
        </div>
      ) : (
        <>
          <p className="mb-2 flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#1b3555]">
            <BedDouble size={14} className="text-[#00A3E0]" /> Denah Kamar — Semua Bus
          </p>
          <ScaleToFit className="min-h-0 flex-1">
            <div className="flex items-start gap-4">
              {[0, 1].map((ci) => {
                const column = pageColumns[ci]
                return (
                  <div key={ci} className="min-w-0 flex-1">
                    {column && (
                      <RoomColumn rooms={column} highlightRoom={highlightRoom} highlightName={highlightName} />
                    )}
                  </div>
                )
              })}
            </div>
          </ScaleToFit>

          {pageCount > 1 && (
            <div className="mt-3 flex shrink-0 items-center justify-center gap-3 print:hidden">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                aria-label="Halaman sebelumnya"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] bg-white p-0 text-[#1b4f9c] transition-colors duration-150 hover:bg-[#eef4fb] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="min-w-0 text-center text-xs font-bold text-[#1b3555]">
                Halaman {safePage + 1} / {pageCount}
              </p>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                aria-label="Halaman berikutnya"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] bg-white p-0 text-[#1b4f9c] transition-colors duration-150 hover:bg-[#eef4fb] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
