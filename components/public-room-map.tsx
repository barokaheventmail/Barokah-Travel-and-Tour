'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { BedDouble, Loader2, SearchX } from 'lucide-react'
import { ScaleToFit } from '@/components/scale-to-fit'
import { A4Section } from '@/components/a4-section'
import { SectionLogos } from '@/components/section-logos'
import { PublicHeading } from '@/components/public-heading'
import {
  buildSections,
  COLUMNS_PER_PAGE,
  packColumns,
  ROWS_PER_COLUMN,
  sectionWidths,
  UNASSIGNED_TYPE,
  type RoomMapRoom,
  type RoomSection,
} from '@/lib/room-map'

type Room = RoomMapRoom
type Section = RoomSection

const REFRESH_MS = 10000

function RoomColumn({
  rooms,
  startIndex,
  fallbackType,
  widths,
  highlightRoom,
  highlightName,
}: {
  rooms: Room[]
  startIndex: number
  fallbackType: string
  widths: { no: number; nama: number; room: number; type: number }
  highlightRoom?: string | null
  highlightName?: string | null
}) {
  return (
    <table className="w-full table-fixed border-collapse border border-[#b9c6d2] text-[20px] sm:text-[22px]">
      <thead>
        <tr className="bg-[#00A3E0] text-[15px] font-bold uppercase tracking-wide text-white sm:text-[17px]">
          <th className="border border-[#7fc7e8] px-1.5 py-1.5" style={{ width: `${widths.no}%` }}>
            No.
          </th>
          <th
            className="border border-[#7fc7e8] px-2 py-1.5 text-center"
            style={{ width: `${widths.nama}%` }}
          >
            Nama
          </th>
          <th className="border border-[#7fc7e8] px-1.5 py-1.5 text-center" style={{ width: `${widths.room}%` }}>
            No. Kamar
          </th>
          <th className="border border-[#7fc7e8] px-1.5 py-1.5 text-center" style={{ width: `${widths.type}%` }}>
            Tipe Kamar
          </th>
        </tr>
      </thead>
      <tbody>
        {rooms.map((group, i) => {
          const isMine = highlightRoom != null && group.room === highlightRoom
          const groupBase = isMine ? 'bg-[#eef4fb]' : i % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
          const members = group.members.length > 0 ? group.members : [{ name: '—', busName: '' }]
          const typeText = group.roomType?.trim() || fallbackType
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
                        className="whitespace-nowrap border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-1 text-center align-middle font-bold tabular-nums text-[#657080]"
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
                        className="whitespace-nowrap border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-1 text-center align-middle text-[11px] font-bold tabular-nums text-[#1b3555] sm:text-[13px]"
                      >
                        {group.room}
                      </td>
                    )}
                    {j === 0 && (
                      <td
                        rowSpan={members.length}
                        className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-1 text-center align-middle text-[11px] font-semibold text-[#657080] sm:text-[13px]"
                      >
                        {typeText}
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

function SectionHeading({ section }: { section: Section }) {
  return (
    <h3 className="mb-2 flex shrink-0 items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide text-[#1b3555]">
      <BedDouble size={14} className="text-[#00A3E0]" />
      {section.type}
    </h3>
  )
}

function CrewBadge({ name, photoUrl }: { name: string | null; photoUrl: string | null }) {
  if (!name && !photoUrl) return null
  return (
    <div className="mt-6 flex justify-end pr-8 pt-4">
      <div className="flex flex-col items-center text-center">
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
          className="relative z-[1] mt-3 inline-block min-w-[13rem] max-w-full break-words bg-[#f5b915] px-8 py-2 text-center text-lg font-extrabold uppercase leading-tight tracking-wide text-white"
          style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 16px) 50%, 100% 100%, 0 100%, 16px 50%)' }}
        >
          {name}
        </strong>
      </div>
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
  heading,
  keterangan,
  keterangan2,
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
  /** Judul halaman Denah Kamar. Null/kosong = judul bawaan. */
  heading?: string | null
  keterangan?: string | null
  keterangan2?: string | null
}) {
  const [data, setData] = useState<Room[] | null>(null)
  const [roomTypes, setRoomTypes] = useState<string[]>([])
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
        const payload = (await res.json().catch(() => null)) as
          | { rooms?: Room[]; roomTypes?: string[] }
          | null
        if (!payload || cancelled) return
        setData(payload.rooms ?? [])
        setRoomTypes(payload.roomTypes ?? [])
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
  // Hanya tipe kamar yang benar-benar ada di data (hasil import Excel) yang
  // ditampilkan. Tipe terdaftar tapi tanpa peserta tidak dibuatkan seksi kosong.
  const sections = useMemo(
    () => buildSections(rooms, roomTypes).filter((section) => !section.empty),
    [rooms, roomTypes],
  )

  // Setiap tipe menempati satu atau beberapa lembar A4 (2 kolom per lembar).
  // Tipe baru selalu dimulai dari lembar baru agar batas antar tipe jelas.
  const pages = useMemo(() => {
    type Cell = { rooms: Room[]; startIndex: number }
    type Page = { section: Section; widths: ReturnType<typeof sectionWidths>; cells: Cell[] }
    const list: Page[] = []
    for (const section of sections) {
      const widths = sectionWidths(section)
      const columns = packColumns(section.rooms, ROWS_PER_COLUMN)
      const cells: Cell[] = []
      let acc = 0
      for (const column of columns) {
        cells.push({ rooms: column, startIndex: acc })
        acc += column.length
      }
      cells.forEach((_, i) => {
        if (i % COLUMNS_PER_PAGE === 0) {
          list.push({
            section,
            widths,
            cells: cells.slice(i, i + COLUMNS_PER_PAGE),
          })
        }
      })
    }
    return list
  }, [sections])

  const logos = (
    <SectionLogos logoLeft={logoLeft} logoRight={logoRight} logoLeft2={logoLeft2} logoCenter={logoCenter} logoRight2={logoRight2} topRight={topRight} topRight2={topRight2} />
  )
  const title = (
    <PublicHeading
      title={
        <h2 className="text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">
          {(heading ?? '').trim() || 'Denah Kamar'}
        </h2>
      }
      keterangan={keterangan}
      keterangan2={keterangan2}
      className="mb-6 mt-12 shrink-0 justify-center"
    />
  )

  if (loading || rooms.length === 0) {
    return (
      <A4Section fit="none">
        <section className="guide-fit-table flex h-full flex-col border border-[#dfe4e8] bg-white px-8 py-5 print:min-h-[272mm]">
          {logos}
          {title}
          <div className="flex min-h-0 flex-1 flex-col">
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
      {pages.map((page, pi) => (
        <A4Section key={pi} fit="none">
          <section className="guide-fit-table flex h-full flex-col border border-[#dfe4e8] bg-white px-8 py-5 print:min-h-[272mm]">
            {logos}
            {title}
            <div className="flex min-h-0 flex-1 flex-col">
              <SectionHeading section={page.section} />
              <ScaleToFit className="min-h-0 flex-1">
                <div className="flex items-start gap-4">
                  {Array.from({ length: COLUMNS_PER_PAGE }, (_, ci) => {
                    const cell = page.cells[ci]
                    return (
                      <div key={ci} className="min-w-0 flex-1">
                        {cell && (
                          <RoomColumn
                            rooms={cell.rooms}
                            startIndex={cell.startIndex}
                            fallbackType={page.section.type === UNASSIGNED_TYPE ? '—' : page.section.type}
                            widths={page.widths}
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
            <CrewBadge name={crewName} photoUrl={crewPhotoUrl} />
          </section>
        </A4Section>
      ))}
    </>
  )
}
