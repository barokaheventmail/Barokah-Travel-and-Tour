'use client'

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Car, Loader2, SearchX } from 'lucide-react'
import { ScaleToFit } from '@/components/scale-to-fit'
import { A4Section } from '@/components/a4-section'
import { PublicHeading } from '@/components/public-heading'
import { JEEP_DISPLAY, UNASSIGNED_VEHICLE } from '@/lib/participant-groups'

type Member = { name: string; busName: string }
type Group = { vehicle: string; rank: number; members: Member[] }
type Section = { rank: number; title: string; groups: Group[] }

const REFRESH_MS = 10000
// Satu kolom tabel memuat maksimal 18 baris nama; 2 kolom per lembar A4. Satu
// pengelompokan kendaraan tidak dipecah antar kolom. Tiap jenis kendaraan
// (VW / JEEP PARIS / JEEP MERAPI / JEEP BROMO) jadi bagian sendiri dan selalu
// dimulai dari lembar A4 baru supaya batas antar jenis jelas.
const ROWS_PER_COLUMN = 18
const COLUMNS_PER_PAGE = 2
const RANKS = [0, 1, 2, 3, 4]

function sectionTitle(rank: number, vwName: string): string {
  if (rank === 0) return vwName
  return JEEP_DISPLAY[rank] ?? UNASSIGNED_VEHICLE
}

function vehicleHeader(rank: number): string {
  if (rank === 0) return 'No VW'
  if (rank === 4) return 'No'
  return 'No Jeep'
}

function packColumns(groups: Group[]): Group[][] {
  const columns: Group[][] = []
  let current: Group[] = []
  let rows = 0
  for (const group of groups) {
    const groupRows = Math.max(1, group.members.length)
    if (current.length > 0 && rows + groupRows > ROWS_PER_COLUMN) {
      columns.push(current)
      current = []
      rows = 0
    }
    current.push(group)
    rows += groupRows
  }
  if (current.length > 0) columns.push(current)
  return columns
}

function VwColumn({
  groups,
  header,
  highlightVehicle,
  highlightName,
}: {
  groups: Group[]
  header: string
  highlightVehicle?: string | null
  highlightName?: string | null
}) {
  return (
    <table className="w-full table-fixed border-collapse border border-[#b9c6d2] text-[15px] sm:text-[17px] leading-tight">
      <thead>
        <tr className="bg-[#00A3E0] text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
          <th className="w-[34%] border border-[#7fc7e8] px-2 py-1.5">{header}</th>
          <th className="border border-[#7fc7e8] px-1.5 py-1.5 text-center">Nama</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group, i) => {
          const isMine = highlightVehicle != null && group.vehicle === highlightVehicle
          const groupBase = isMine ? 'bg-[#eef4fb]' : i % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
          return (
            <Fragment key={group.vehicle}>
              {group.members.map((member, j) => {
                const isMyName = isMine && highlightName != null && member.name === highlightName
                const top = j === 0 ? ' border-t-2 border-t-[#8a99a8]' : ''
                return (
                  <tr key={`${group.vehicle}-${j}`} className={groupBase}>
                    {j === 0 && (
                      <td
                        rowSpan={group.members.length}
                        className="break-words border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-1 text-center align-middle text-[12px] font-bold tabular-nums text-[#1b3555] sm:text-[14px]"
                      >
                        {group.vehicle}
                      </td>
                    )}
                    <td
                      className={`border border-[#cdd8e2] px-1.5 py-1 text-left align-middle font-normal text-[#1b3555]${top} ${isMyName ? 'bg-[#bfdbfe]' : ''}`}
                    >
                      <span className={isMyName ? 'font-bold' : ''}>{member.name}</span>
                    </td>
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

export function PublicVwMap({
  eventId,
  vwName,
  header,
  footer,
  highlightVehicle,
  highlightName,
  keterangan,
  keterangan2,
}: {
  eventId: string
  /** Judul bagian VW (mis. "VW MAGELANG"). Bagian jeep memakai nama tetap. */
  vwName: string
  header: ReactNode
  footer?: ReactNode
  highlightVehicle?: string | null
  highlightName?: string | null
  /** Keterangan orange/hijau di sebelah judul tiap lembar denah kendaraan. */
  keterangan?: string | null
  keterangan2?: string | null
}) {
  const [data, setData] = useState<Group[] | null>(null)
  const [loading, setLoading] = useState(true)

  const jumpedRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    const load = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const res = await fetch(`/api/public/vw?eventId=${encodeURIComponent(eventId)}`, {
          cache: 'no-store',
        })
        if (!res.ok || cancelled) return
        const payload = (await res.json().catch(() => null)) as { vws?: Group[] } | null
        if (!payload || cancelled) return
        setData(payload.vws ?? [])
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
    jumpedRef.current = null
  }, [highlightVehicle, highlightName])

  const groups = data ?? []

  // Pisahkan per jenis kendaraan (rank 0 = VW, 1..3 = jeep, 4 = tanpa kendaraan).
  const sections = useMemo(() => {
    const list: Section[] = []
    for (const rank of RANKS) {
      const rankGroups = groups.filter((group) => group.rank === rank)
      if (rankGroups.length === 0) continue
      list.push({
        rank,
        title: sectionTitle(rank, vwName),
        groups: rankGroups,
      })
    }
    return list
  }, [groups, vwName])

  // Tiap jenis kendaraan menempati satu atau beberapa lembar A4 (2 kolom per
  // lembar). Jenis baru selalu dimulai dari lembar baru.
  const pages = useMemo(() => {
    const list: { section: Section; cells: Group[][] }[] = []
    for (const section of sections) {
      const columns = packColumns(section.groups)
      columns.forEach((_, i) => {
        if (i % COLUMNS_PER_PAGE === 0) {
          list.push({ section, cells: columns.slice(i, i + COLUMNS_PER_PAGE) })
        }
      })
    }
    return list
  }, [sections])

  const targetPage = useMemo(() => {
    if (!highlightVehicle) return -1
    return pages.findIndex((page) =>
      page.cells.some((column) => column.some((group) => group.vehicle === highlightVehicle)),
    )
  }, [pages, highlightVehicle])

  // Peserta yang datang lewat QR: langsung scroll ke lembar A4 yang memuat
  // kendaraannya.
  useEffect(() => {
    if (targetPage < 0) return
    if (jumpedRef.current === highlightVehicle) return
    jumpedRef.current = highlightVehicle ?? null
    const frame = requestAnimationFrame(() => {
      document.getElementById(`vw-halaman-${targetPage}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [targetPage, highlightVehicle])

  const shell = (children: ReactNode) => (
    <A4Section fit="none">
      <section className="guide-fit-table flex h-full flex-col border border-[#dfe4e8] bg-white px-8 py-5 print:min-h-[272mm]">
        {header}
        <PublicHeading
          title={
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">Denah Kendaraan</h2>
          }
          keterangan={keterangan}
          keterangan2={keterangan2}
          className="mb-6 mt-12 shrink-0 justify-center"
        />
        <div className="mx-6 flex min-h-0 flex-1 flex-col">{children}</div>
        {footer}
      </section>
    </A4Section>
  )

  if (loading) {
    return shell(
      <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
        <Loader2 size={15} className="animate-spin" /> Memuat denah kendaraan…
      </div>,
    )
  }

  if (sections.length === 0) {
    return shell(
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
        <SearchX size={22} className="text-[#c3cad2]" />
        <p className="text-xs font-bold text-[#657080]">Denah kendaraan belum tersedia</p>
      </div>,
    )
  }

  return (
    <>
      {pages.map((page, pi) => (
        <A4Section key={pi} fit="none">
          <section
            id={`vw-halaman-${pi}`}
            className="guide-fit-table flex h-full flex-col border border-[#dfe4e8] bg-white px-8 py-5 print:min-h-[272mm]"
          >
            {header}
            <PublicHeading
              title={
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">
                  {page.section.title}
                </h2>
              }
              keterangan={keterangan}
              keterangan2={keterangan2}
              className="mb-4 mt-10 shrink-0 justify-center"
            />
            <div className="mx-6 flex min-h-0 flex-1 flex-col">
              <p className="mb-2 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-0.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#1b3555]">
                  <Car size={14} className="text-[#00A3E0]" /> Denah Kendaraan
                </span>
              </p>
              <ScaleToFit className="min-h-0 flex-1">
                <div className="flex items-start gap-4">
                  {Array.from({ length: COLUMNS_PER_PAGE }, (_, ci) => {
                    const column = page.cells[ci]
                    return (
                      <div key={ci} className="min-w-0 flex-1">
                        {column && (
                          <VwColumn
                            groups={column}
                            header={vehicleHeader(page.section.rank)}
                            highlightVehicle={highlightVehicle}
                            highlightName={highlightName}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScaleToFit>
            </div>
            {footer}
          </section>
        </A4Section>
      ))}
    </>
  )
}
