'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Loader2, MessageSquareText } from 'lucide-react'
import { UnitTargetPicker, type TargetMode } from '@/components/admin/unit-target-picker'

const FIELD =
  'w-full rounded-xl border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#eef4fb]'

const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60'

export function DenahDudukCaptions({
  eventId,
  eventTitle,
  denahDudukTitle,
  busId,
  busName,
  buses,
  initialKeterangan,
  initialKeterangan2,
}: {
  eventId: string
  /** Judul event — default keterangan orange bila dikosongkan. */
  eventTitle: string
  /** Judul utama halaman Denah Duduk (event-level). */
  denahDudukTitle?: string
  busId: string
  busName: string
  buses: { id: string; name: string }[]
  initialKeterangan: string
  initialKeterangan2: string
}) {
  const router = useRouter()
  const [keterangan, setKeterangan] = useState(initialKeterangan)
  const [keterangan2, setKeterangan2] = useState(initialKeterangan2)
  const [scope, setScope] = useState<{ mode: TargetMode; ids: string[] }>({ mode: 'one', ids: [busId] })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const allSelected = scope.mode === 'all'
  const noTarget = scope.mode === 'some' && scope.ids.length === 0
  const previewTitle = (denahDudukTitle ?? '').trim() || 'Denah Duduk'
  const orangePreview = keterangan.trim() || eventTitle
  const greenPreview = keterangan2.trim() || busName
  const hasPreview = orangePreview.length > 0 || greenPreview.length > 0
  const handleScopeChange = (ids: string[], mode: TargetMode) => setScope({ mode, ids })

  async function save() {
    if (noTarget) {
      setStatus({ kind: 'err', msg: 'Pilih minimal satu unit tujuan.' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const body: Record<string, unknown> = {
        denahDudukKeterangan: keterangan.trim() || null,
        denahDudukKeterangan2: keterangan2.trim() || null,
      }
      if (allSelected) body.applyToAll = true
      else body.busIds = scope.ids

      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan keterangan.')
      const count = allSelected ? buses.length : scope.ids.length
      setStatus({ kind: 'ok', msg: `Keterangan tersimpan ke ${count.toLocaleString('id-ID')} unit.` })
      setScope({ mode: 'one', ids: [busId] })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan keterangan.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <MessageSquareText size={18} className="text-[#1b4f9c]" />
        <h2 className="text-sm font-bold text-[#1b3555]">Keterangan Denah Duduk</h2>
        <span className="rounded-full bg-[#eef3fb] px-2.5 py-0.5 text-[11px] font-bold text-[#1b4f9c]">{busName}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#657080]">
        Tampil di sebelah kanan judul <strong className="text-[#657080]">{previewTitle}</strong> pada panduan peserta, dipisah
        garis vertikal. Keterangan pertama berwarna orange, keterangan kedua berwarna hijau. Keterangan 1 otomatis berisi
        judul event dan Keterangan 2 otomatis berisi nama unit bila dikosongkan. Simpan bisa ke unit ini saja, beberapa unit,
        atau semua unit.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="denah-ket-1" className="text-[11px] font-bold uppercase tracking-wide text-[#e8830c]">
            Keterangan 1 (orange)
          </label>
          <input
            id="denah-ket-1"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value.slice(0, 200))}
            placeholder={eventTitle ? `Otomatis: ${eventTitle}` : 'mis. Duduk sesuai nomor kursi'}
            maxLength={200}
            className={`${FIELD} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="denah-ket-2" className="text-[11px] font-bold uppercase tracking-wide text-[#2ca84a]">
            Keterangan 2 (hijau)
          </label>
          <input
            id="denah-ket-2"
            value={keterangan2}
            onChange={(e) => setKeterangan2(e.target.value.slice(0, 200))}
            placeholder={`Otomatis: ${busName}`}
            maxLength={200}
            className={`${FIELD} mt-1.5`}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#f8fafc] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9aa3af]">Pratinjau</p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <span className="text-4xl font-extrabold uppercase tracking-wide text-[#00A3E0]">{previewTitle}</span>
          {hasPreview && (
            <div className="flex items-center gap-3">
              <span aria-hidden className="h-9 w-0.5 shrink-0 bg-[#00A3E0]" />
              <div className="flex flex-col text-left leading-tight">
                {orangePreview && <p className="text-2xl font-bold uppercase tracking-wide text-[#e8830c]">{orangePreview}</p>}
                {greenPreview && <p className="text-2xl font-bold uppercase tracking-wide text-[#2ca84a]">{greenPreview}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <UnitTargetPicker
          buses={buses}
          currentId={busId}
          mode={scope.mode}
          targets={scope.ids}
          onChange={handleScopeChange}
          disabled={saving}
        />
      </div>

      <div className="mt-4">
        <button type="button" onClick={save} disabled={saving || noTarget} className={BTN_PRIMARY}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Simpan Keterangan
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
    </div>
  )
}
