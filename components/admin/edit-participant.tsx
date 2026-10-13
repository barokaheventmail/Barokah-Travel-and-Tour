'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Pencil, X } from 'lucide-react'
import { toISOInput } from '@/lib/dates'
import { notifyParticipantsChanged } from '@/lib/events'

export type RowBus = { id: string; name: string; order: number }
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
  scannedBy: { username: string } | null
}

export function EditParticipant({ eventId, participant, buses }: { eventId: string; participant: RowParticipant; buses: RowBus[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    birthPlace: '',
    birthDate: '',
    phone: '',
    seat: '',
    room: '',
    roomType: '',
    vw: '',
    jeepParis: '',
    jeepMerapi: '',
    jeepBromo: '',
    busId: '',
    order: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setForm({
      name: participant.name,
      birthPlace: participant.birthPlace ?? '',
      birthDate: participant.birthDate ? toISOInput(new Date(participant.birthDate)) : '',
      phone: participant.phone ?? '',
      seat: participant.seat ?? '',
      room: participant.room ?? '',
      roomType: participant.roomType ?? '',
      vw: participant.vw ?? '',
      jeepParis: participant.jeepParis ?? '',
      jeepMerapi: participant.jeepMerapi ?? '',
      jeepBromo: participant.jeepBromo ?? '',
      busId: participant.busId,
      order: String(participant.order),
    })
    setError(null)
    setOpen(true)
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, string | number | null> = {
        name: form.name.trim(),
        birthPlace: form.birthPlace.trim(),
        birthDate: form.birthDate || null,
        phone: form.phone.trim(),
        seat: form.seat.trim(),
        room: form.room.trim(),
        roomType: form.roomType.trim(),
        vw: form.vw.trim(),
        jeepParis: form.jeepParis.trim(),
        jeepMerapi: form.jeepMerapi.trim(),
        jeepBromo: form.jeepBromo.trim(),
        busId: form.busId,
        order: Number(form.order),
      }
      const res = await fetch(`/api/admin/events/${eventId}/participants/${participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal memperbarui peserta.')
      setOpen(false)
      notifyParticipantsChanged()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui peserta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Edit peserta"
        className="rounded-full p-2 text-[#657080] transition-colors duration-200 hover:bg-[#eef3fb] hover:text-[#1b4f9c]"
      >
        <Pencil size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-up w-full max-w-lg rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1b3555]">Edit Peserta</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]">
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Nama Lengkap</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                  placeholder="Nama lengkap"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Tempat Lahir</label>
                <input value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} placeholder="Tempat lahir" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tanggal Lahir</label>
                <input value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} type="date" placeholder="Tanggal lahir" className={inputCls} />
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
                <label className={labelCls}>Unit / Bus</label>
                <select value={form.busId} onChange={(e) => set('busId', e.target.value)} className={inputCls}>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Nomor Urut</label>
                <input
                  value={form.order}
                  onChange={(e) => set('order', e.target.value)}
                  type="number"
                  min={1}
                  required
                  placeholder="Nomor urut"
                  className={inputCls}
                />
              </div>
            </div>

            {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />} Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-[#657080]'

const inputCls =
  'mt-1.5 w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-4 py-2.5 text-sm font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15'