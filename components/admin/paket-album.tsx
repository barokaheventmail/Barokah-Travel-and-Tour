'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'

type AlbumImage = { id: string; url: string }

const MAX_ALBUM = 25

export function PaketAlbum({ paketId, initialImages }: { paketId: string; initialImages: AlbumImage[] }) {
  const [images, setImages] = useState<AlbumImage[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const full = images.length >= MAX_ALBUM

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      const body = new FormData()
      for (const file of files) body.append('files', file)
      const res = await fetch(`/api/admin/paket-events/${paketId}/images`, { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Gagal mengunggah gambar.')
        return
      }
      setImages(data.images as AlbumImage[])
    } catch {
      setError('Tidak dapat menghubungi server.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function onRemove(imageId: string) {
    setError(null)
    setRemovingId(imageId)
    try {
      const res = await fetch(`/api/admin/paket-events/${paketId}/images/${imageId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Gagal menghapus gambar.')
        return
      }
      setImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch {
      setError('Tidak dapat menghubungi server.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1b3555]">Gallery</h3>
          <p className="mt-0.5 text-xs text-[#657080]">
            Foto tambahan yang tampil di sisi kanan halaman detail. Maksimal {MAX_ALBUM} foto.
          </p>
        </div>
        <label
          className={`flex shrink-0 items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-bold text-[#1b3555] transition-colors duration-200 hover:bg-[#f1f3f5] ${
            uploading || full ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
          {uploading ? 'Mengunggah…' : full ? 'Gallery penuh' : 'Tambah Foto'}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onPick}
            disabled={uploading || full}
          />
        </label>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[#9aa3af]">
        <span>
          {images.length} / {MAX_ALBUM} foto
        </span>
      </div>

      {error && <p className="mt-2 rounded-lg bg-[#fdecec] px-3 py-2 text-xs font-semibold text-[#c0392b]">{error}</p>}

      {images.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-[#e0e4e8] bg-[#fafbfc] px-3 py-6 text-center text-xs text-[#9aa3af]">
          Belum ada foto album. Unggah beberapa foto sekaligus.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[#e0e4e8] bg-[#f4f7fa]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                disabled={removingId === img.id}
                aria-label="Hapus foto"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 disabled:opacity-100"
              >
                {removingId === img.id ? <Loader2 size={12} className="animate-spin" /> : <X size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
