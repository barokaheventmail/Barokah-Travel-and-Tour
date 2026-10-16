'use client'

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Car, Loader2, SearchX } from 'lucide-react'
import { ScaleToFit } from '@/components/scale-to-fit'
import { A4Section } from '@/components/a4-section'

type Member = { name: string; busName: string }
type Group = { vehicle: string; rank: number; members: Member[] }

const REFRESH_MS = 10000
// Satu kolom tabel memuat maksimal 5 pengelompokan (kendaraan). Kalau sudah
// 10 pengelompokan (2 kolom berdampingan), sisanya berpindah ke lembar A4
// berikutnya — bukan digeser dengan tombol "Halaman 1 / N". Satu A4Section =
// satu halaman = sampai 2 kolom.
const COLUMN_SIZE = 5
const COLUMNS_PER_PAGE = 2

function VwColumn({
  groups,
  vehicleHeader,
  highlightVehicle,
  highlightName,
}: {
  groups: Group[]
  vehicleHeader: string
  highlightVehicle?: string | null
  highlightName?: string | null
}) {
  return (
    <table className="w-full table-fixed border-collapse border border-[#b9c6d2] text-[19px] leading-tight">
      <thead>
        <tr className="bg-[#00A3E0] text-[16px] font-bold uppercase tracking-wide text-white">
          <th className="w-[30%] border border-[#7fc7e8] px-2 py-1">{vehicleHeader}</th>
          <th className="border border-[#7fc7e8] px-1.5 py-1 text-center">Nama</th>
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
                        className="border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] px-1 py-0.5 text-center align-middle text-[16px] font-bold tabular-nums text-[#1b3555]"
                      >
                        {group.vehicle}
                      </td>
                    )}
                    <td
                      className={`border border-[#cdd8e2] py-0.5 pl-2 pr-1.5 text-left align-middle font-normal text-[#1b3555]${top} ${isMyName ? 'bg-[#bfdbfe]' : ''}`}
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
  title,
  header,
  footer,
  highlightVehicle,
  highlightName,
}: {
  eventId: string
  title: string
  header: ReactNode
  footer?: ReactNode
  highlightVehicle?: string | null
  highlightName?: string | null
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
  const columns: Group[][] = Array.from({ length: Math.ceil(groups.length / COLUMN_SIZE) }, (_, i) =>
    groups.slice(i * COLUMN_SIZE, i * COLUMN_SIZE + COLUMN_SIZE),
  )
  const pageCount = Math.max(1, Math.ceil(columns.length / COLUMNS_PER_PAGE))
  const pages: Group[][][] = Array.from({ length: pageCount }, (_, i) =>
    columns.slice(i * COLUMNS_PER_PAGE, i * COLUMNS_PER_PAGE + COLUMNS_PER_PAGE),
  )

  // Peserta yang datang lewat QR: langsung scroll ke lembar A4 yang memuat
  // kendaraannya (pengganti lompat halaman pada versi satu-section dulu).
  useEffect(() => {
    if (!highlightVehicle || !data) return
    if (jumpedRef.current === highlightVehicle) return
    const idx = data.findIndex((group) => group.vehicle === highlightVehicle)
    if (idx < 0) return
    jumpedRef.current = highlightVehicle
    const pageIdx = Math.floor(Math.floor(idx / COLUMN_SIZE) / COLUMNS_PER_PAGE)
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`vw-halaman-${pageIdx}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [data, highlightVehicle])

  const hasVw = groups.some((group) => group.rank === 0)
  const vehicleHeader = hasVw ? 'No VW' : 'No'

  const shell = (children: ReactNode, id?: string) => (
    <A4Section fit="none">
      <section
        id={id}
        className="guide-fit-table flex h-full flex-col border border-[#dfe4e8] bg-white p-5 print:min-h-[272mm]"
      >
        {header}
        <h2 className="mb-6 mt-12 shrink-0 text-center text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">
          {title}
        </h2>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {footer}
      </section>
    </A4Section>
  )

  if (loading) {
    return shell(
      <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
        <Loader2 size={15} className="animate-spin" /> Memuat denah VW…
      </div>,
    )
  }

  if (groups.length === 0) {
    return shell(
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
        <SearchX size={22} className="text-[#c3cad2]" />
        <p className="text-xs font-bold text-[#657080]">Denah VW belum tersedia</p>
      </div>,
    )
  }

  return (
    <>
      {pages.map((pageColumns, pageIdx) => (
        <Fragment key={pageIdx}>
          {shell(
            <>
              <p className="mb-2 flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#1b3555]">
                <Car size={14} className="text-[#00A3E0]" /> Denah Kendaraan — Semua Bus
              </p>
              <ScaleToFit className="min-h-0 flex-1">
                <div className="flex items-start gap-3 px-8">
                  {[0, 1].map((ci) => {
                    const column = pageColumns[ci]
                    return (
                      <div key={ci} className="min-w-0 flex-1">
                        {column && (
                          <VwColumn
                            groups={column}
                            vehicleHeader={vehicleHeader}
                            highlightVehicle={highlightVehicle}
                            highlightName={highlightName}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScaleToFit>
            </>,
            `vw-halaman-${pageIdx}`,
          )}
        </Fragment>
      ))}
    </>
  )
}
