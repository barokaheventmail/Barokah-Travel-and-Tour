'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BedDouble, Loader2, Plus, X } from 'lucide-react'
import { MAX_ROOM_TYPE_NAME, type RoomTypeOption } from '@/lib/room-types'

/**
 * Pengelola daftar pilihan "Tipe Kamar" untuk satu event. Ditempatkan di atas
 * tabel Per Kamar. Setiap perubahan langsung disimpan dan menyegarkan daftar
 * (lewat `router.refresh`) supaya dropdown di seluruh halaman ikut terbarui.
 */
export function RoomTypeOptions({ eventId, roomTypes }: { eventId: string; roomTypes: RoomTypeOption[] }) {
  const router = useRouter()
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const name = draft.trim()
    if (!name || adding) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/room-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menambah tipe kamar.')
      setDraft('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah tipe kamar.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[#dfe4e8] bg-[#f8fafc] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#657080]">
        <BedDouble size={14} className="text-[#00A3E0]" /> Daftar Tipe Kamar
      </p>
      <p className="mt-0.5 text-[11px] text-[#9aa3af]">
        Simpan pilihan tipe kamar di sini, lalu cukup pilih pada kolom Tipe Kamar. Tipe baru dari import Excel ikut
        ditambahkan otomatis.
      </p>

      {roomTypes.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {roomTypes.map((rt) => (
            <RoomTypeRow key={rt.id} eventId={eventId} item={rt} onError={setError} onChanged={() => router.refresh()} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-semibold text-[#9aa3af]">Belum ada tipe kamar. Tambahkan di bawah.</p>
      )}

      <form onSubmit={add} className="mt-2 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_ROOM_TYPE_NAME}
          placeholder="Tambah tipe kamar, mis. Twin"
          disabled={adding}
          className="w-full max-w-xs rounded-lg border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#1b3555] outline-none placeholder:font-normal placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={adding || !draft.trim()}
          className="flex items-center gap-1 rounded-full bg-[#1b4f9c] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#143d79] active:scale-95 disabled:opacity-50"
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Tambah
        </button>
      </form>

      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function RoomTypeRow({
  eventId,
  item,
  onChanged,
  onError,
}: {
  eventId: string
  item: RoomTypeOption
  onChanged: () => void
  onError: (msg: string | null) => void
}) {
  const [val, setVal] = useState(item.name)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setVal(item.name)
    setFailed(false)
  }, [item.name])

  async function commit() {
    if (saving) return
    const next = val.trim()
    if (!next || next === item.name) {
      setVal(item.name)
      return
    }
    setSaving(true)
    setFailed(false)
    onError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/room-types/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan.')
      onChanged()
    } catch (err) {
      setFailed(true)
      setVal(item.name)
      onError(err instanceof Error ? err.message : 'Gagal menyimpan tipe kamar.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (saving) return
    setSaving(true)
    setFailed(false)
    onError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/room-types/${item.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menghapus.')
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menghapus tipe kamar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="relative flex items-center">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          } else if (e.key === 'Escape') {
            setVal(item.name)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        maxLength={MAX_ROOM_TYPE_NAME}
        disabled={saving}
        className={`w-28 rounded-full border py-1 pl-3 pr-6 text-[11px] font-bold text-[#1b3555] outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15 disabled:opacity-60 ${
          failed ? 'border-red-300 bg-red-50' : 'border-[#cdd8e2] bg-white focus:border-[#1b4f9c]'
        }`}
      />
      {saving ? (
        <Loader2 size={11} className="absolute right-2 animate-spin text-[#1b4f9c]" />
      ) : (
        <button
          type="button"
          onClick={remove}
          title={`Hapus ${item.name}`}
          className="absolute right-1.5 rounded-full p-0.5 text-[#b6bec8] transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <X size={11} />
        </button>
      )}
    </span>
  )
}
