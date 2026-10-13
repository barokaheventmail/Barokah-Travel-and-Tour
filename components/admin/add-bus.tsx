'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Bus, Loader2, Plus, X } from 'lucide-react'
import { useModal } from '@/components/admin/use-modal'

const QUICK_UNITS = [
  { name: 'Jeep Merapi', capacity: 4 },
  { name: 'Jeep Paris', capacity: 4 },
  { name: 'Jeep Bromo', capacity: 5 },
] as const

type AddBusProps = {
  eventId: string
  // 'button' = pemicunya ikut dirender (dipakai saat panel unit masih kosong).
  // 'modal'  = hanya layarnya; pemicunya dibuat oleh ActionMenu.
  mode?: 'button' | 'modal'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddBus({ eventId, mode = 'button', open: controlledOpen, onOpenChange }: AddBusProps) {
  const router = useRouter()
  const [open, setOpen] = useModal(controlledOpen, onOpenChange)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setOpen(false)
    setName('')
    setError(null)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menambah bus.')
      setName('')
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah bus.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {mode === 'button' && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-4 py-2.5 text-xs font-bold text-[#1b3555] transition-colors duration-200 hover:bg-[#f1f3f5] active:scale-95"
        >
          <Plus size={13} /> Tambah Bus
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="animate-fade-up flex w-full max-w-sm flex-col rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1b3555]">Tambah Bus</h3>
              <button type="button" onClick={close} className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={add} className="mt-4">
              <label className="flex items-center gap-2 text-xs font-bold text-[#1b3555]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef3fb] text-[#1b4f9c]">
                  <Bus size={14} />
                </span>
                Nama unit
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Bus 3"
                autoFocus
                className="mt-2 w-full rounded-full border border-[#dfe4e8] bg-[#f8fafc] px-4 py-2.5 text-sm font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
              />
              <p className="mt-2 text-[11px] font-semibold text-[#657080]">
                Nama ini dipakai untuk mengelompokkan peserta dan crew. Bisa diubah nanti.
              </p>

              <div className="mt-3">
                <p className="text-[11px] font-semibold text-[#657080]">Pilihan cepat</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_UNITS.map((u) => {
                    const selected = name.trim() === u.name
                    return (
                      <button
                        key={u.name}
                        type="button"
                        onClick={() => setName(u.name)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                          selected
                            ? 'border-[#1b4f9c] bg-[#eef4fb] text-[#1b4f9c]'
                            : 'border-[#dfe4e8] text-[#657080] hover:bg-[#f1f3f5]'
                        }`}
                      >
                        {u.name} · {u.capacity} orang
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">{error}</p>}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
