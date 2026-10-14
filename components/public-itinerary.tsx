'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { A4Section } from '@/components/a4-section'
import type { ItineraryDay } from '@/lib/itinerary'

/**
 * Itinerary Perjalanan multi-halaman.
 *
 * Tiap hari diukur tingginya (pada lebar kolom yang sama dengan lembar A4),
 * lalu hari-hari "dirapatkan" dan dijejalkan ke satu halaman A4 semaksimal
 * mungkin. Begitu melewati ambang batas satu halaman, hari berikutnya otomatis
 * pindah ke halaman A4 baru — jadi tidak ada baris yang terpotong dan teks
 * tidak perlu dikecilkan berlebihan.
 */
const A4_MM_PX = 96 / 25.4 // 1mm ≈ 3.7795px
const SIDE_PAD_PX = 32 // px-8
const TOP_PAD_PX = 20 // py-5
const FOOTER_RESERVE_MM = 18.5 // pita "Info area" di kaki halaman
const DAY_GAP_PX = 16 // space-y-4
const SAFETY_PX = 6

function DayBlock({ group, multiDay }: { group: ItineraryDay; multiDay: boolean }) {
  return (
    <div className="mx-6">
      {(multiDay || group.sideNote) && (
        <div className="mb-1 flex items-start gap-3">
          <span className="shrink-0 text-sm font-bold uppercase text-[#00A3E0]">Day {group.day}</span>
          {group.sideNote && (
            <span className="whitespace-pre-wrap text-sm font-bold text-[#00A3E0]">{group.sideNote}</span>
          )}
        </div>
      )}
      {group.note && (
        <p className="mb-1.5 whitespace-pre-wrap text-base font-bold leading-relaxed text-[#00A3E0]">{group.note}</p>
      )}
      {group.rows.length > 0 && (
        <div className="overflow-hidden rounded-none border-2 border-[#dfe4e8]">
          <div className="grid grid-cols-[7.5rem_minmax(0,1.5fr)_minmax(0,1fr)] bg-[#00A3E0] text-xs font-extrabold uppercase leading-tight tracking-wider text-white">
            <span className="border-r-2 border-white/40 p-[2px] text-center">Waktu</span>
            <span className="border-r-2 border-white/40 p-[2px] text-center">Agenda</span>
            <span className="p-[2px] text-center">Keterangan</span>
          </div>
          <div className="divide-y-2 divide-[#edf0f3]">
            {group.rows.map((item, i) => (
              <div
                key={`${group.day}-${item.time}-${i}`}
                className="grid grid-cols-[7.5rem_minmax(0,1.5fr)_minmax(0,1fr)] leading-tight transition-colors hover:bg-[#f8fafc]"
              >
                <span className="whitespace-nowrap border-r-2 border-[#dfe4e8] p-[2px] text-sm font-medium tabular-nums text-[#1b4f9c]">
                  {item.time}
                </span>
                <span
                  className={`break-words border-r-2 border-[#dfe4e8] p-[2px] text-[#1b3555] ${
                    item.bold ? 'text-[0.95rem] font-bold' : 'text-sm font-normal'
                  } ${item.italic ? 'italic' : ''}`}
                >
                  {item.agenda}
                </span>
                <span className="break-words p-[2px] text-sm text-[#657080]">{item.keterangan}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ItineraryPage({
  header,
  days,
  multiDay,
  footerNote,
}: {
  header: ReactNode
  days: ItineraryDay[]
  multiDay: boolean
  footerNote: string
}) {
  return (
    <A4Section>
      <section className="itinerary-bg print-avoid-break relative rounded-none border border-[#dfe4e8] bg-white px-8 py-5 print:break-after-page print:min-h-[272mm] print:border-0 print:p-0">
        {header}
        <div data-a4-body className="flow-root">
          <div className="mt-4 space-y-4">
            {days.map((group) => (
              <DayBlock key={group.day} group={group} multiDay={multiDay} />
            ))}
          </div>
          {footerNote.trim() && (
            <p className="mt-4 whitespace-pre-wrap text-sm font-bold italic text-black">{footerNote}</p>
          )}
        </div>
      </section>
    </A4Section>
  )
}

export function PublicItinerary({
  dayGroups,
  footerNote,
  header,
}: {
  dayGroups: ItineraryDay[]
  footerNote: string
  header: ReactNode
}) {
  const multiDay = dayGroups.length > 1
  const [pages, setPages] = useState<ItineraryDay[][] | null>(null)

  const measureRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const daysRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLParagraphElement>(null)
  const dayRefs = useRef<(HTMLDivElement | null)[]>([])

  const hasFooter = footerNote.trim().length > 0

  useEffect(() => {
    const measure = () => {
      const body = bodyRef.current
      const daysBox = daysRef.current
      if (!body || !daysBox) return

      const probe = document.createElement('div')
      probe.style.cssText = 'position:absolute;visibility:hidden;height:297mm;width:210mm;pointer-events:none'
      document.body.appendChild(probe)
      const pageH = probe.offsetHeight || 297 * A4_MM_PX
      probe.remove()

      const heights = dayGroups.map((_, i) => dayRefs.current[i]?.offsetHeight ?? 0)
      if (heights.length === 0 || heights.some((h) => h <= 0)) return

      const capacity =
        pageH -
        TOP_PAD_PX -
        20 -
        FOOTER_RESERVE_MM * A4_MM_PX -
        daysBox.offsetTop -
        (hasFooter && footerRef.current ? footerRef.current.offsetHeight + DAY_GAP_PX : 0) -
        SAFETY_PX

      const packed: ItineraryDay[][] = []
      let current: ItineraryDay[] = []
      let used = 0
      for (let i = 0; i < dayGroups.length; i++) {
        const add = current.length === 0 ? heights[i] : DAY_GAP_PX + heights[i]
        if (current.length > 0 && used + add > capacity) {
          packed.push(current)
          current = []
          used = heights[i]
        } else {
          used += add
        }
        current.push(dayGroups[i])
      }
      if (current.length > 0) packed.push(current)
      setPages(packed)
    }

    measure()
    const ro = new ResizeObserver(() => measure())
    if (measureRef.current) ro.observe(measureRef.current)
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure).catch(() => {})

    const imgs = measureRef.current?.querySelectorAll('img') ?? []
    imgs.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', measure, { once: true })
        img.addEventListener('error', measure, { once: true })
      }
    })

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [dayGroups, hasFooter])

  const singlePageFallback = useMemo(
    () => (pages ? null : <ItineraryPage header={header} days={dayGroups} multiDay={multiDay} footerNote={footerNote} />),
    [pages, header, dayGroups, multiDay, footerNote],
  )

  return (
    <>
      {/* Wadah ukur (di luar layar): meniru lebar & gaya isi lembar A4 supaya
          tinggi tiap hari terukur persis. Disembunyikan saat cetak. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -left-[10000px] top-0 w-[210mm] border border-transparent bg-white px-8 py-5 print:hidden"
      >
        <div ref={bodyRef} className="relative flow-root">
          {header}
          <div ref={daysRef} className="mt-4 space-y-4">
            {dayGroups.map((group, i) => (
              <div
                key={group.day}
                ref={(el) => {
                  dayRefs.current[i] = el
                }}
              >
                <DayBlock group={group} multiDay={multiDay} />
              </div>
            ))}
          </div>
        </div>
        {hasFooter && (
          <p ref={footerRef} className="mt-4 whitespace-pre-wrap text-sm font-bold italic text-black">
            {footerNote}
          </p>
        )}
      </div>

      {pages
        ? pages.map((pageDays, pi) => (
            <ItineraryPage
              key={`page-${pi}`}
              header={header}
              days={pageDays}
              multiDay={multiDay}
              footerNote={pi === pages.length - 1 ? footerNote : ''}
            />
          ))
        : singlePageFallback}
    </>
  )
}
