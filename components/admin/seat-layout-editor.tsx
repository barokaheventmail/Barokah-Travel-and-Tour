'use client'

import { useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'
import { Armchair, Check, ChevronDown, Loader2, Minus, Plus, Trash2, Users } from 'lucide-react'
import { BusFacilitiesEditor } from '@/components/admin/bus-facilities-editor'
import { ConfirmBulkDialog } from '@/components/admin/confirm-bulk-dialog'
import {
  parseSeatLayout,
  rowFirstSeat,
  seatCount,
  seatNumberMatrix,
  toggleCell,
  toggleCol,
  toggleRow,
  type SeatLayout,
} from '@/lib/seat'

export type SeatBus = {
  id: string
  name: string
  count: number
  seatRows: number
  seatCols: number
  seatLayout: string | null
  facilities: string | null
}

const MIN = 1
const MAX = 24

function resizeCells(prev: number[][], rows: number, cols: number): number[][] {
  const out: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) row.push(Math.max(0, Math.floor(prev[r]?.[c] ?? 0)))
    out.push(row)
  }
  return out
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(MIN, value - 1))}
        disabled={value <= MIN}
        aria-label={`Kurangi ${label}`}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dfe4e8] text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] disabled:opacity-40"
      >
        <Minus size={13} />
      </button>
      <span className="w-6 text-center text-sm font-bold tabular-nums text-[#1b3555]">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX, value + 1))}
        disabled={value >= MAX}
        aria-label={`Tambah ${label}`}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dfe4e8] text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] disabled:opacity-40"
      >
        <Plus size={13} />
      </button>
    </div>
  )
}

export function SeatLayoutEditor({ eventId, buses }: { eventId: string; buses: SeatBus[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(buses[0]?.id ?? null)
  const selected = buses.find((b) => b.id === selectedId) ?? null
  const [layout, setLayout] = useState<SeatLayout>(() =>
    selected ? parseSeatLayout(selected) : { rows: 0, cols: 0, cells: [] },
  )
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [bulkClearOpen, setBulkClearOpen] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const numbers = seatNumberMatrix(layout.rows, layout.cols, layout.cells)
  const active = seatCount(layout.cells)
  const busesWithLayout = buses.filter((b) => b.seatRows > 0 || b.seatCols > 0 || b.seatLayout).length
  const busesWithFacilities = buses.filter((b) => b.facilities).length

  function selectBus(bus: SeatBus) {
    setSelectedId(bus.id)
    setLayout(parseSeatLayout(bus))
    setStatus(null)
    setConfirmClear(false)
    setBulkClearOpen(false)
    setBulkError(null)
  }

  function setDims(rows: number, cols: number) {
    const r = Math.min(MAX, Math.max(MIN, rows))
    const c = Math.min(MAX, Math.max(MIN, cols))
    setLayout((prev) => ({ rows: r, cols: c, cells: resizeCells(prev.cells, r, c) }))
  }

  function setRows(v: number) {
    setDims(v, layout.cols)
  }

  function setCols(v: number) {
    setDims(layout.rows, v)
  }

  function toggle(r: number, c: number) {
    setLayout((prev) => ({ ...prev, cells: toggleCell(prev.cells, r, c) }))
  }

  function toggleRowClick(r: number) {
    setLayout((prev) => ({ ...prev, cells: toggleRow(prev.cells, r) }))
  }

  function toggleColClick(c: number) {
    setLayout((prev) => ({ ...prev, cells: toggleCol(prev.cells, c) }))
  }

  async function save(applyToAll: boolean) {
    if (!selected) return
    if (!selectedId) return
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatRows: layout.rows,
          seatCols: layout.cols,
          seatLayout: layout.cells,
          applyToAll,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan layout.')
      setStatus({ kind: 'ok', msg: applyToAll ? 'Layout disimpan & diterapkan ke semua unit.' : 'Layout kursi tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan layout.' })
    } finally {
      setLoading(false)
    }
  }

  async function clearSeatLayout() {
    if (!selected) return
    if (!selectedId) return
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearSeatLayout: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus layout kursi.')
      setLayout({ rows: 0, cols: 0, cells: [] })
      setConfirmClear(false)
      setStatus({ kind: 'ok', msg: 'Layout kursi unit ini dihapus.' })
      router.refresh()
    } catch (err) {
      setConfirmClear(false)
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menghapus layout kursi.' })
    } finally {
      setLoading(false)
    }
  }

  async function clearAllSeatLayouts() {
    if (!selectedId) return
    setLoading(true)
    setBulkError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearSeatLayout: true, applyToAll: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus layout kursi semua unit.')
      setLayout({ rows: 0, cols: 0, cells: [] })
      setBulkClearOpen(false)
      setStatus({
        kind: 'ok',
        msg: `Layout kursi dihapus di ${(data.buses ?? 0).toLocaleString('id-ID')} unit.`,
      })
      router.refresh()
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Gagal menghapus layout kursi semua unit.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Armchair size={18} className="text-[#1b4f9c]" />
          <h2 className="text-sm font-bold text-[#1b3555]">Layout Kursi</h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#657080]">
          Atur grid kursi per unit seperti membuat tabel: tentukan Baris × Kolom, lalu klik kursi untuk mengaktifkan.
          Nomor kursi mengikuti urutan klik &mdash; baris 3 lalu 1 lalu 2 menghasilkan [3, 1, 2], bukan [1, 2, 3].
          Klik kotak biru di tepi atas atau tepi kiri untuk menyalakan/mematikan seluruh kolom atau baris sekaligus.
          Posisi kotak yang diklik akan konsisten & dipakai di peta kursi crew.
        </p>
      </div>

      {buses.length === 0 ? (
        <p className="rounded-xl bg-[#f8fafc] px-4 py-6 text-center text-xs font-semibold text-[#9aa3af]">
          Belum ada unit. Tambah bus terlebih dahulu di tab Bus & Unit.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Pilih Unit</span>
            <div className="relative w-full max-w-xs">
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  const bus = buses.find((b) => b.id === e.target.value)
                  if (bus) selectBus(bus)
                }}
                aria-label="Pilih unit"
                className="w-full cursor-pointer appearance-none rounded-full border border-[#dfe4e8] bg-white py-2 pl-4 pr-9 text-xs font-bold text-[#1b3555] outline-none transition-colors hover:bg-[#eef4fb]"
              >
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa3af]" />
            </div>
          </div>

          {selected && (
            <>
              <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <Stepper label="Baris" value={layout.rows || MIN} onChange={setRows} />
                    <Stepper label="Kolom" value={layout.cols || MIN} onChange={setCols} />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-[#eef3fb] px-3 py-1 text-[11px] font-bold text-[#1b4f9c]">
                    <Users size={12} /> {active} kursi aktif · {selected.count} peserta
                  </div>
                </div>

                <div className="mt-4 flex justify-center">
                  {layout.rows === 0 || layout.cols === 0 ? (
                    <p className="w-full max-w-xl rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center text-xs font-semibold text-[#9aa3af]">
                      Belum ada layout — atur Baris & Kolom untuk mulai menyusun kursi.
                    </p>
                  ) : (
                  <div
                    className="grid w-full max-w-xl gap-1.5 sm:gap-2"
                    style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
                  >
                    {numbers.map((row, r) =>
                      row.map((n, c) => {
                        const isActive = (layout.cells[r]?.[c] ?? 0) > 0
                        return (
                          <button
                            key={`${r}-${c}`}
                            type="button"
                            onClick={(e) => (e.shiftKey ? toggleRowClick(r) : toggle(r, c))}
                            aria-pressed={isActive}
                            aria-label={`Kursi baris ${r + 1} kolom ${c + 1}${n !== null ? ` (nomor ${n})` : ''}`}
                            title={isActive ? 'Klik untuk mematikan, Shift+klik untuk mematikan sebaris' : 'Klik untuk menyalakan, Shift+klik untuk menyalakan sebaris'}
                            className={`flex aspect-square min-w-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums leading-none transition-colors duration-150 ${
                              isActive
                                ? 'bg-[#1b4f9c] text-white shadow-sm hover:bg-[#143d79] active:scale-95'
                                : 'bg-[#eef1f4] text-[#9aa3af] hover:bg-[#e3e8ee] active:scale-95'
                            }`}
                          >
                            {n}
                          </button>
                        )
                      }),
                    )}
                  </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-[11px] font-semibold text-[#657080]">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded bg-[#1b4f9c]" /> Aktif (nomor {active > 0 ? `1–${active}` : '—'})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded bg-[#eef1f4]" /> Nonaktif
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded bg-[#eef3fb]" /> Tepi birat = tombol baris/kolom
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => save(false)}
                      disabled={loading || layout.rows === 0 || layout.cols === 0}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
                    >
                      {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Simpan Layout
                    </button>
                    <button
                      type="button"
                      onClick={() => save(true)}
                      disabled={loading || layout.rows === 0 || layout.cols === 0}
                      title="Menyalin layout ini ke semua unit lain di event"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-4 py-2.5 text-xs font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] active:scale-95 disabled:opacity-60"
                    >
                      Terapkan ke Semua Unit
                    </button>
                    <button
                      type="button"
                      onClick={() => (confirmClear ? clearSeatLayout() : setConfirmClear(true))}
                      disabled={loading || layout.rows === 0 || layout.cols === 0}
                      aria-label={confirmClear ? 'Konfirmasi hapus layout kursi' : 'Hapus layout kursi unit ini'}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-bold transition-colors active:scale-95 disabled:opacity-60 ${
                        confirmClear
                          ? 'border-[#c0392b] bg-[#c0392b] text-white hover:bg-[#a93226]'
                          : 'border-[#dfe4e8] text-[#c0392b] hover:bg-[#fdf1f0]'
                      }`}
                    >
                      {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      {confirmClear ? 'Yakin, hapus?' : 'Hapus Semua Kursi'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkError(null)
                        setBulkClearOpen(true)
                      }}
                      disabled={loading || busesWithLayout === 0}
                      title="Menghapus layout kursi di seluruh unit event ini sekaligus"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-4 py-2.5 text-xs font-bold text-[#c0392b] transition-colors hover:bg-[#fdf1f0] active:scale-95 disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                      Hapus di Semua Unit
                    </button>
                  </div>
                </div>

                {status && (
                  <p className={`mt-3 rounded-xl px-4 py-2.5 text-xs font-semibold ${status.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {status.kind === 'ok' && <Check size={13} className="mr-1 inline" />}
                    {status.msg}
                  </p>
                )}
              </div>
            </>
          )}

          {selected && (
            <BusFacilitiesEditor
              key={selected.id}
              eventId={eventId}
              busId={selected.id}
              busName={selected.name}
              initialFacilities={selected.facilities}
              totalBuses={buses.length}
              busesWithFacilities={busesWithFacilities}
            />
          )}

          <ConfirmBulkDialog
            open={bulkClearOpen}
            title="Hapus layout kursi semua unit?"
            impact={`${busesWithLayout.toLocaleString('id-ID')} dari ${buses.length.toLocaleString('id-ID')} unit akan kehilangan layout kursinya.`}
            note="Nomor kursi peserta tidak ikut terhapus, jadi saat layout dibuat ulang penomoran kembali otomatis. Peta kursi peserta & crew langsung kosong sampai itu terjadi."
            error={bulkError}
            confirmLabel="Ya, hapus semua"
            loading={loading}
            onConfirm={clearAllSeatLayouts}
            onClose={() => {
              setBulkClearOpen(false)
              setBulkError(null)
            }}
          />
        </>
      )}
    </div>
  )
}