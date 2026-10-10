'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

export function DeletePaket({ paketId }: { paketId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/paket-events/${paketId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menghapus paket.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus paket.')
    } finally {
      setLoading(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors duration-200 hover:bg-red-50 active:scale-95"
      >
        <Trash2 size={13} /> Hapus
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[#1b3555]">Hapus paket event ini beserta gambarnya?</span>
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
      <button
        type="button"
        onClick={remove}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-red-700 active:scale-95 disabled:opacity-60"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Ya, hapus
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-full border border-[#dfe4e8] px-3 py-1.5 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
      >
        Batal
      </button>
    </div>
  )
}