'use client'

import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react'

type BannerItem = { id: string; imageUrl: string }

const MAX_BANNERS = 12

export function BannerManager({ initialBanners }: { initialBanners: BannerItem[] }) {
  const [banners, setBanners] = useState<BannerItem[]>(initialBanners)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const full = banners.length >= MAX_BANNERS

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    setError(null)
    setBusy('upload')
    try {
      const body = new FormData()
      for (const file of files) body.append('files', file)
      const res = await fetch('/api/admin/banners', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Gagal mengunggah banner.')
        return
      }
      setBanners(data.banners as BannerItem[])
    } catch {
      setError('Tidak dapat menghubungi server.')
    } finally {
      setBusy(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function onReplace(id: string, file: File) {
    setError(null)
    setBusy(id)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`/api/admin/banners/${id}`, { method: 'PATCH', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Gagal mengganti banner.')
        return
      }
      const updated = data.banner as BannerItem
      setBanners((prev) => prev.map((banner) => (banner.id === id ? updated : banner)))
    } catch {
      setError('Tidak dapat menghubungi server.')
    } finally {
      setBusy(null)
    }
  }

  async function onRemove(id: string) {
    setError(null)
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Gagal menghapus banner.')
        return
      }
      setBanners((prev) => prev.filter((banner) => banner.id !== id))
    } catch {
      setError('Tidak dapat menghubungi server.')
    } finally {
      setBusy(null)
    }
  }

  async function onMove(id: string, direction: -1 | 1) {
    const index = banners.findIndex((banner) => banner.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= banners.length) return

    const previous = banners
    const next = [...banners]
    ;[next[index], next[target]] = [next[target], next[index]]
    setBanners(next)
    setError(null)
    setBusy(id)
    try {
      const res = await fetch('/api/admin/banners/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next.map((banner) => banner.id) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBanners(previous)
        setError(data.error ?? 'Gagal menyimpan urutan banner.')
        return
      }
      setBanners(data.banners as BannerItem[])
    } catch {
      setBanners(previous)
      setError('Tidak dapat menghubungi server.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#1b3555]">Gambar Banner</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#657080]">
            Gambar tampil bergantian di bagian paling atas beranda. Gunakan JPG, PNG, atau WebP maksimal 5 MB.
            Ukuran ideal 1600 × 700 px.
          </p>
        </div>
        <label
          className={`flex shrink-0 items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#16407d] ${
            busy !== null || full ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'
          }`}
        >
          {busy === 'upload' ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {busy === 'upload' ? 'Mengunggah…' : full ? 'Banner penuh' : 'Tambah Banner'}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onPick}
            disabled={busy !== null || full}
          />
        </label>
      </div>

      <div className="mt-2 text-[11px] font-semibold text-[#9aa3af]">
        {banners.length} / {MAX_BANNERS} banner
      </div>

      {error && <p className="mt-3 rounded-lg bg-[#fdecec] px-3 py-2 text-xs font-semibold text-[#c0392b]">{error}</p>}

      {banners.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#bfd3c4] bg-[#fafbfc] p-8 text-center">
          <ImagePlus className="mx-auto text-[#9aa3af]" size={32} />
          <p className="mt-3 text-sm font-bold text-[#1b3555]">Belum ada banner khusus</p>
          <p className="mt-1 text-xs text-[#657080]">
            Beranda masih memakai gambar bawaan. Unggah banner untuk menggantinya.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {banners.map((banner, index) => {
            const disabled = busy !== null
            return (
              <div key={banner.id} className="overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-sm">
                <div className="relative aspect-[16/7] bg-[#f4f7fa]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.imageUrl} alt={`Banner ${index + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  {busy === banner.id && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                      <Loader2 size={22} className="animate-spin" />
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 p-3">
                  <label
                    className={`flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-bold text-[#1b3555] transition-colors duration-200 hover:bg-[#f1f3f5] ${
                      disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    <RefreshCw size={13} /> Ganti
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={disabled}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onReplace(banner.id, file)
                        e.target.value = ''
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => onMove(banner.id, -1)}
                    disabled={disabled || index === 0}
                    title="Naikkan urutan"
                    className="rounded-full border border-[#dfe4e8] bg-white p-2 text-[#657080] transition-colors duration-200 hover:bg-[#f1f3f5] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(banner.id, 1)}
                    disabled={disabled || index === banners.length - 1}
                    title="Turunkan urutan"
                    className="rounded-full border border-[#dfe4e8] bg-white p-2 text-[#657080] transition-colors duration-200 hover:bg-[#f1f3f5] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowDown size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(banner.id)}
                    disabled={disabled}
                    className="ml-auto flex items-center gap-1.5 rounded-full border border-[#f0c4c4] bg-white px-3 py-1.5 text-xs font-bold text-[#c0392b] transition-colors duration-200 hover:bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={13} /> Hapus
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
