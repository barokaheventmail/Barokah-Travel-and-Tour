'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bus, Check, ChevronDown, Copy, ImagePlus, KeyRound, Loader2, Pencil, Phone, Plus, Search, Trash2, User as UserIcon, X } from 'lucide-react'
import { crewPassword } from '@/lib/crew-password'

export type BusWorkerData = {
  id: string
  order: number
  user: {
    id: string
    username: string
    name: string | null
    phone: string | null
    photoUrl: string | null
    customPassword: boolean
  }
}

export type BusWithWorkersData = {
  id: string
  name: string
  order: number
  count: number
  attended: number
  workers: BusWorkerData[]
}

function usernameFromName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 20)
  return base || 'crew'
}

/**
 * Inisial untuk lingkaran crew yang belum punya foto: huruf pertama kata
 * pertama, ditambah huruf pertama kata terakhir kalau namanya punya >= 2 kata
 * ("Andi Rahmat" -> "AR", "Ardian" -> "A"). Kalau `name` kosong, jatuh ke
 * username supaya lingkaran tidak pernah kosong.
 */
function initialsOf(name: string | null, username: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const source = words.length ? words : [username]
  if (source.length === 1) return source[0].slice(0, 1).toUpperCase()
  return (source[0].slice(0, 1) + source[source.length - 1].slice(0, 1)).toUpperCase()
}

const inputCls =
  'w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15'

// Armandanya bisa dozens bus, jadi strip chip horizontal memaksa pengguna
// menggulir ribuan piksel. Satu dropdown + pencarian lebih ringkas dan bus mana
// pun bisa ditemukan tanpa scroll.
function ArmadaPicker({
  buses,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
}: {
  buses: BusWithWorkersData[]
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

  const needle = q.trim().toLowerCase()
  const filtered = useMemo(
    () => (needle ? buses.filter((b) => b.name.toLowerCase().includes(needle)) : buses),
    [buses, needle],
  )
  const allIds = useMemo(() => filtered.map((b) => b.id), [filtered])
  const pickedInView = allIds.filter((id) => selectedIds.includes(id)).length
  const allPicked = allIds.length > 0 && pickedInView === allIds.length
  const totalCrew = buses.filter((b) => selectedIds.includes(b.id)).reduce((s, b) => s + b.workers.length, 0)

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="group flex w-full items-center gap-3 rounded-2xl bg-[linear-gradient(100deg,#071e3d_0%,#163d78_100%)] px-4 py-3 text-left text-white shadow-[0_14px_32px_-14px_rgba(9,32,74,0.95)] transition-shadow duration-300 hover:shadow-[0_18px_38px_-14px_rgba(9,32,74,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Bus size={17} />
        </span>
        {/* `pr-20` hanya dipakai saat ada pilihan, untuk memberi ruang tombol X.
            Kalau tidak, trigger cukup `px-4` supaya panah tetap menempel di
            tepi kanan dan tidak melayang jauh dari ujung. */}
        <span className={`min-w-0 flex-1 ${selectedIds.length > 0 ? 'pr-20' : ''}`}>
          <span className="block truncate text-sm font-bold">
            {selectedIds.length === 0
              ? 'Pilih Unit'
              : selectedIds.length === 1
                ? buses.find((b) => b.id === selectedIds[0])?.name
                : `${selectedIds.length} bus dipilih`}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/70">
            {selectedIds.length === 0
              ? `${buses.length} bus tersedia · bisa pilih beberapa`
              : `${totalCrew} crew di ${selectedIds.length} bus terpilih`}
          </span>
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/90 ring-1 ring-inset ring-white/20 transition-all duration-300 ease-out group-hover:bg-white/25 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <ChevronDown size={15} />
        </span>
      </button>

      {/* Tombol X ini sengaja jadi saudara trigger, bukan anaknya: elemen
          interaktif di dalam <button> itu HTML tidak valid. */}
      {selectedIds.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          title="Batalkan semua pilihan"
          aria-label="Batalkan semua pilihan"
          className="absolute right-12 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-inset ring-white/20 transition-colors duration-200 hover:bg-[#e05a4d]"
        >
          <X size={13} />
        </button>
      )}

      {/* Tanpa `transform`/`filter` agar tidak menjadi blok penampung posisi
          untuk elemen `fixed` di dalam panel. */}
      <div
        role="listbox"
        aria-hidden={!open}
        className={`absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-[#ece3cd] bg-white p-2 transition-[opacity,visibility,box-shadow] duration-200 ease-out ${
          open
            ? 'visible opacity-100 shadow-[0_28px_70px_-22px_rgba(9,32,74,0.6)]'
            : 'pointer-events-none invisible opacity-0 shadow-[0_12px_28px_-20px_rgba(9,32,74,0.4)]'
        }`}
      >
        <div className="mb-1.5 h-px bg-gradient-to-r from-transparent via-[#e8d9ab] to-transparent" />

        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => inputRef.current?.select()}
            placeholder="Cari bus, mis. bus 12"
            className="w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] py-2 pl-9 pr-3 text-xs font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
          />
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={allPicked ? onClear : onSelectAll}
            className="flex items-center gap-1.5 rounded-full border border-[#e8d9ab] bg-[#fbf7ec] px-3 py-1.5 text-[11px] font-bold text-[#b8860b] transition-colors duration-200 hover:bg-[#f5e7bd]"
          >
            {allPicked ? <X size={11} /> : <Check size={11} />}
            {allPicked ? 'Batalkan semua' : `Pilih semua${needle ? ` (${filtered.length})` : ''}`}
          </button>
          <span className="text-[11px] font-semibold text-[#8a93a3]">
            {pickedInView} dari {filtered.length} tampil dipilih
          </span>
        </div>

        <div className="mt-1.5 max-h-72 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs font-semibold text-[#9aa3af]">
              Tidak ada bus yang cocok dengan &ldquo;{q.trim()}&rdquo;.
            </p>
          ) : (
            filtered.map((bus) => {
              const isSelected = selectedIds.includes(bus.id)
              return (
                <button
                  key={bus.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onToggle(bus.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-200 ${
                    isSelected ? 'bg-[#fbf7ec]' : 'hover:bg-[#f4f7fa]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                      isSelected ? 'bg-[#f5e7bd] text-[#b8860b]' : 'bg-[#eef3fb] text-[#163d78]'
                    }`}
                  >
                    {isSelected ? <Check size={15} /> : <Bus size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-[#1b3555]">{bus.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[#f1f3f5] px-2 py-0.5 text-[10px] font-bold text-[#657080]">
                        {bus.count} peserta
                      </span>
                      {bus.attended > 0 && (
                        <span className="rounded-full bg-[#e6f4ea] px-2 py-0.5 text-[10px] font-bold text-[#2ca84a]">
                          {bus.attended} hadir
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          bus.workers.length > 0
                            ? 'bg-[#eef3fb] text-[#1b4f9c]'
                            : 'bg-[#f8fafc] text-[#9aa3af]'
                        }`}
                      >
                        {bus.workers.length > 0 ? `${bus.workers.length} crew` : 'belum ada crew'}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="mt-1.5 h-px bg-[#f1f3f5]" />
        <p className="px-2.5 py-1.5 text-[11px] font-semibold text-[#8a93a3]">
          {filtered.length === buses.length
            ? `Menampilkan semua ${buses.length} bus.`
            : `${filtered.length} bus cocok dari ${buses.length}.`}
        </p>
      </div>
    </div>
  )
}

// Mode gabungan: satu daftar untuk semua bus terpilih. Bus tanpa crew tetap
// ikut ditampilkan sebagai baris "belum ada crew" supaya tidak ada yang terasa
// hilang -- terutama saat "Pilih Semua" dipakai di event dengan 78 bus.
function CombinedCrewPanel({ eventId, buses }: { eventId: string; buses: BusWithWorkersData[] }) {
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const totalCrew = buses.reduce((s, b) => s + b.workers.length, 0)
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">
        {buses.length} bus dipilih · {totalCrew} crew
      </p>
      <div className="mt-2 divide-y divide-[#f1f3f5]">
        {buses.map((bus) => (
          <div key={bus.id} className="py-2 first:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef3fb] text-[#163d78]">
                <Bus size={14} />
              </span>
              <span className="text-[13px] font-bold text-[#1b3555]">{bus.name}</span>
              <span className="rounded-full bg-[#f1f3f5] px-2 py-0.5 text-[10px] font-bold text-[#657080]">
                {bus.count} peserta
              </span>
              {bus.attended > 0 && (
                <span className="rounded-full bg-[#e6f4ea] px-2 py-0.5 text-[10px] font-bold text-[#2ca84a]">
                  {bus.attended} hadir
                </span>
              )}
              <span className="ml-auto flex items-center gap-0.5">
                <span className="mr-1 text-[11px] font-semibold text-[#8a93a3]">
                  {bus.workers.length > 0 ? `${bus.workers.length} crew` : 'belum ada crew'}
                </span>
                <button
                  type="button"
                  onClick={() => setAddingTo((cur) => (cur === bus.id ? null : bus.id))}
                  title={`Tambah crew di ${bus.name}`}
                  className="rounded-full p-1.5 text-[#1b4f9c] transition-colors hover:bg-[#eef3fb]"
                >
                  <Plus size={14} />
                </button>
                <RenameArmada eventId={eventId} bus={bus} compact />
                <DeleteArmada eventId={eventId} bus={bus} compact />
              </span>
            </div>
            {bus.workers.length > 0 && (
              <div className="mt-1.5 pl-9">
                {bus.workers.map((w) => (
                  <WorkerRow key={w.id} eventId={eventId} busId={bus.id} worker={w} />
                ))}
              </div>
            )}
            {addingTo === bus.id && (
              <AddCrewForm eventId={eventId} bus={bus} onClose={() => setAddingTo(null)} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BusArmadaSection({ eventId, buses }: { eventId: string; buses: BusWithWorkersData[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedBuses = useMemo(
    // Urut ikut `buses` (bukan urutan klik) supaya daftar gabungan selalu rapi.
    () => buses.filter((b) => selectedIds.includes(b.id)),
    [buses, selectedIds],
  )
  const single = selectedBuses.length === 1 ? selectedBuses[0] : null
  const selectedCrew = useMemo(
    () => selectedBuses.reduce((s, b) => s + b.workers.length, 0),
    [selectedBuses],
  )

  return (
    <>
      <ArmadaPicker
        buses={buses}
        selectedIds={selectedIds}
        onToggle={(id) =>
          setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
        }
        onSelectAll={() => setSelectedIds(buses.map((b) => b.id))}
        onClear={() => setSelectedIds([])}
      />

      {selectedBuses.length > 0 && (
        <div className="animate-fade-up mt-2 rounded-2xl border border-[#1b4f9c]/30 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#1b3555]">
              Crew Unit{' '}
              <span className="text-[#1b4f9c]">
                {single ? single.name : `${selectedBuses.length} bus dipilih`}
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {/* Aksi unit ini per-bus, jadi hanya saat tepat satu bus dipilih. */}
              {single ? (
                <>
                  <span className="text-[11px] font-semibold text-[#657080]">
                    {single.count} peserta
                    {single.attended > 0 ? ` · ${single.attended} hadir` : ''}
                  </span>
                  <RenameArmada eventId={eventId} bus={single} />
                  <DeleteArmada eventId={eventId} bus={single} />
                </>
              ) : (
                <>
                  <span className="text-[11px] font-semibold text-[#657080]">
                    {selectedBuses.reduce((s, b) => s + b.count, 0)} peserta · {selectedCrew} crew
                  </span>
                  <DeleteBusesButton
                    eventId={eventId}
                    buses={selectedBuses}
                    allBusCount={buses.length}
                    onDone={() => setSelectedIds([])}
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]"
                title="Tutup"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {single ? (
            <BusCrewPanel eventId={eventId} bus={single} />
          ) : (
            <CombinedCrewPanel eventId={eventId} buses={selectedBuses} />
          )}
        </div>
      )}
    </>
  )
}

function RenameArmada({ eventId, bus, compact = false }: { eventId: string; bus: BusWithWorkersData; compact?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(bus.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const clean = name.trim()
    if (!clean || clean === bus.name) {
      setEditing(false)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${bus.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal mengubah nama unit.')
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah nama unit.')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          autoFocus
          className="w-32 rounded-full border border-[#1b4f9c]/40 bg-[#eef3fb] px-3 py-1 text-xs font-bold text-[#1b3555] outline-none focus:ring-2 focus:ring-[#1b4f9c]/30"
        />
        <button type="button" onClick={save} disabled={busy || !name.trim()} className="rounded-full p-1 text-[#1b4f9c] hover:bg-[#eef3fb] disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button type="button" onClick={() => { setEditing(false); setName(bus.name) }} className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]">
          <X size={13} />
        </button>
        {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setName(bus.name); setError(null); setEditing(true) }}
      title="Ubah nama unit"
      className={
        compact
          ? 'rounded-full p-1.5 text-[#657080] transition-colors hover:bg-[#f1f3f5]'
          : 'flex items-center gap-1 rounded-full border border-[#dfe4e8] px-2.5 py-1 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]'
      }
    >
      {compact ? <Pencil size={13} /> : <><Pencil size={11} /> Ubah nama</>}
    </button>
  )
}

function DeleteArmada({ eventId, bus, compact = false }: { eventId: string; bus: BusWithWorkersData; compact?: boolean }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${bus.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menghapus unit.')
      setConfirming(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus unit.')
    } finally {
      setBusy(false)
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 py-1 pr-2 pl-3">
        <span className="text-[11px] font-bold text-[#1b3555]">
          Hapus <span className="text-red-600">{bus.name}</span>?{bus.count > 0 && <span> {bus.count} peserta ikut terhapus.</span>}
        </span>
        <button type="button" onClick={remove} disabled={busy} className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-60">
          {busy ? <Loader2 size={11} className="animate-spin" /> : 'Ya'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-2 py-1 text-[11px] font-bold text-[#657080] hover:bg-white">
          Batal
        </button>
        {error && <span className="text-[11px] font-semibold text-red-600">{error}</span>}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      title="Hapus unit"
      className={
        compact
          ? 'rounded-full p-1.5 text-red-500 transition-colors hover:bg-red-50'
          : 'flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50'
      }
    >
      {compact ? <Trash2 size={13} /> : <><Trash2 size={11} /> Hapus unit</>}
    </button>
  )
}

function DeleteBusesButton({
  eventId,
  buses,
  allBusCount,
  onDone,
}: {
  eventId: string
  buses: BusWithWorkersData[]
  allBusCount: number
  onDone: () => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'selected' | 'all'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const participants = buses.reduce((s, b) => s + b.count, 0)
  const workers = buses.reduce((s, b) => s + b.workers.length, 0)
  const deletingAll = mode === 'all'
  // "Hapus semua" hanya masuk akal kalau memang masih ada bus yang tidak terpilih.
  const canDeleteAll = deletingAll || allBusCount > buses.length

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletingAll ? { all: true } : { busIds: buses.map((b) => b.id) }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menghapus bus.')
      setMode('idle')
      onDone()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus bus.')
    } finally {
      setBusy(false)
    }
  }

  if (mode !== 'idle') {
    return (
      <span className="flex flex-wrap items-center gap-1.5 rounded-full border border-red-200 bg-red-50 py-1 pr-2 pl-3">
        <span className="text-[11px] font-bold text-[#1b3555]">
          {deletingAll
            ? `Hapus semua ${allBusCount} bus?`
            : `Hapus ${buses.length} bus terpilih?`}
          {participants > 0 && (
            <span className="text-red-600"> {participants} peserta ikut terhapus.</span>
          )}
          {workers > 0 && <span className="text-red-600"> {workers} crew dilepas.</span>}
        </span>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : 'Ya'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('idle')
            setError(null)
          }}
          className="rounded-full px-2 py-1 text-[11px] font-bold text-[#657080] hover:bg-white"
        >
          Batal
        </button>
        {error && <span className="text-[11px] font-semibold text-red-600">{error}</span>}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setMode('selected')}
        title="Hapus semua bus yang dipilih sekaligus"
        className="flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
      >
        <Trash2 size={11} /> Hapus {buses.length} bus
      </button>
      {canDeleteAll && (
        <button
          type="button"
          onClick={() => setMode('all')}
          title="Hapus seluruh bus di event ini"
          className="rounded-full px-2 py-1 text-[11px] font-bold text-[#657080] hover:bg-[#fdf1f0] hover:text-red-600"
        >
          Hapus semua
        </button>
      )}
    </span>
  )
}

function WorkerRow({
  eventId,
  busId,
  worker,
}: {
  eventId: string
  busId: string
  worker: BusWorkerData
}) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(worker.user.phone ?? '')
  const [resetOpen, setResetOpen] = useState(false)
  // Password crew boleh diisi manual. Kalau dikosongkan, server mengembalikan
  // sandi ke pola username+1123.
  const [newPassword, setNewPassword] = useState('')
  const [usePattern, setUsePattern] = useState(!worker.user.customPassword)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(worker.user.name ?? '')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(worker.user.photoUrl)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tutup dropdown Edit saat klik di luar atau tekan Escape, supaya tidak
  // menghalangi baris lain dan tetap berperilaku seperti menu pada umumnya.
  useEffect(() => {
    if (!menuOpen) return
    function onDocDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Kalau baris ini lenyap karena dihapus, form yang masih terbuka tidak boleh
  // menggantung dengan state lama.
  useEffect(() => {
    setMenuOpen(false)
    setEditingPhone(false)
    setResetOpen(false)
    setNewPassword('')
    setUsePattern(!worker.user.customPassword)
    setRenaming(false)
    setConfirmRemove(false)
    setPhotoOpen(false)
    setPhotoUrl(worker.user.photoUrl)
  }, [worker.id, worker.user.photoUrl, worker.user.customPassword])

  function closeAll() {
    setMenuOpen(false)
    setEditingPhone(false)
    setResetOpen(false)
    setRenaming(false)
    setPhotoOpen(false)
  }

  async function uploadPhoto(file: File) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}/workers/${worker.id}/photo`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal mengunggah foto.')
      setPhotoUrl(data.url ?? null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removePhoto() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}/workers/${worker.id}/photo`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menghapus foto.')
      setPhotoUrl(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus foto.')
    } finally {
      setBusy(false)
    }
  }

  async function savePhone() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}/workers/${worker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Gagal mengubah nomor WA.')
      }
      setEditingPhone(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah nomor WA.')
    } finally {
      setBusy(false)
    }
  }

  async function saveName() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}/workers/${worker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Gagal mengganti nama crew.')
      }
      setRenaming(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengganti nama crew.')
    } finally {
      setBusy(false)
    }
  }

  async function removeWorker() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}/workers/${worker.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Gagal menghapus crew.')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus crew.')
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}/workers/${worker.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usePattern ? {} : { password: newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Gagal ganti password.')
      }
      setResetOpen(false)
      setNewPassword('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal ganti password.')
    } finally {
      setBusy(false)
    }
  }

  const menuBtn =
    'rounded-full border border-[#dfe4e8] px-2.5 py-1 text-[11px] font-bold text-[#1b4f9c] hover:bg-[#eef3fb]'

  return (
    <div className="border-b border-[#eef0f3] py-2 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={worker.user.name || worker.user.username}
            className="h-7 w-7 shrink-0 rounded-full border border-[#dfe4e8] object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e6f4ea] text-[10px] font-bold text-[#2ca84a]">
            {initialsOf(worker.user.name, worker.user.username)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-[#1b3555]">{worker.user.name || worker.user.username}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-[11px] font-semibold text-[#657080]">
            <span className="flex items-center gap-1">
              <UserIcon size={10} /> @{worker.user.username}
            </span>
            <span className="flex items-center gap-1">
              <Phone size={10} /> {worker.user.phone || '—'}
            </span>
            {worker.user.customPassword && (
              <span className="flex items-center gap-1 rounded-full bg-[#fff7e0] px-1.5 py-0.5 text-[10px] font-bold text-[#b98a12]">
                <KeyRound size={9} /> password manual
              </span>
            )}
          </p>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={menuBtn}
          >
            <Pencil size={11} className="inline" /> Edit{' '}
            <ChevronDown size={11} className={`inline transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[#e4e8ec] bg-white py-1 shadow-[0_12px_28px_-14px_rgba(16,32,58,0.45)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setEditingPhone(true)
                  setPhone(worker.user.phone ?? '')
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-bold text-[#1b3555] hover:bg-[#f4f7fb]"
              >
                <Phone size={12} className="shrink-0 text-[#1b4f9c]" /> Ubah Nomor WA
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setResetOpen(true)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-bold text-[#1b3555] hover:bg-[#f4f7fb]"
              >
                <KeyRound size={12} className="shrink-0 text-[#1b4f9c]" /> Ganti Password
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setRenaming(true)
                  setName(worker.user.name ?? '')
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-bold text-[#1b3555] hover:bg-[#f4f7fb]"
              >
                <Pencil size={12} className="shrink-0 text-[#1b4f9c]" /> Ganti Nama
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setPhotoOpen(true)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-bold text-[#1b3555] hover:bg-[#f4f7fb]"
              >
                <ImagePlus size={12} className="shrink-0 text-[#1b4f9c]" />
                {photoUrl ? 'Ganti Foto' : 'Tambah Foto'}
              </button>
            </div>
          )}
        </div>

        {confirmRemove ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={removeWorker}
              disabled={busy}
              className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : 'Ya, hapus'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="rounded-full px-2 py-1 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              closeAll()
              setConfirmRemove(true)
            }}
            className="rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={11} className="inline" /> Hapus
          </button>
        )}
      </div>

      {renaming && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl bg-[#f8fafc] p-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                saveName()
              }
            }}
            placeholder="Nama crew"
            className="w-44 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-semibold outline-none placeholder:text-[#9aa3af]"
          />
          <button
            type="button"
            onClick={saveName}
            disabled={busy || name.trim().length === 0}
            className="rounded-full bg-[#1b4f9c] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#143d79] disabled:opacity-60"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : 'Simpan'}
          </button>
          <button
            type="button"
            onClick={() => setRenaming(false)}
            className="rounded-full border border-[#dfe4e8] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
          >
            Batal
          </button>
          <p className="text-[11px] font-semibold text-[#657080]">Nama tampilan, username tidak berubah.</p>
        </div>
      )}

      {photoOpen && (
        <div className="mt-1 flex flex-wrap items-center gap-3 rounded-xl bg-[#f8fafc] p-3">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={worker.user.name || worker.user.username}
              className="h-20 w-20 rounded-xl border border-[#dfe4e8] object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-[#cfd6de] bg-white text-lg font-bold text-[#2ca84a]">
              {initialsOf(worker.user.name, worker.user.username)}
            </span>
          )}
          <div className="flex flex-col items-start gap-2">
            <p className="text-[11px] font-semibold text-[#657080]">JPG / PNG / WebP, maks 5 MB.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#143d79] disabled:opacity-60"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                {photoUrl ? 'Ganti Foto' : 'Unggah Foto'}
              </button>
              {photoUrl && (
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 size={12} /> Hapus Foto
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhotoOpen(false)}
                className="rounded-full px-2 py-1.5 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
              >
                Batal
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadPhoto(file)
              }}
            />
          </div>
        </div>
      )}

      {editingPhone && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl bg-[#f8fafc] p-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                savePhone()
              }
            }}
            placeholder="No WA"
            className="w-44 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-semibold outline-none placeholder:text-[#9aa3af]"
          />
          <button
            type="button"
            onClick={savePhone}
            disabled={busy}
            className="rounded-full bg-[#1b4f9c] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#143d79] disabled:opacity-60"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : 'Simpan'}
          </button>
          <button
            type="button"
            onClick={() => setEditingPhone(false)}
            className="rounded-full border border-[#dfe4e8] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
          >
            Batal
          </button>
        </div>
      )}

      {resetOpen && (
        <div className="mt-1 space-y-2 rounded-xl bg-[#f8fafc] p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] font-bold text-[#1b3555]">
              <input
                type="radio"
                name={`pw-mode-${worker.id}`}
                checked={usePattern}
                onChange={() => setUsePattern(true)}
                className="h-3.5 w-3.5 accent-[#1b4f9c]"
              />
              Pakai pola username+1123
              <span className="font-mono font-bold text-[#1b4f9c]">
                ({crewPassword(worker.user.username)})
              </span>
            </label>
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] font-bold text-[#1b3555]">
              <input
                type="radio"
                name={`pw-mode-${worker.id}`}
                checked={!usePattern}
                onChange={() => setUsePattern(false)}
                className="h-3.5 w-3.5 accent-[#1b4f9c]"
              />
              Password manual
            </label>
            {!usePattern && (
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newPassword.trim().length >= 6) resetPassword()
                  }
                }}
                autoFocus
                placeholder="Minimal 6 karakter"
                aria-label={`Password baru untuk ${worker.user.username}`}
                className="w-48 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 font-mono text-xs font-bold text-[#1b3555] outline-none placeholder:font-sans placeholder:font-semibold placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15"
              />
            )}
            {usePattern && (
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(crewPassword(worker.user.username))}
                className="rounded-full border border-[#dfe4e8] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
              >
                <Copy size={11} /> Salin
              </button>
            )}
            <button
              type="button"
              onClick={resetPassword}
              disabled={busy || (!usePattern && newPassword.trim().length < 6)}
              className="rounded-full bg-[#1b4f9c] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#143d79] disabled:opacity-60"
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={() => {
                setResetOpen(false)
                setNewPassword('')
              }}
              className="rounded-full border border-[#dfe4e8] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
            >
              Batal
            </button>
          </div>
          <p className="text-[10px] font-semibold text-[#8a93a3]">
            {worker.user.customPassword
              ? 'Crew ini memakai password manual — pola di atas tidak berlaku sampai kamu memilihnya lagi.'
              : 'Password crew hanya disimpan sebagai hash, jadi yang tampil di sini adalah pola, bukan hasil baca database.'}
          </p>
        </div>
      )}

      {confirmRemove && (
        <p className="mt-1 w-full text-[11px] font-semibold text-red-600">
          Crew dilepas dari bus ini. Akun ikut terhapus hanya kalau dia tidak jadi crew di bus lain.
        </p>
      )}

      {error && <p className="mt-1 w-full text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  )
}

// Form tambah crew dipisah dari trigger-nya supaya bisa dipakai ulang: di mode
// satu bus jadi tombol dashed penuh, di mode gabungan jadi ikon "+" per baris
// dengan form yang terbuka tepat di bawah baris yang dipilih.
function AddCrewForm({ eventId, bus, onClose }: { eventId: string; bus: BusWithWorkersData; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${bus.id}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menambah crew.')
      setForm({ name: '', phone: '', username: '', password: '' })
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah crew.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 rounded-xl bg-[#f8fafc] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-1 text-xs font-bold text-[#1b3555]">
          <Plus size={13} /> Tambah Crew Manual di <span className="text-[#1b4f9c]">{bus.name}</span>
        </p>
        <button
          type="button"
          onClick={() => { onClose(); setError(null) }}
          className="rounded-full p-1 text-[#657080] hover:bg-[#e8eef6]"
          title="Tutup form"
        >
          <X size={13} />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => {
            const name = e.target.value
            setForm((f) => ({ ...f, name, username: f.username || usernameFromName(name) }))
          }}
          required
          placeholder="Nama lengkap crew"
          className={inputCls}
        />
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="No WA (08xx)"
          className={inputCls}
        />
        <input
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          required
          placeholder="Username login"
          className={inputCls}
        />
        <div className="flex items-center gap-1.5 rounded-xl border border-[#eef0f3] bg-white px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[#9aa3af]">
            Password otomatis:{' '}
            <span className="font-mono font-bold text-[#1b4f9c]">
              {form.username.trim() ? crewPassword(form.username.trim()) : 'username + 1123'}
            </span>
          </p>
          <button
            type="button"
            disabled={!form.username.trim()}
            onClick={() => void navigator.clipboard?.writeText(crewPassword(form.username.trim()))}
            className="shrink-0 rounded-lg border border-[#dfe4e8] px-2 py-1 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5] disabled:opacity-50"
          >
            <Copy size={11} />
          </button>
        </div>
        <input
          type="text"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="Password manual (opsional, min 6 karakter)"
          aria-label="Password crew manual"
          className={inputCls}
        />
      </div>
      {form.password.trim().length > 0 && form.password.trim().length < 6 && (
        <p className="text-[11px] font-semibold text-amber-600">Password manual minimal 6 karakter.</p>
      )}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !form.name.trim() || !form.username.trim() || (form.password.trim().length > 0 && form.password.trim().length < 6)}
          className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Simpan Crew
        </button>
      </div>
    </form>
  )
}

function BusCrewPanel({ eventId, bus }: { eventId: string; bus: BusWithWorkersData }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">
        {bus.workers.length} crew bertugas di unit ini
      </p>
      {bus.workers.length === 0 ? (
        <p className="mt-1 text-xs text-[#657080]">Belum ada crew. Tambah manual atau pakai tombol Generate Akun Crew.</p>
      ) : (
        <div className="mt-1">
          {bus.workers.map((w) => (
            <WorkerRow key={w.id} eventId={eventId} busId={bus.id} worker={w} />
          ))}
        </div>
      )}

      {showForm ? (
        <AddCrewForm eventId={eventId} bus={bus} onClose={() => setShowForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#bfcbdc] bg-white py-2.5 text-xs font-bold text-[#657080] transition-colors hover:bg-[#f8fafc]"
        >
          <Plus size={13} /> Tambah Crew Manual
        </button>
      )}
    </div>
  )
}
