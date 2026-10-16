'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, Loader2, Plus } from 'lucide-react'

export type EventFormData = {
  title: string
  date: string
  dateEnd: string
  location: string
  vwName: string
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  note: string
}

const emptyForm: EventFormData = { title: '', date: '', dateEnd: '', location: '', vwName: 'VW MAGELANG', status: 'ACTIVE', note: '' }

const labelCls = 'block text-[11px] font-bold uppercase tracking-wide text-[#657080]'
const inputCls =
  'mt-1.5 w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-3.5 py-2.5 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] font-medium text-[#9aa3af]">{hint}</p>}
    </div>
  )
}

export function EventForm({
  initial,
  onDone,
  compact,
}: {
  initial?: EventFormData & { id: string }
  onDone: () => void
  compact?: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState<EventFormData>(
    initial
      ? {
          title: initial.title,
          date: initial.date,
          dateEnd: initial.dateEnd ?? '',
          location: initial.location,
          vwName: initial.vwName ?? 'VW MAGELANG',
          status: initial.status,
          note: initial.note ?? '',
        }
      : emptyForm,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof EventFormData>(key: K, value: EventFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setDate(value: string) {
    setForm((f) => ({
      ...f,
      date: value,
      // Kalau tanggal selesai yang sudah terisi jadi lebih awal dari tanggal
      // mulai baru, reset supaya form tidak memunculkan error terselubung.
      dateEnd: f.dateEnd && value && f.dateEnd < value ? '' : f.dateEnd,
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.dateEnd && form.date && form.dateEnd < form.date) {
      setError('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(initial ? `/api/admin/events/${initial.id}` : '/api/admin/events', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dateEnd: form.dateEnd || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan.')
      router.refresh()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Judul Event">
        <input value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Open Trip Ancol–Dufan" className={inputCls} />
      </Field>

      <div className="rounded-2xl border border-[#dfe4e8] bg-[#f8fafc]/70 p-3.5">
        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1b4f9c]">
          <CalendarDays size={13} /> Waktu Pelaksanaan
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tanggal Mulai">
            <input type="date" value={form.date} onChange={(e) => setDate(e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Tanggal Selesai" hint="Kosongkan jika event hanya berlangsung 1 hari.">
            <input
              type="date"
              value={form.dateEnd}
              min={form.date || undefined}
              onChange={(e) => set('dateEnd', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <div className={compact ? 'grid gap-3.5 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2'}>
        <Field label="Lokasi">
          <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Graha Barokah" className={inputCls} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value as EventFormData['status'])} className={inputCls}>
            <option value="ACTIVE">Aktif</option>
            <option value="DRAFT">Draf</option>
            <option value="CLOSED">Selesai</option>
          </select>
        </Field>
      </div>

      <div className={compact ? 'grid gap-3.5 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2'}>
        <Field label="Nama VW (Denah VW)">
          <input value={form.vwName} onChange={(e) => set('vwName', e.target.value)} placeholder="VW MAGELANG" className={inputCls} />
        </Field>
        <Field label="Catatan" hint="Opsional — tampil sebagai info tambahan di halaman publik.">
          <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Contoh: kuota penuh" className={inputCls} />
        </Field>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-[#edf0f3] pt-4">
        <button type="button" onClick={onDone} className="rounded-full border border-[#dfe4e8] bg-white px-4 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#f1f3f5]">
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {initial ? 'Simpan Perubahan' : 'Buat Event'}
        </button>
      </div>
    </form>
  )
}
