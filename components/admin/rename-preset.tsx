'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'

export function RenamePreset({ presetId, initialName }: { presetId: string; initialName: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Nama preset wajib diisi.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/presets/${presetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal mengubah nama preset.')
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah nama preset.')
    } finally {
      setLoading(false)
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(initialName)
          setEditing(true)
        }}
        className="flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-bold text-[#1b3555] transition-colors duration-200 hover:bg-[#f1f3f5] active:scale-95"
      >
        <Pencil size={13} /> Ubah Nama
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 200))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') setEditing(false)
        }}
        autoFocus
        maxLength={200}
        aria-label="Nama preset"
        className="w-52 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#1b3555] outline-none focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#eef4fb]"
      />
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-3 py-1.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Simpan
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="flex items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
      >
        <X size={13} /> Batal
      </button>
    </div>
  )
}
