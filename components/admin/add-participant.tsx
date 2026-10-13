'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, UserPlus, X } from 'lucide-react'
import { notifyParticipantAdded } from '@/lib/events'

export function AddParticipant({ eventId, buses }: { eventId: string; buses: { id: string; name: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', busName: buses[0]?.name ?? 'Bus 1', phone: '', seat: '', room: '', roomType: '', vw: '', jeepParis: '', jeepMerapi: '', jeepBromo: '', birthDate: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menambah peserta.')
      setForm({ name: '', busName: form.busName, phone: '', seat: '', room: '', roomType: '', vw: '', jeepParis: '', jeepMerapi: '', jeepBromo: '', birthDate: '' })
      notifyParticipantAdded()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah peserta.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-4 py-2 text-xs font-bold text-[#1b3555] transition-colors duration-200 hover:bg-[#f1f3f5] active:scale-95"
      >
        <UserPlus size={13} /> Tambah Peserta
      </button>
    )
  }

  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-[#657080]'

  const inputCls =
    'mt-1.5 w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-4 py-2.5 text-sm font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15'

  return (
    <form onSubmit={submit} className="animate-fade-up space-y-3 rounded-2xl border border-[#dfe4e8] bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1b3555]">Tambah Peserta Manual</h3>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]">
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Nama Lengkap</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Nama lengkap" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Unit / Bus</label>
          <select value={form.busName} onChange={(e) => set('busName', e.target.value)} className={inputCls}>
            {buses.length === 0 && <option value="Bus 1">Bus 1</option>}
            {buses.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>No Telp / HP</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="No Telp/HP" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>No Kursi</label>
          <input value={form.seat} onChange={(e) => set('seat', e.target.value)} placeholder="No Kursi" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>No Kamar</label>
          <input value={form.room} onChange={(e) => set('room', e.target.value)} placeholder="No Kamar" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tipe Kamar</label>
          <input value={form.roomType} onChange={(e) => set('roomType', e.target.value)} placeholder="Tipe Kamar" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>No VW</label>
          <input value={form.vw} onChange={(e) => set('vw', e.target.value)} placeholder="No VW" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Jeep Paris</label>
          <input value={form.jeepParis} onChange={(e) => set('jeepParis', e.target.value)} placeholder="No Jeep Paris" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Jeep Merapi</label>
          <input value={form.jeepMerapi} onChange={(e) => set('jeepMerapi', e.target.value)} placeholder="No Jeep Merapi" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Jeep Bromo</label>
          <input value={form.jeepBromo} onChange={(e) => set('jeepBromo', e.target.value)} placeholder="No Jeep Bromo" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tanggal Lahir</label>
          <input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} placeholder="Tanggal Lahir" className={inputCls} />
        </div>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]">
          Batal
        </button>
        <button
          type="submit"
          disabled={loading || !form.name.trim()}
          className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Simpan
        </button>
      </div>
    </form>
  )
}