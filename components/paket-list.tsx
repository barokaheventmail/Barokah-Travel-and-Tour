'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, MapPin, Package } from 'lucide-react'
import { renderRichText } from '@/lib/rich-text'

type Paket = {
  id: string
  title: string
  location: string | null
  description: string | null
  imageUrl: string | null
}

const PAGE = 5

export function PaketList({ pakets }: { pakets: Paket[] }) {
  const cities = useMemo(() => {
    const seen = new Set<string>()
    for (const p of pakets) {
      const loc = p.location?.trim()
      if (loc) seen.add(loc)
    }
    return Array.from(seen)
  }, [pakets])

  const [selected, setSelected] = useState<string | null>(null)
  const [showAllCities, setShowAllCities] = useState(false)
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    setLimit(PAGE)
  }, [selected])

  const filtered = selected ? pakets.filter((p) => p.location?.trim() === selected) : pakets
  const visible = filtered.slice(0, limit)
  const hasMore = filtered.length > limit

  const MAX_CITIES = 5
  const hasExtra = cities.length > MAX_CITIES

  function handleCity(city: string | null) {
    setSelected(city)
  }

  return (
    <>
      {cities.length > 0 && (
        <div className="relative mb-8">
          <div className="flex flex-wrap items-center justify-start gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => {
                handleCity(null)
                setShowAllCities(false)
              }}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
                selected === null
                  ? 'border-[#1b4f9c] bg-[#1b4f9c] text-white shadow-[0_10px_24px_-12px_rgba(27,79,156,0.8)]'
                  : 'border-[#dfe4e8] bg-white text-[#1b3555] hover:border-[#1b4f9c]/50 hover:text-[#1b4f9c]'
              }`}
            >
              Semua Kota
            </button>
            {!hasExtra &&
              cities.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCity(c)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold capitalize transition-all duration-200 active:scale-95 ${
                    selected === c
                      ? 'border-[#1b4f9c] bg-[#1b4f9c] text-white shadow-[0_10px_24px_-12px_rgba(27,79,156,0.8)]'
                      : 'border-[#dfe4e8] bg-white text-[#1b3555] hover:border-[#1b4f9c]/50 hover:text-[#1b4f9c]'
                  }`}
                >
                  {c}
                </button>
              ))}
            {hasExtra && (
              <button
                type="button"
                onClick={() => setShowAllCities((v) => !v)}
                aria-expanded={showAllCities}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-[#c9d6ea] bg-[#f4f7fa] px-4 py-2 text-xs font-bold text-[#1b4f9c] transition-all duration-200 hover:border-[#1b4f9c]/60 hover:bg-white active:scale-95"
              >
                {showAllCities ? 'Sembunyikan kota' : 'Lihat semua kota'}
                <ChevronDown size={14} className={`transition-transform duration-200 ${showAllCities ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {hasExtra && showAllCities && (
            <div className="absolute left-0 top-full z-20 mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto rounded-2xl border border-[#dfe4e8] bg-white p-2.5 shadow-[0_18px_40px_-24px_rgba(27,53,85,0.45)] sm:max-w-xs sm:min-w-[12rem]">
              {cities.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    handleCity(c)
                    setShowAllCities(false)
                  }}
                  className={`rounded-lg px-3 py-2 text-left text-xs font-bold capitalize transition-colors duration-150 ${
                    selected === c ? 'bg-[#1b4f9c] text-white' : 'text-[#1b3555] hover:bg-[#f1f3f5]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e0dccd] bg-white/60 p-14 text-center">
          <Package className="mx-auto text-[#c9c2ab]" size={30} />
          <p className="mx-auto mt-4 max-w-md text-lg font-bold text-[#1b3555]">Belum ada paket di kota ini</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#657080]">Pilih kota lain untuk melihat paket event wisata.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {visible.map((paket) => (
            <article
              key={paket.id}
              className="group flex min-h-[180px] flex-col overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-[0_10px_30px_-18px_rgba(27,53,85,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-[#f5b915]/70 hover:shadow-[0_24px_50px_-22px_rgba(27,53,85,0.45)] sm:flex-row"
            >
              <div className="relative h-44 w-full shrink-0 overflow-hidden sm:h-auto sm:w-60 md:w-72">
                {paket.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={paket.imageUrl}
                    alt={paket.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0d2850] to-[#163d78] text-white/40">
                    <Package size={36} />
                  </div>
                )}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent sm:bg-gradient-to-r" />
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h2 className="text-xl font-bold leading-snug text-[#1b3555] group-hover:text-[#1b4f9c]">
                  {paket.title}
                </h2>
                {paket.location && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-base font-semibold text-[#657080]">
                    <MapPin size={17} className="shrink-0 text-[#1b4f9c] [&_circle]:fill-white" fill="currentColor" /> {paket.location}
                  </p>
                )}
                <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-[#657080]">
                  {paket.description ? renderRichText(paket.description) : <span className="italic">Belum ada keterangan.</span>}
                </p>
                <div className="mt-auto flex items-center justify-end pt-3">
                  <Link
                    href={`/paket/${paket.id}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-bold text-[#1b4f9c] transition-colors duration-200 hover:text-[#143d79]"
                  >
                    Lihat Detail <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {(hasMore || limit > PAGE) && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {hasMore && (
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="flex items-center gap-2 rounded-full border border-[#dfe4e8] bg-white px-7 py-3 text-sm font-bold text-[#1b3555] shadow-[0_10px_30px_-18px_rgba(27,53,85,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f5b915]/70 hover:text-[#1b4f9c] active:scale-95"
              >
                <ChevronDown size={15} /> Muat Lebih Banyak
              </button>
            )}
            {limit > PAGE && (
              <button
                type="button"
                onClick={() => setLimit(PAGE)}
                className="flex items-center gap-2 rounded-full border border-dashed border-[#c9d6ea] bg-[#f4f7fa] px-7 py-3 text-sm font-bold text-[#1b4f9c] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1b4f9c]/60 hover:bg-white active:scale-95"
              >
                <ChevronDown size={15} className="rotate-180" /> Tampilkan Lebih Sedikit
              </button>
            )}
          </div>
        )}
        </>
      )}
    </>
  )
}