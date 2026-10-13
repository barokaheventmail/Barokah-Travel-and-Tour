'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { BedDouble, ChevronLeft, ChevronRight, Loader2, SearchX } from 'lucide-react'

type Member = { name: string; busName: string }
type Room = { room: string; roomType: string | null; members: Member[] }

const REFRESH_MS = 10000
const PAGE_SIZE = 25

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

  const ownRowRef = useRef<HTMLTableRowElement | null>(null)
  const jumpedRef = useRef<string | null>(null)
  const scrolledRef = useRef(false)

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
    scrolledRef.current = false
  }, [highlightRoom, highlightName])

  // Peserta (dari QR): lompat ke halaman yang memuat kamarnya.
  useEffect(() => {
    if (!highlightRoom || !data) return
    if (jumpedRef.current === highlightRoom) return
    const idx = data.findIndex((room) => room.room === highlightRoom)
    if (idx >= 0) {
      setPage(Math.floor(idx / PAGE_SIZE))
      jumpedRef.current = highlightRoom
    }
  }, [data, highlightRoom])

  // Peserta (dari QR): gulir ke baris namanya sekali setelah tampil.
  useEffect(() => {
    if (scrolledRef.current) return
    if (!highlightRoom || !ownRowRef.current) return
    ownRowRef.current.scrollIntoView({ block: 'center' })
    scrolledRef.current = true
  }, [page, data, highlightRoom, highlightName])

  const rooms = data ?? []
  const pageCount = Math.max(1, Math.ceil(rooms.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const pageRooms = rooms.slice(start, start + PAGE_SIZE)

  return (
    <div className="mt-4">
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
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#1b3555]">
            <BedDouble size={14} className="text-[#00A3E0]" /> Denah Kamar — Semua Bus
          </p>
          <table className="w-full table-fixed border-collapse border border-[#b9c6d2] text-[13px]">
            <thead>
              <tr className="bg-[#00A3E0] text-[10px] font-bold uppercase tracking-wide text-white">
                <th className="w-10 border border-[#7fc7e8] px-2 py-2">No</th>
                <th className="border border-[#7fc7e8] px-3 py-2 text-center">Nama</th>
                <th className="w-16 border border-[#7fc7e8] px-2 py-2">Bus</th>
                <th className="w-20 border border-[#7fc7e8] px-2 py-2">No Kamar</th>
                <th className="w-24 border border-[#7fc7e8] px-2 py-2">Tipe Kamar</th>
              </tr>
            </thead>
            <tbody>
              {pageRooms.map((group, i) => {
                const isMine = highlightRoom != null && group.room === highlightRoom
                const groupNo = start + i + 1
                const groupBase = isMine ? 'bg-[#eef4fb]' : i % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
                return (
                  <Fragment key={group.room}>
                    {group.members.map((member, j) => {
                      const isMyName = isMine && highlightName != null && member.name === highlightName
                      const top = j === 0 ? ' border-t-2 border-t-[#8a99a8]' : ''
                      return (
                        <tr
                          key={`${group.room}-${j}`}
                          ref={isMyName ? ownRowRef : undefined}
                          className={groupBase}
                        >
                          {j === 0 && (
                            <td
                              rowSpan={group.members.length}
                              className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-2 py-2 text-center align-middle text-[11px] font-bold tabular-nums text-[#1b3555]"
                            >
                              {groupNo}
                            </td>
                          )}
                          <td
                            className={`border border-[#cdd8e2] px-3 py-2 text-left align-middle font-normal text-[#1b3555]${top} ${isMyName ? 'bg-[#bfdbfe]' : ''}`}
                          >
                            <span className={isMyName ? 'font-bold' : ''}>{member.name}</span>
                          </td>
                          <td
                            className={`border border-[#cdd8e2] px-2 py-2 text-center align-middle text-[11px] font-bold text-[#1b3555]${top}`}
                          >
                            {member.busName}
                          </td>
                          {j === 0 && (
                            <>
                              <td
                                rowSpan={group.members.length}
                                className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-2 py-2 text-center align-middle text-[11px] font-bold tabular-nums text-[#1b3555]"
                              >
                                {group.room}
                              </td>
                              <td
                                rowSpan={group.members.length}
                                className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-2 py-2 text-center align-middle text-[11px] font-bold text-[#657080]"
                              >
                                {group.roomType ?? '—'}
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>

          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3 print:hidden">
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
