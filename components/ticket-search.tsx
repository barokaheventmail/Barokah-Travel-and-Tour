'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, MessageCircle, QrCode, Search, SearchX, Ticket, UserRound } from 'lucide-react'
import { formatTanggalPendek } from '@/lib/dates'
import { waLink } from '@/lib/wa'

export type CrewInfo = {
  name: string
  phone: string | null
  photoUrl: string | null
}

export type SearchMatch = {
  eventId: string
  token: string
  name: string
  order: number
  birthDate: string | null
  busName: string
  eventTitle: string
  eventDate: string
  crew: CrewInfo | null
}

export type TicketSearchHandle = {
  search: (name: string, token?: string) => void
}

export const TicketSearch = forwardRef<
  TicketSearchHandle,
  { eventId?: string; disabled?: boolean; busIds?: string[]; initialQuery?: string }
>(function TicketSearch({ eventId, disabled, busIds, initialQuery } = {}, ref) {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState<SearchMatch | null>(null)
    const [notFound, setNotFound] = useState(false)
    const [open, setOpen] = useState(false)
    const [matches, setMatches] = useState<SearchMatch[]>([])
    const [loading, setLoading] = useState(false)
    const didApplyInitial = useRef(false)
    const didAutoSelect = useRef(false)

    function buildUrl(q: string) {
      const bus = busIds && busIds.length > 0 ? `&busIds=${encodeURIComponent(busIds.join(','))}` : ''
      return `/api/public/search?q=${encodeURIComponent(q)}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ''}${bus}`
    }

  useEffect(() => {
    if (initialQuery && !didApplyInitial.current) {
      didApplyInitial.current = true
      setQuery(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    if (disabled) {
      setMatches([])
      setLoading(false)
      return
    }
    const q = query.trim()
    if (!q) {
      setMatches([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(buildUrl(q), { signal: ctrl.signal })
        const data = await res.json()
        const list = (data.matches ?? []) as SearchMatch[]
        setMatches(list)
        if (didApplyInitial.current && !didAutoSelect.current && list.length > 0) {
          didAutoSelect.current = true
          const match = list.find((m) => m.name === q) ?? list[0]
          select(match)
          setOpen(false)
          document.getElementById('cari-nama')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } catch {
        // ignore aborted / network errors
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      ctrl.abort()
      clearTimeout(t)
    }
  }, [query, eventId, disabled, busIds, initialQuery])

  const display = useMemo(() => matches.slice(0, 6), [matches])

  function select(match: SearchMatch) {
    // pencarian lintas event (mis. di beranda): masuk ke halaman event yang cocok
    if (!eventId) {
      router.push(`/event/${match.eventId}?q=${encodeURIComponent(match.name)}`)
      return
    }
    setSelected(match)
    setNotFound(false)
    setOpen(false)
  }

  function submit() {
    const q = query.trim()
    if (!q) return
    if (matches.length === 1) select(matches[0])
    else if (matches.length > 0) select(matches[0])
    else {
      setSelected(null)
      setNotFound(true)
      setOpen(false)
    }
  }

  function runSearch(name: string, token?: string) {
    if (disabled) return
    const q = name.trim()
    if (!q) return
    setQuery(name)
    setOpen(false)
    setSelected(null)
    setNotFound(false)
    setLoading(true)
    fetch(buildUrl(q))
      .then(async (res) => {
        const data = await res.json()
        const list = (data.matches ?? []) as SearchMatch[]
        setMatches(list)
        if (list.length > 0) {
        const match = token ? list.find((m) => m.token === token) : undefined
        if (token && !match) {
          setNotFound(true)
        } else {
          select(match ?? list[0])
        }
      } else {
        setNotFound(true)
      }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        document.getElementById('cari-nama')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
  }

  useImperativeHandle(ref, () => ({ search: runSearch }), [eventId, disabled, busIds])

  return (
    <div className="relative w-full" id="cari-nama">
      <div className="flex items-stretch gap-2 rounded-full border border-[#dfe4e8] bg-white p-1.5 shadow-xl">
        <label className="flex flex-1 items-center gap-3 rounded-full bg-[#f8fafc] px-4 py-2.5">
          <Search size={18} className="shrink-0 text-[#2ca84a]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setNotFound(false)
              setSelected(null)
            }}
            onFocus={() => {
              setOpen(true)
              setNotFound(false)
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Ketik nama peserta…"
            className="w-full bg-transparent text-sm text-[#1d2733] outline-none placeholder:text-[#9aa3af] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Cari nama peserta"
            disabled={disabled}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="rounded-full bg-[#1b4f9c] px-5 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cari
        </button>
      </div>

      {disabled && (
        <p className="mt-3 text-center text-xs font-semibold text-white/85">
          Cari nama peserta kini tersedia di halaman tiap event.
        </p>
      )}

      {open && (display.length > 0 || loading) && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-2xl">
          {loading && (
            <li className="px-4 py-3 text-xs font-semibold text-[#657080]">Mencari…</li>
          )}
          {!loading &&
            display.map((m) => (
              <li key={m.token}>
                <button
                  type="button"
                  onMouseDown={() => select(m)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-[#edf5ef]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f4ea] text-[#2ca84a]">
                    <BadgeCheck size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#1b3555]">{m.name}</span>
                    <span className="block truncate text-xs text-[#657080]">
                      {eventId ? m.busName : `${m.eventTitle} · ${m.busName}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}

      {selected && (
        <div className="animate-fade-up mt-4 overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-lg">
          <div className="flex flex-wrap items-center gap-3 border-l-4 border-[#2ca84a] bg-[#e6f4ea] px-5 py-4">
            <BadgeCheck className="shrink-0 text-[#2ca84a]" size={20} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1b3555]">{selected.name} · Tiket Ditemukan</p>
              <p className="text-xs text-[#657080]">
                {selected.eventTitle} · {formatTanggalPendek(new Date(selected.eventDate))}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/tiket/${selected.token}`)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#1b4f9c] px-3 py-1.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95"
            >
              <QrCode size={12} /> Lihat Tiket & QR
            </button>
          </div>
          <dl className="grid gap-3 px-5 py-5 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Bus / Unit</dt>
              <dd className="mt-0.5 font-bold text-[#1b4f9c]">{selected.busName}</dd>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Nomor Kursi</dt>
              <dd className="mt-0.5 font-semibold text-[#1b3555]">{selected.order}</dd>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Tanggal Event</dt>
              <dd className="mt-0.5 font-semibold text-[#1b3555]">{formatTanggalPendek(new Date(selected.eventDate))}</dd>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Tanggal Lahir</dt>
              <dd className="mt-0.5 font-semibold text-[#1b3555]">
                {selected.birthDate ? formatTanggalPendek(new Date(selected.birthDate)) : '–'}
              </dd>
            </div>
          </dl>
          <div className="border-t border-[#edf0f3] px-5 py-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#657080]">
              <Ticket size={12} /> Klik &ldquo;Lihat Tiket &amp; QR&rdquo;, lalu tunjukkan QR ke crew saat absensi.
            </p>
          </div>
        </div>
      )}

      {selected?.crew && selected.crew.phone && (() => {
        const wa = waLink(selected.crew.phone)
        if (!wa) return null
        const initial = (selected.crew.name.trim()[0] ?? 'C').toUpperCase()
        return (
          <div className="animate-fade-up mt-3 overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-lg">
            <div className="flex items-center gap-2 border-l-4 border-[#2ca84a] bg-[#e6f4ea] px-5 py-3">
              <MessageCircle className="shrink-0 text-[#2ca84a]" size={14} />
              <p className="text-xs font-bold uppercase tracking-wide text-[#1b3555]">Hubungi Panitia</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                {selected.crew.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.crew.photoUrl}
                    alt={`Foto ${selected.crew.name}`}
                    className="h-12 w-12 shrink-0 rounded-full border border-[#edf0f3] object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1b4f9c,#163d78)] text-sm font-bold text-white">
                    {initial}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1b3555]">{selected.crew.name}</p>
                  <p className="truncate text-xs text-[#657080]">Penanggung jawab unit {selected.busName}</p>
                </div>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#25d366] px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#1eb055] active:scale-[0.98]"
                >
                  <MessageCircle size={15} /> Hubungi WA
                </a>
              </div>
          </div>
        )
      })()}

      {notFound && (
        <div className="animate-fade-up mt-4 flex flex-col gap-3 rounded-2xl border border-[#dfe4e8] bg-white p-5 text-left shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <SearchX className="mt-0.5 shrink-0 text-[#b98a12]" size={20} />
            <div>
              <p className="text-sm font-bold text-[#1b3555]">Nama &ldquo;{query.trim()}&rdquo; belum ditemukan</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#657080]">
                Mungkin nama belum didaftarkan atau event belum dibuat. Hubungi admin untuk memastikan tiket Anda.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/6285930005544"
            className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#2ca84a] px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#219b42]"
          >
            Tanya Admin
          </a>
        </div>
      )}
    </div>
  )
  },
)