'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, Bus, Check, ChevronDown, Loader2, RefreshCcw, Search, SearchX, X } from 'lucide-react'
import { formatTanggalPendek } from '@/lib/dates'
import { PARTICIPANTS_CHANGED_EVENT, PARTICIPANT_ADDED_EVENT } from '@/lib/events'
import { EditParticipant } from './edit-participant'
import { DeleteParticipant } from './delete-participant'
import { ToggleAttendance } from './toggle-attendance'

export type RowParticipant = {
  id: string
  busId: string
  order: number
  name: string
  birthPlace: string | null
  birthDate: string | null
  phone: string | null
  seat: string | null
  room: string | null
  roomType: string | null
  vw: string | null
  jeepParis: string | null
  jeepMerapi: string | null
  jeepBromo: string | null
  scannedAt: string | null
  scannedBy: { username: string; name: string | null } | null
}

export type RowBus = {
  id: string
  name: string
  order: number
  count: number
  attended: number
}

type StatusFilter = 'all' | 'attended' | 'pending'

const PAGE_SIZE = 200
// Batas keras dari API (`take` di-clamp ke 500).
const API_MAX = 500
// Cadangan: penyegaran diam-diam kalau total kehadiran tidak berubah.
const VISIBLE_REFRESH_MS = 10000

/**
 * Bus bisa dozens, jadi `<select>` native memaksa user menggulir 78 opsi tanpa
 * search dan tanpa info kehadiran. Panel ini searchable, dan tiap baris
 * menampilkan progres hadir supaya admin bisa langsung melihat bus mana yang
 * belum lengkap tanpa harus membukanya satu per satu.
 */
function BusPicker({
  buses,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
}: {
  buses: RowBus[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else setQ('')
  }, [open])

  const needle = q.trim().toLowerCase()
  const filtered = useMemo(
    () => (needle ? buses.filter((b) => b.name.toLowerCase().includes(needle)) : buses),
    [buses, needle],
  )

  const allIds = useMemo(() => buses.map((b) => b.id), [buses])
  const pickedAll = allIds.length > 0 && selectedIds.length === allIds.length
  const pickedInView = filtered.filter((b) => selectedIds.includes(b.id)).length

  // Tanpa pilihan = semua bus, jadi angka ringkasan di trigger ikut semua.
  const scope = selectedIds.length === 0 ? buses : buses.filter((b) => selectedIds.includes(b.id))
  const scopeCount = scope.reduce((s, b) => s + b.count, 0)
  const scopeAttended = scope.reduce((s, b) => s + b.attended, 0)

  const label =
    selectedIds.length === 0
      ? 'Semua Bus'
      : selectedIds.length === 1
        ? (buses.find((b) => b.id === selectedIds[0])?.name ?? '1 bus')
        : `${selectedIds.length} bus dipilih`

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full min-w-[15rem] items-center gap-2 rounded-full border border-[#dfe4e8] bg-[#f8fafc] px-3.5 py-1.5 pr-[4.75rem] text-left transition-colors duration-200 hover:bg-white"
      >
        <Bus size={14} className="shrink-0 text-[#1b4f9c]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-[#1b3555]">{label}</span>
          <span className="block truncate text-[10px] font-semibold text-[#9aa3af]">
            {scopeCount.toLocaleString('id-ID')} peserta · {scopeAttended.toLocaleString('id-ID')} hadir
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[#9aa3af] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Tombol X jadi saudara trigger, bukan anaknya: elemen interaktif di
          dalam <button> itu HTML tidak valid. */}
      {selectedIds.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          title="Kosongkan pilihan bus"
          aria-label="Kosongkan pilihan bus"
          className="absolute right-10 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#e8ecf1] text-[#657080] transition-colors duration-200 hover:bg-[#d7dde5]"
        >
          <X size={12} />
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-[#ece3cd] bg-white p-2 shadow-[0_28px_70px_-22px_rgba(9,32,74,0.6)]">
          <div className="relative mb-2">
            <Search
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]"
            />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari bus…"
              className="w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] py-2 pl-8 pr-3 text-xs font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white"
            />
          </div>

          <div className="mb-1.5 flex items-center gap-2 px-1">
            <button
              type="button"
              onClick={pickedAll ? onClear : onSelectAll}
              className="rounded-full border border-[#dfe4e8] px-2.5 py-1 text-[11px] font-bold text-[#657080] transition-colors duration-150 hover:bg-[#f1f3f5]"
            >
              {pickedAll ? 'Batalkan semua' : 'Pilih semua'}
            </button>
            <span className="text-[10px] font-semibold tabular-nums text-[#9aa3af]">
              {pickedInView} dari {filtered.length} tampil dipilih
            </span>
          </div>

          <div className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain">
            {filtered.map((bus) => {
              const pct = bus.count > 0 ? Math.round((bus.attended / bus.count) * 100) : 0
              const on = selectedIds.includes(bus.id)
              return (
                <button
                  key={bus.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => onToggle(bus.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors duration-150 ${
                    on ? 'bg-[#eef3fb]' : 'hover:bg-[#f8fafc]'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      on ? 'border-[#1b4f9c] bg-[#1b4f9c] text-white' : 'border-[#cbd3dc] bg-white'
                    }`}
                  >
                    {on && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="w-[4.5rem] shrink-0 truncate text-xs font-bold text-[#1b3555]">
                    {bus.name}
                  </span>
                  <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-[#eef0f3]">
                    <span
                      className="block h-full rounded-full bg-[#2ca84a]"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-[10px] font-bold tabular-nums text-[#657080]">
                    {bus.attended}/{bus.count}
                  </span>
                </button>
              )
            })}

            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs font-semibold text-[#9aa3af]">
                Tidak ada bus yang cocok.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ParticipantTable({
  eventId,
  buses,
  totalParticipants,
  totalAttended,
}: {
  eventId: string
  buses: RowBus[]
  totalParticipants: number
  totalAttended: number
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedBusIds, setSelectedBusIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [items, setItems] = useState<RowParticipant[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const itemsLenRef = useRef(0)

  const fetchPage = useCallback(
    async (take: number, skip: number) => {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('q', debouncedQuery)
      if (selectedBusIds.length > 0) params.set('busIds', selectedBusIds.join(','))
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('take', String(take))
      params.set('skip', String(skip))

      const res = await fetch(`/api/admin/events/${eventId}/participants?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat peserta.')
      return data as { items: RowParticipant[]; total: number }
    },
    [debouncedQuery, selectedBusIds, statusFilter, eventId],
  )

  const loadPage = useCallback(
    async (skip: number, append: boolean) => {
      const seq = ++seqRef.current
      try {
        const data = await fetchPage(PAGE_SIZE, skip)
        if (seq !== seqRef.current) return
        setItems((prev) => (append ? [...prev, ...data.items] : data.items))
        itemsLenRef.current = append ? itemsLenRef.current + data.items.length : data.items.length
        setTotal(data.total)
        setError(null)
      } catch (err) {
        if (seq !== seqRef.current) return
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
      } finally {
        if (seq === seqRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [fetchPage],
  )

  /**
   * Toggle kehadiran adalah aksi utama di halaman ini. Kalau setiap aksi
   * memuat ulang dari `skip=0`, user yang sudah menggulir ribuan baris ikut
   * terlempar ke atas. Jadi: segarkan ulang baris yang sedang terlihat, dengan
   * pagination yang sama, sehingga posisi scroll dan data yang sudah dimuat
   * tetap utuh.
   */
  const refreshVisible = useCallback(async () => {
    const want = itemsLenRef.current
    if (want === 0) {
      await loadPage(0, false)
      return
    }
    const seq = ++seqRef.current
    try {
      const collected: RowParticipant[] = []
      let skip = 0
      let lastTotal = total
      while (collected.length < want) {
        const take = Math.min(API_MAX, want - collected.length)
        const data = await fetchPage(take, skip)
        if (seq !== seqRef.current) return
        collected.push(...data.items)
        lastTotal = data.total
        skip += data.items.length
        if (data.items.length < take) break
      }
      setItems(collected)
      itemsLenRef.current = collected.length
      setTotal(lastTotal)
      setError(null)
    } catch {
      // Diamkan: refresh diam-diam, jangan sampai participants yang sedang
      // aktif kehilangan isi tabel karena error jaringan sesaat.
    } finally {
      if (seq === seqRef.current) setLoading(false)
    }
  }, [fetchPage, loadPage, total])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true)
    loadPage(0, false)
  }, [loadPage])

  // Perubahan kehadiran (dari baris mana pun di halaman) disegarkan diam-diam.
  useEffect(() => {
    const onChanged = () => refreshVisible()
    window.addEventListener(PARTICIPANTS_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(PARTICIPANTS_CHANGED_EVENT, onChanged)
  }, [refreshVisible])

  // Peserta baru ditambah: muat ulang penuh dari halaman pertama supaya
  // peserta tersebut langsung terlihat tanpa perlu scroll ke bawah.
  useEffect(() => {
    const onAdded = () => {
      setLoading(true)
      loadPage(0, false)
    }
    window.addEventListener(PARTICIPANT_ADDED_EVENT, onAdded)
    return () => window.removeEventListener(PARTICIPANT_ADDED_EVENT, onAdded)
  }, [loadPage])

  // Bus bisa terhapus (mis. digabung) sementara pilihannya masih aktif.
  useEffect(() => {
    setSelectedBusIds((cur) => {
      const next = cur.filter((id) => buses.some((bus) => bus.id === id))
      return next.length === cur.length ? cur : next
    })
  }, [buses])

  const attendedRef = useRef(totalAttended)

  useEffect(() => {
    if (attendedRef.current !== totalAttended) {
      attendedRef.current = totalAttended
      refreshVisible()
    }
  }, [totalAttended, refreshVisible])

  // Penjaga terakhir: `totalAttended` hanya berubah kalau jumlahnya beda, jadi
  // satu peserta yang di-bulk-ubah (mis. 5 orang dilepas, 5 orang lain
  // ditandai) tidak mengubah angka total dan tabel bisa basi. Polling ringan
  // ini menutup celah itu tanpa bergantung pada router.refresh().
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      refreshVisible()
    }, VISIBLE_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [refreshVisible])

  // Ganti filter = konteks data berubah total, kembalikan user ke atas supaya
  // tidak melihat sisa daftar bus sebelumnya.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [debouncedQuery, selectedBusIds, statusFilter])

  const hasMore = items.length < total
  const loadingRef = useRef(false)
  loadingRef.current = loading || loadingMore

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || error) return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingRef.current) return
        setLoadingMore(true)
        loadPage(itemsLenRef.current, true)
      },
      { rootMargin: '800px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, error, loadPage, items.length])

  const groups = useMemo(() => {
    const byBus = new Map<string, RowParticipant[]>()
    for (const p of items) {
      const arr = byBus.get(p.busId)
      if (arr) arr.push(p)
      else byBus.set(p.busId, [p])
    }
    const picked = new Set(selectedBusIds)
    return buses
      .filter((bus) => picked.size === 0 || picked.has(bus.id))
      .map((bus) => ({ bus, items: (byBus.get(bus.id) ?? []).sort((a, b) => a.order - b.order) }))
      .filter((g) => g.items.length > 0)
  }, [items, buses, selectedBusIds])

  const hasAny = useMemo(
    () => ({
      ttl: items.some((p) => p.birthDate || p.birthPlace),
      phone: items.some((p) => p.phone),
      seat: items.some((p) => p.seat),
      room: items.some((p) => p.room),
      roomType: items.some((p) => p.roomType),
      vw: items.some((p) => p.vw),
    }),
    [items],
  )

  // Tanpa filter, `bus.count` adalah total sebenarnya di bus itu, jadi angka
  // itu boleh lebih besar dari baris yang sudah termuat. Dengan filter aktif
  // keduanya tidak sebanding, jadi jangan ditampilkan.
  const plainBrowse = !debouncedQuery && statusFilter === 'all'

  const statusBtn = (value: StatusFilter, label: string) => (
    <button
      type="button"
      key={value}
      onClick={() => setStatusFilter(value)}
      aria-pressed={statusFilter === value}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
        statusFilter === value
          ? 'bg-[#1b4f9c] text-white'
          : 'border border-[#dfe4e8] text-[#657080] hover:bg-[#f1f3f5]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe4e8] px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-[#1b3555]">Daftar Peserta</h2>
          <p className="text-xs text-[#657080]">
            {totalParticipants.toLocaleString('id-ID')} peserta ·{' '}
            <span className="font-bold text-[#2ca84a]">{totalAttended.toLocaleString('id-ID')} hadir</span>
            {total !== totalParticipants && (
              <span className="text-[#9aa3af]"> · {total.toLocaleString('id-ID')} cocok dengan filter</span>
            )}
          </p>
        </div>
        <label className="flex min-w-[15rem] flex-1 items-center gap-2 rounded-full border border-[#dfe4e8] bg-[#f8fafc] px-3.5 py-2 sm:max-w-xs">
          <Search size={14} className="shrink-0 text-[#9aa3af]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama / HP / kamar / VW…"
            className="w-full min-w-[8rem] bg-transparent text-xs font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#dfe4e8] px-5 py-3">
        <BusPicker
          buses={buses}
          selectedIds={selectedBusIds}
          onToggle={(id) =>
            setSelectedBusIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
          }
          onSelectAll={() => setSelectedBusIds(buses.map((b) => b.id))}
          onClear={() => setSelectedBusIds([])}
        />
        <div className="ml-auto flex items-center gap-1.5">
          {statusBtn('all', 'Semua')}
          {statusBtn('attended', 'Hadir')}
          {statusBtn('pending', 'Belum')}
        </div>
      </div>

      {error ? (
        <div className="p-10 text-center">
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              loadPage(0, false)
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
          >
            <RefreshCcw size={13} /> Coba lagi
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <Loader2 size={24} className="animate-spin text-[#1b4f9c]" />
          <p className="text-xs font-semibold text-[#657080]">Memuat peserta…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center">
          <SearchX className="mx-auto text-[#9aa3af]" size={28} />
          <p className="mt-2 text-sm font-bold text-[#1b3555]">Tidak ada peserta</p>
          <p className="text-xs text-[#657080]">Import file Excel, ubah kata kunci, atau longgarkan filter.</p>
        </div>
      ) : (
        <div className="space-y-5 p-5">
          {groups.map(({ bus, items: rows }) => {
            const partial = plainBrowse && rows.length < bus.count
            const pctBus = bus.count > 0 ? Math.round((bus.attended / bus.count) * 100) : 0
            return (
              <div key={bus.id}>
                {/* Baris judul grup bus (nama bus + progres hadir) tetap
                    sticky supaya konteks bus tidak hilang saat menggulir
                    dozens baris di dalamnya. Baris header KOLOM di bawahnya
                    sengaja tidak sticky, sama seperti sebelumnya. */}
                <div className="sticky top-16 z-20 mb-2 flex h-9 items-center gap-2 rounded-xl border border-[#dfe4e8] bg-white/95 px-3 backdrop-blur">
                  <span className="flex h-6 shrink-0 items-center rounded-full bg-[#eef3fb] px-2.5 text-[11px] font-black text-[#1b4f9c]">
                    {bus.name}
                  </span>
                  <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[#eef0f3]">
                    <span
                      className="block h-full rounded-full bg-[#2ca84a]"
                      style={{ width: `${pctBus}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#657080]">
                    {bus.attended}/{bus.count} hadir
                  </span>
                  {partial && (
                    <span className="shrink-0 text-[10px] font-semibold text-[#9aa3af]">
                      · {rows.length} dari {bus.count} termuat
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[10px] font-semibold tabular-nums text-[#9aa3af]">
                    {pctBus}%
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#dfe4e8]">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead>
                      <tr className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                        <th className="px-3 py-2.5">No</th>
                        <th className="px-3 py-2.5">Nama Lengkap</th>
                        {hasAny.ttl && <th className="px-3 py-2.5">TTL</th>}
                        {hasAny.phone && <th className="px-3 py-2.5">Telp/HP</th>}
                        {hasAny.seat && <th className="px-3 py-2.5">Kursi</th>}
                        {hasAny.room && <th className="px-3 py-2.5">Kamar</th>}
                        {hasAny.roomType && <th className="px-3 py-2.5">Tipe Kamar</th>}
                        {hasAny.vw && <th className="px-3 py-2.5">VW</th>}
                        <th className="px-3 py-2.5">Kehadiran</th>
                        <th className="px-3 py-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef0f3]">
                      {rows.map((p) => (
                        <tr
                          key={p.id}
                          className={`${p.scannedAt ? 'bg-[#f6fbf8]' : 'bg-white'} hover:bg-[#fbfcfe]`}
                        >
                          <td className={`px-3 font-bold tabular-nums text-[#9aa3af] py-2.5`}>{p.order}</td>
                          <td className={`px-3 font-bold text-[#1b3555] py-2.5`}>{p.name}</td>
                          {hasAny.ttl && (
                            <td className={`px-3 text-[#657080] py-2.5`}>
                              {p.birthDate
                                ? `${formatTanggalPendek(new Date(p.birthDate))}${p.birthPlace ? ` · ${p.birthPlace}` : ''}`
                                : p.birthPlace || '—'}
                            </td>
                          )}
                          {hasAny.phone && <td className={`px-3 text-[#657080] py-2.5`}>{p.phone || '—'}</td>}
                          {hasAny.seat && <td className={`px-3 text-[#657080] py-2.5`}>{p.seat || '—'}</td>}
                          {hasAny.room && <td className={`px-3 text-[#657080] py-2.5`}>{p.room || '—'}</td>}
                          {hasAny.roomType && (
                            <td className={`px-3 text-[#657080] py-2.5`}>{p.roomType || '—'}</td>
                          )}
                          {hasAny.vw && <td className={`px-3 text-[#657080] py-2.5`}>{p.vw || '—'}</td>}
                          <td className={`px-3 py-2.5`}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {p.scannedAt ? (
                                <div className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] font-bold text-[#2ca84a]">
                                  <BadgeCheck size={12} />
                                  Hadir {p.scannedBy ? ` · ${p.scannedBy.name ?? p.scannedBy.username}` : ''}
                                </div>
                              ) : (
                                <span className="rounded-full bg-[#fff7e0] px-2.5 py-1 text-[11px] font-bold text-[#b98a12]">
                                  Belum
                                </span>
                              )}
                              <ToggleAttendance
                                eventId={eventId}
                                participantId={p.id}
                                name={p.name}
                                attended={!!p.scannedAt}
                              />
                            </div>
                          </td>
                          <td className={`px-3 py-2.5`}>
                            <div className="flex items-center justify-end">
                              <EditParticipant eventId={eventId} participant={p} buses={buses} />
                              <DeleteParticipant eventId={eventId} participant={p} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          <div ref={sentinelRef} className="flex flex-col items-center gap-2 pt-1">
            {loadingMore && (
              <>
                <Loader2 size={16} className="animate-spin text-[#1b4f9c]" />
                <p className="text-[11px] font-semibold text-[#657080]">Memuat peserta berikutnya…</p>
              </>
            )}
            {!hasMore && items.length > 0 && (
              <p className="py-1 text-[11px] font-semibold text-[#9aa3af]">
                Semua {items.length.toLocaleString('id-ID')} peserta sudah tampil.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
