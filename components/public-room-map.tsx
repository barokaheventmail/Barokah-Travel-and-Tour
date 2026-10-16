'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { BedDouble, Loader2, SearchX } from 'lucide-react'
import { ScaleToFit } from '@/components/scale-to-fit'
import { A4Section } from '@/components/a4-section'
import { SectionLogos } from '@/components/section-logos'

type Member = { name: string; busName: string }
type Room = { room: string; roomType: string | null; members: Member[] }

const REFRESH_MS = 10000
// Tiap kolom dibatasi jumlah baris nama (bukan jumlah kamar) supaya tabel tetap
// proporsional. Satu halaman A4 memuat 2 kolom berdampingan; kelebihannya
// mengalir ke halaman berikutnya (semua halaman ikut tercetak, tanpa paginasi
// interaktif). Tiap halaman menampilkan kop/logo + judul seperti Denah Duduk.
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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function RoomColumn({
  rooms,
  startIndex,
  highlightRoom,
  highlightName,
}: {
  rooms: Room[]
  startIndex: number
  highlightRoom?: string | null
  highlightName?: string | null
}) {
  return (
    <table className="w-full table-fixed border-collapse border border-[#b9c6d2] text-sm sm:text-[15px]">
      <thead>
        <tr className="bg-[#00A3E0] text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
          <th className="w-[8%] border border-[#7fc7e8] px-1.5 py-1.5">No</th>
          <th className="w-[42%] border border-[#7fc7e8] px-2 py-1.5 text-center">Nama</th>
          <th className="w-[18%] border border-[#7fc7e8] px-1.5 py-1.5 text-center">No Kamar</th>
          <th className="w-[32%] border border-[#7fc7e8] px-1.5 py-1.5 text-center">Tipe Kamar</th>
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
                        className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-1 text-center align-middle font-bold tabular-nums text-[#657080]"
                      >
                        {startIndex + i + 1}
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
                        className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-1 text-center align-middle font-bold tabular-nums text-[#1b3555]"
                      >
                        {group.room}
                      </td>
                    )}
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

function CrewBadge({ name, photoUrl }: { name: string | null; photoUrl: string | null }) {
  if (!name && !photoUrl) return null
  return (
    <div className="mt-6 flex flex-col items-end pr-8 pt-4 text-center">
      {photoUrl ? (
        <div className="relative flex h-24 w-36 shrink-0 items-center justify-center">
          <span aria-hidden className="absolute -inset-3 rounded-lg bg-white/70 blur-lg" />
          <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-lg shadow-black/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt={name ?? undefined} className="h-full w-full object-cover" />
          </div>
        </div>
      ) : (
        <div className="flex h-24 w-36 shrink-0 items-center justify-center rounded-lg text-2xl font-bold text-[#f5b915] shadow-lg shadow-black/50">
          {name?.slice(0, 2).toUpperCase()}
        </div>
      )}
      <strong
        className="relative z-[1] mt-3 block w-36 bg-[#f5b915] px-3 py-1 text-center text-sm font-extrabold uppercase tracking-wide text-white"
        style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%)' }}
      >
        {name}
      </strong>
    </div>
  )
}

export function PublicRoomMap({
  eventId,
  highlightRoom,
  highlightName,
  logoLeft,
  logoLeft2,
  logoCenter,
  logoRight2,
  logoRight,
  topRight,
  topRight2,
  crewName,
  crewPhotoUrl,
}: {
  eventId: string
  highlightRoom?: string | null
  highlightName?: string | null
  logoLeft: string
  logoRight: string
  logoLeft2?: string | null
  logoCenter?: string | null
  logoRight2?: string | null
  topRight: string | null
  topRight2: string | null
  crewName: string | null
  crewPhotoUrl: string | null
}) {
  const [data, setData] = useState<Room[] | null>(null)
  const [loading, setLoading] = useState(true)

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

  const rooms = data ?? []
  const columns = useMemo(() => packColumns(rooms, ROWS_PER_COLUMN), [rooms])
  const pages = useMemo(() => chunk(columns, COLUMNS_PER_PAGE), [columns])
  const columnOffsets = useMemo(() => {
    const offsets: number[] = []
    let acc = 0
    for (const column of columns) {
      offsets.push(acc)
      acc += column.length
    }
    return offsets
  }, [columns])

  const logos = (
    <SectionLogos logoLeft={logoLeft} logoRight={logoRight} logoLeft2={logoLeft2} logoCenter={logoCenter} logoRight2={logoRight2} topRight={topRight} topRight2={topRight2} />
  )
  const title = (
    <h2 className="mb-6 mt-12 shrink-0 text-center text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">
      Denah Kamar
    </h2>
  )

  if (loading || rooms.length === 0) {
    return (
      <A4Section fit="none">
        <section className="guide-fit-table flex h-full flex-col border border-[#dfe4e8] bg-white px-8 py-5 print:min-h-[272mm]">
          {logos}
          {title}
          <div className="mx-6 flex min-h-0 flex-1 flex-col">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
                <Loader2 size={15} className="animate-spin" /> Memuat denah kamar…
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
                <SearchX size={22} className="text-[#c3cad2]" />
                <p className="text-xs font-bold text-[#657080]">Denah kamar belum tersedia</p>
              </div>
            )}
          </div>
        </section>
      </A4Section>
    )
  }

  return (
    <>
      {pages.map((pageColumns, pi) => (
        <A4Section key={pi} fit="none">
          <section className="guide-fit-table flex h-full flex-col border border-[#dfe4e8] bg-white px-8 py-5 print:min-h-[272mm]">
            {logos}
            {title}
            <div className="mx-6 flex min-h-0 flex-1 flex-col">
              <p className="mb-2 flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#1b3555]">
                <BedDouble size={14} className="text-[#00A3E0]" /> Denah Kamar — Semua Bus
              </p>
              <ScaleToFit className="min-h-0 flex-1">
                <div className="flex items-start gap-4">
                  {[0, 1].map((ci) => {
                    const column = pageColumns[ci]
                    const globalIndex = pi * COLUMNS_PER_PAGE + ci
                    return (
                      <div key={ci} className="min-w-0 flex-1">
                        {column && (
                          <RoomColumn
                            rooms={column}
                            startIndex={columnOffsets[globalIndex] ?? 0}
                            highlightRoom={highlightRoom}
                            highlightName={highlightName}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScaleToFit>
            </div>
            {pi === pages.length - 1 && <CrewBadge name={crewName} photoUrl={crewPhotoUrl} />}
          </section>
        </A4Section>
      ))}
    </>
  )
}
