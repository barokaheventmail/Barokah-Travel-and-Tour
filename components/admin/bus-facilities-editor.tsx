'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { FACILITY_ICONS, FacilityIconBadge } from '@/components/facility-icon'
import { ConfirmBulkDialog } from '@/components/admin/confirm-bulk-dialog'
import {
  FACILITY_ICON_GROUPS,
  FACILITY_ICON_LABELS,
  FACILITY_LAINNYA_PRESET,
  FACILITY_PRESETS,
  parseFacilities,
  type Facility,
} from '@/lib/facilities'

const FIELD =
  'w-full rounded-xl border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#eef4fb]'

export function BusFacilitiesEditor({
  eventId,
  busId,
  busName,
  initialFacilities,
  totalBuses,
  busesWithFacilities,
  onChange,
}: {
  eventId: string
  busId: string
  busName: string
  initialFacilities: string | null
  totalBuses: number
  busesWithFacilities: number
  onChange?: (items: Facility[]) => void
}) {
  const router = useRouter()
  const [items, setItems] = useState<Facility[]>(() => parseFacilities({ facilities: initialFacilities }))
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [bulkClearOpen, setBulkClearOpen] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [openPicker, setOpenPicker] = useState<number | null>(null)
  const nameRefs = useRef<(HTMLInputElement | null)[]>([])
  const pickerRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (openPicker === null) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (target && pickerRefs.current[openPicker]?.contains(target)) return
      setOpenPicker(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openPicker])

  useEffect(() => {
    onChange?.(items)
  }, [items, onChange])

  const filledCount = items.filter((item) => item.name.trim() !== '').length
  const blankCount = items.length - filledCount

  function update(index: number, patch: Partial<Facility>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function addItem(item: Facility, focusName = false) {
    const target = items.length
    setItems((prev) => [...prev, item])
    if (focusName) {
      requestAnimationFrame(() => nameRefs.current[target]?.focus())
    }
  }

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const temp = next[target]
      next[target] = next[index]
      next[index] = temp
      return next
    })
  }

  async function save(applyToAll: boolean) {
    setLoading(true)
    setStatus(null)
    const payload = items.filter((item) => item.name.trim() !== '')
    const skipped = items.length - payload.length
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilities: payload, applyToAll }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan fasilitas.')
      const base = applyToAll
        ? `${payload.length} fasilitas disimpan & diterapkan ke semua unit.`
        : `${payload.length} fasilitas untuk ${busName} tersimpan.`
      setStatus({ kind: 'ok', msg: skipped > 0 ? `${base} ${skipped} baris kosong dilewati.` : base })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan fasilitas.' })
    } finally {
      setLoading(false)
    }
  }

  async function clearFacilities() {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearFacilities: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus fasilitas.')
      setItems([])
      setConfirmClear(false)
      setStatus({ kind: 'ok', msg: `Fasilitas ${busName} dihapus.` })
      router.refresh()
    } catch (err) {
      setConfirmClear(false)
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menghapus fasilitas.' })
    } finally {
      setLoading(false)
    }
  }

  async function clearAllFacilities() {
    setLoading(true)
    setBulkError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearFacilities: true, applyToAll: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus fasilitas semua unit.')
      setItems([])
      setBulkClearOpen(false)
      setStatus({
        kind: 'ok',
        msg: `Fasilitas dihapus di ${(data.buses ?? 0).toLocaleString('id-ID')} unit.`,
      })
      router.refresh()
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Gagal menghapus fasilitas semua unit.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={18} className="text-[#d9a40c]" />
        <h2 className="text-sm font-bold text-[#1b3555]">Fasilitas Unit</h2>
        <span className="rounded-full bg-[#fffdf5] px-2.5 py-0.5 text-[11px] font-bold text-[#8a6a08]">{busName}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {blankCount > 0 && (
            <span className="rounded-full border border-[#f0dca8] bg-[#fffdf5] px-2.5 py-0.5 text-[11px] font-bold text-[#8a6a08]">
              +{blankCount} belum diisi
            </span>
          )}
          <span className="text-[11px] font-semibold text-[#9aa3af]">
            {filledCount} fasilitas
          </span>
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#657080]">
        Daftar fasilitas unit per unit — tiap unit bisa berbeda. Muncul di panduan peserta tepat di bawah Peta Kursi &amp;
        Daftar Nama, mengikuti unit yang dipilih peserta.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-6 text-center text-xs font-semibold text-[#9aa3af]">
          Belum ada fasilitas untuk {busName}. Pilih preset di bawah atau klik + Tambah Manual.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item, i) => {
            const isBlank = item.name.trim() === ''
            return (
            <div
              key={i}
              className={`rounded-xl border p-3 ${
                isBlank ? 'border-[#f0dca8] bg-[#fffdf5]' : 'border-[#e8ecf1] bg-[#fbfcfe]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#1b4f9c] text-[11px] font-bold tabular-nums text-white">
                  {i + 1}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Ikon</span>
                <div className="min-w-0 flex-1">
                  <div className="relative inline-block" ref={(el) => { pickerRefs.current[i] = el }}>
                    <button
                      type="button"
                      onClick={() => setOpenPicker((cur) => (cur === i ? null : i))}
                      aria-expanded={openPicker === i}
                      aria-label={`Ubah ikon baris ${i + 1}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe4e8] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#1b3555] transition-colors hover:bg-[#eef4fb] active:scale-95"
                    >
                      <span className="flex h-4 w-4 items-center justify-center text-[#1b4f9c]">
                        <FacilityIconBadge icon={item.icon} />
                      </span>
                      {FACILITY_ICON_LABELS[item.icon] ?? item.icon}
                      <ChevronDown size={12} className={openPicker === i ? 'rotate-180 text-[#1b4f9c]' : 'text-[#9aa3af]'} />
                    </button>

                    {openPicker === i && (
                      <div className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-[#dfe4e8] bg-white p-2 shadow-xl">
                        <div className="max-h-60 overflow-y-auto">
                          {FACILITY_ICON_GROUPS.map((group) => (
                            <div key={group.label} className="mb-1.5 last:mb-0">
                              <p className="sticky top-0 bg-white px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-[#9aa3af]">
                                {group.label}
                              </p>
                              <div className="grid grid-cols-7 gap-1">
                                {group.icons.map((key) => {
                                  const Icon = FACILITY_ICONS[key]
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => {
                                        update(i, { icon: key })
                                        setOpenPicker(null)
                                      }}
                                      aria-pressed={item.icon === key}
                                      aria-label={FACILITY_ICON_LABELS[key] ?? key}
                                      title={FACILITY_ICON_LABELS[key] ?? key}
                                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150 ${
                                        item.icon === key
                                          ? 'bg-[#1b4f9c] text-white'
                                          : 'bg-[#f8fafc] text-[#657080] ring-1 ring-inset ring-[#edf0f3] hover:bg-[#eef4fb] hover:text-[#1b4f9c]'
                                      }`}
                                    >
                                      <Icon size={13} />
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Naikkan urutan fasilitas"
                    className="rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-[#eef4fb] disabled:opacity-30"
                  >
                    <ChevronDown size={14} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    aria-label="Turunkan urutan fasilitas"
                    className="rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-[#eef4fb] disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, x) => x !== i))}
                    aria-label={`Hapus fasilitas ${item.name || i + 1}`}
                    className="rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  ref={(el) => {
                    nameRefs.current[i] = el
                  }}
                  value={item.name}
                  onChange={(e) => update(i, { name: e.target.value.slice(0, 60) })}
                  placeholder="Nama fasilitas (wajib), mis. AC"
                  aria-label={`Nama fasilitas baris ${i + 1}`}
                  maxLength={60}
                  className={isBlank ? `${FIELD} border-[#f0dca8] bg-white` : FIELD}
                />
                <input
                  value={item.note}
                  onChange={(e) => update(i, { note: e.target.value.slice(0, 160) })}
                  placeholder="Keterangan (opsional), mis. Pendingin kabin"
                  aria-label={`Keterangan fasilitas baris ${i + 1}`}
                  maxLength={160}
                  className={FIELD}
                />
              </div>
              {isBlank && (
                <p className="mt-1.5 text-[11px] font-semibold text-[#8a6a08]">
                  Isi nama fasilitas — baris kosong dilewati saat disimpan.
                </p>
              )}
            </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => addItem({ icon: 'armchair', name: '', note: '' }, true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#c6d2df] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:border-[#1b4f9c] hover:bg-[#eef4fb] active:scale-95"
        >
          <Plus size={12} /> Tambah Manual
        </button>
        <span aria-hidden className="mx-1 h-4 w-px shrink-0 self-center bg-[#e8ecf1]" />
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
          <Plus size={12} /> Preset
        </span>
        <button
          type="button"
          onClick={() => addItem({ ...FACILITY_LAINNYA_PRESET }, true)}
          title="Tambah baris kosong dengan ikon Lainnya (dll) untuk fasilitas di luar daftar preset"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] active:scale-95"
        >
          <FacilityIconBadge icon="ellipsis" />
          Lainnya
        </button>
        {FACILITY_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => addItem({ ...p })}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] active:scale-95"
          >
            <FacilityIconBadge icon={p.icon} />
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Simpan Fasilitas
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={loading}
          title="Menyalin daftar fasilitas ini ke semua unit lain di event"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-4 py-2.5 text-xs font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] active:scale-95 disabled:opacity-60"
        >
          Terapkan ke Semua Unit
        </button>
        <button
          type="button"
          onClick={() => (confirmClear ? clearFacilities() : setConfirmClear(true))}
          disabled={loading || items.length === 0}
          aria-label={confirmClear ? 'Konfirmasi hapus fasilitas' : 'Hapus semua fasilitas unit ini'}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-bold transition-colors active:scale-95 disabled:opacity-60 ${
            confirmClear
              ? 'border-[#c0392b] bg-[#c0392b] text-white hover:bg-[#a93226]'
              : 'border-[#dfe4e8] text-[#c0392b] hover:bg-[#fdf1f0]'
          }`}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          {confirmClear ? 'Yakin, hapus?' : 'Hapus Semua Fasilitas'}
        </button>
        <button
          type="button"
          onClick={() => {
            setBulkError(null)
            setBulkClearOpen(true)
          }}
          disabled={loading || busesWithFacilities === 0}
          title="Menghapus fasilitas di seluruh unit event ini sekaligus"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-4 py-2.5 text-xs font-bold text-[#c0392b] transition-colors hover:bg-[#fdf1f0] active:scale-95 disabled:opacity-60"
        >
          <Trash2 size={13} />
          Hapus di Semua Unit
        </button>
      </div>

      {status && (
        <p
          className={`mt-3 rounded-xl px-4 py-2.5 text-xs font-semibold ${
            status.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {status.kind === 'ok' && <Check size={13} className="mr-1 inline" />}
          {status.msg}
        </p>
      )}

      <ConfirmBulkDialog
        open={bulkClearOpen}
        title="Hapus fasilitas semua unit?"
        impact={`${busesWithFacilities.toLocaleString('id-ID')} dari ${totalBuses.toLocaleString('id-ID')} unit akan kehilangan daftar fasilitasnya.`}
        note="Kartu fasilitas langsung hilang dari panduan peserta, crew, dan unit untuk semua bus. Data peserta tidak ikut berubah."
        error={bulkError}
        confirmLabel="Ya, hapus semua"
        loading={loading}
        onConfirm={clearAllFacilities}
        onClose={() => {
          setBulkClearOpen(false)
          setBulkError(null)
        }}
      />
    </div>
  )
}
