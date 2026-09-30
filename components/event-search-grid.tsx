'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Search, SearchX } from 'lucide-react'
import { EventCard, type EventCardData } from '@/components/event-card'

export function EventSearchGrid({ events }: { events: EventCardData[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q),
    )
  }, [events, query])

  return (
    <>
      <div className="mb-14 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-3">
            <span aria-hidden className="h-px w-12 bg-gradient-to-r from-[#f5b915] to-transparent" />
            <span className="eyebrow !text-[#a97c07]">Agenda perjalanan</span>
          </span>
          <h2 className="mt-5 text-4xl font-bold leading-none tracking-[-0.03em] text-[#1b3555] md:text-[3.25rem]">
            Event
          </h2>
          <span aria-hidden className="mt-6 block h-px w-24 bg-gradient-to-r from-[#1b3555]/25 to-transparent" />
          <p className="mt-6 text-[15px] leading-[1.75] text-[#657080]">
            Event perjalanan yang sedang berlangsung, dikelola langsung oleh admin. Pilih event untuk melihat
            rincian bus dan peserta.
          </p>
        </div>
        <div className="shrink-0 lg:pb-16">
          <div className="relative w-full max-w-sm">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a94a6]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama event atau lokasi…"
              aria-label="Cari event"
              className="w-full rounded-full border border-[#dfe4e8] bg-white py-3 pl-11 pr-4 text-sm text-[#1b3555] shadow-[0_10px_30px_-18px_rgba(27,53,85,0.35)] outline-none transition-all duration-200 placeholder:text-[#8a94a6] focus:border-[#f5b915] focus:ring-4 focus:ring-[#f5b915]/15"
            />
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#e0dccd] bg-white/60 p-14 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 55% 55% at 50% 0%, rgba(245,185,21,0.1) 0%, rgba(245,185,21,0) 72%)',
            }}
          />
          {query.trim() ? (
            <>
              <SearchX className="relative mx-auto text-[#c9c2ab]" size={30} />
              <p className="relative mt-4 text-lg font-bold text-[#1b3555]">
                Tidak ada event untuk &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="relative mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#657080]">
                Coba kata kunci lain, misalnya nama event atau lokasi tujuan.
              </p>
            </>
          ) : (
            <>
              <CalendarDays className="relative mx-auto text-[#c9c2ab]" size={30} />
              <p className="relative mt-4 text-lg font-bold text-[#1b3555]">Belum ada event</p>
              <p className="relative mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#657080]">
                Admin belum menambahkan event. Anda tetap bisa mengecek tiket &amp; QR peserta lewat halaman event
                saat tersedia.
              </p>
            </>
          )}
        </div>
      )}
    </>
  )
}
