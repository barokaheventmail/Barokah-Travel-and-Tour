'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'

export function PaketThumb({ paketId, imageUrl }: { paketId: string; imageUrl: string | null }) {
  const router = useRouter()
  const inputId = `paket-thumb-${paketId}`
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/admin/paket-events/${paketId}/image`, { method: 'POST', body: form })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal mengunggah gambar.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar.')
    } finally {
      setLoading(false)
    }
  }

  async function remove() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/paket-events/${paketId}/image`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menghapus gambar.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus gambar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group/thumb relative h-28 w-40 shrink-0">
      <label
        htmlFor={inputId}
        title={imageUrl ? 'Klik untuk ganti gambar' : 'Klik untuk unggah gambar'}
        className={`relative block h-full w-full cursor-pointer overflow-hidden rounded-xl border border-[#eef1f4] bg-[#f8fafc] transition-colors duration-200 hover:border-[#1b4f9c] ${loading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-[#9aa3af]">
            <ImagePlus size={18} /> Unggah gambar
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[11px] font-bold text-white opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100">
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Ganti gambar'}
        </span>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
            e.target.value = ''
          }}
        />
      </label>

      {imageUrl && !loading && (
        <button
          type="button"
          onClick={remove}
          title="Hapus gambar"
          className="absolute right-1 top-1 z-10 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity duration-200 hover:bg-red-600 group-hover/thumb:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      )}

      {error && (
        <p className="absolute -bottom-4 left-0 text-[10px] font-semibold text-red-600">{error}</p>
      )}
    </div>
  )
}
