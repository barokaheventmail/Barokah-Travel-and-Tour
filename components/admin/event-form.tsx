'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

export type EventFormData = {
  title: string
  date: string
  location: string
  vwName: string
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  note: string
}

const emptyForm: EventFormData = { title: '', date: '', location: '', vwName: 'VW MAGELANG', status: 'ACTIVE', note: '' }

function toLocalInput(dateStr: string | null): string {
  const d = dateStr ? new Date(dateStr) : null
  if (!d || isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(initial ? `/api/admin/events/${initial.id}` : '/api/admin/events', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  const inputCls =
    'mt-1.5 w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-4 py-2.5 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#657080]">Judul Event</label>
        <input value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Open Trip Ancol–Dufan" className={inputCls} />
      </div>
      <div className={compact ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2'}>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#657080]">Tanggal & Jam</label>
          <input type="datetime-local" value={form.date} onChange={(e) => set('date', e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#657080]">Lokasi</label>
          <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Graha Barokah" className={inputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#657080]">Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value as EventFormData['status'])} className={inputCls}>
            <option value="ACTIVE">Aktif</option>
            <option value="DRAFT">Draf</option>
            <option value="CLOSED">Selesai</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#657080]">Nama VW (Denah VW)</label>
          <input value={form.vwName} onChange={(e) => set('vwName', e.target.value)} placeholder="VW MAGELANG" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#657080]">Catatan (opsional)</label>
        <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Contoh: kuota penuh" className={inputCls} />
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]">
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

export { toLocalInput }