'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Bus, Check, ImagePlus, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import {
  unitImageStyle,
  UNIT_IMAGE_POS_MAX,
  UNIT_IMAGE_POS_MIN,
  UNIT_IMAGE_ZOOM_MAX,
  UNIT_IMAGE_ZOOM_MIN,
} from '@/lib/seat'

const FIELD =
  'w-full rounded-xl border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#eef4fb]'

const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60'

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[#657080]">
        {label}
        <span className="tabular-nums text-[#1b4f9c]">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[#1b4f9c]"
      />
    </label>
  )
}

export function BusUnitIdentity({
  eventId,
  busId,
  busName,
  initialImageUrl,
  initialLabel,
  initialPosX,
  initialPosY,
  initialZoom,
}: {
  eventId: string
  busId: string
  busName: string
  initialImageUrl: string | null
  initialLabel: string | null
  initialPosX: number
  initialPosY: number
  initialZoom: number
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl)
  const [label, setLabel] = useState(initialLabel ?? '')
  const [posX, setPosX] = useState(initialPosX)
  const [posY, setPosY] = useState(initialPosY)
  const [zoom, setZoom] = useState(initialZoom)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingCrop, setSavingCrop] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const shownName = label.trim() || busName
  const imageStyle = unitImageStyle(posX, posY, zoom)

  async function upload(file: File) {
    setUploading(true)
    setStatus(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}/image`, { method: 'POST', body: form })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal mengunggah gambar.')
      setImageUrl(data.unitImageUrl ?? data.url ?? null)
      setStatus({ kind: 'ok', msg: `Gambar unit ${busName} tersimpan.` })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal mengunggah gambar.' })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function removeImage() {
    setUploading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}/image`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menghapus gambar.')
      setImageUrl(null)
      setStatus({ kind: 'ok', msg: 'Gambar unit dihapus.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menghapus gambar.' })
    } finally {
      setUploading(false)
    }
  }

  async function saveLabel() {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitLabel: label.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan nama unit.')
      setStatus({ kind: 'ok', msg: 'Nama unit tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan nama unit.' })
    } finally {
      setSaving(false)
    }
  }

  async function saveCrop() {
    setSavingCrop(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitImagePosX: posX, unitImagePosY: posY, unitImageZoom: zoom }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan posisi gambar.')
      setStatus({ kind: 'ok', msg: 'Posisi gambar tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan posisi gambar.' })
    } finally {
      setSavingCrop(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Bus size={18} className="text-[#1b4f9c]" />
        <h2 className="text-sm font-bold text-[#1b3555]">Gambar &amp; Nama Unit</h2>
        <span className="rounded-full bg-[#eef3fb] px-2.5 py-0.5 text-[11px] font-bold text-[#1b4f9c]">{busName}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#657080]">
        Muncul di panduan peserta, tepat di bawah Peta Kursi &amp; Daftar Nama. Gambar unit ditampilkan bulat, lalu nama unit
        di bawahnya dengan pita kuning. Atur posisi &amp; zoom agar bagian gambar yang tampil pas. JPG / PNG / WebP, maks 5 MB.
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-xl border border-[#dfe4e8] bg-[#f8fafc]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={`Gambar unit ${busName}`} className="h-40 w-full object-contain" />
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-[#9aa3af]">
                <ImagePlus size={22} />
                <span className="text-[11px] font-semibold">Belum ada gambar unit</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || saving || savingCrop}
              className={BTN_PRIMARY}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              {imageUrl ? 'Ganti Gambar' : 'Unggah Gambar'}
            </button>
            {imageUrl && (
              <button
                type="button"
                onClick={removeImage}
                disabled={uploading || saving || savingCrop}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-3 py-2 text-xs font-bold text-[#c0392b] transition-colors hover:bg-[#fdf1f0] active:scale-95 disabled:opacity-60"
              >
                <Trash2 size={13} /> Hapus Gambar
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload(file)
              }}
            />
          </div>

          {imageUrl && (
            <div className="mt-4 space-y-3 rounded-xl border border-[#edf0f3] bg-[#f8fafc] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Atur Gambar</p>
              <Slider label="Geser horizontal" value={posX} min={UNIT_IMAGE_POS_MIN} max={UNIT_IMAGE_POS_MAX} onChange={setPosX} />
              <Slider label="Geser vertikal" value={posY} min={UNIT_IMAGE_POS_MIN} max={UNIT_IMAGE_POS_MAX} onChange={setPosY} />
              <Slider label="Zoom" value={zoom} min={UNIT_IMAGE_ZOOM_MIN} max={UNIT_IMAGE_ZOOM_MAX} onChange={setZoom} />
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={saveCrop} disabled={savingCrop || uploading} className={BTN_PRIMARY}>
                  {savingCrop ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Simpan Posisi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPosX(50)
                    setPosY(50)
                    setZoom(100)
                  }}
                  disabled={savingCrop || uploading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-3 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#eef4fb] active:scale-95 disabled:opacity-60"
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <label htmlFor={`unit-label-${busId}`} className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">
            Nama unit (pita kuning)
          </label>
          <input
            id={`unit-label-${busId}`}
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 60))}
            placeholder={busName}
            maxLength={60}
            className={`${FIELD} mt-1.5`}
          />
          <p className="mt-1.5 text-[11px] text-[#9aa3af]">
            Diketik manual. Kalau dikosongkan, dipakai nama unit bawaan: <strong className="text-[#657080]">{busName}</strong>.
          </p>
          <div className="mt-3">
            <button type="button" onClick={saveLabel} disabled={saving || uploading || savingCrop} className={BTN_PRIMARY}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Simpan Nama
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-[#f8fafc] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9aa3af]">Pratinjau (seperti panduan peserta)</p>
            <div className="mt-2 flex flex-col items-center">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <span aria-hidden className="absolute -inset-5 rounded-full bg-[#1b4f9c]/30 blur-xl" />
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" style={imageStyle} />
                  ) : (
                    <span className="text-[10px] font-semibold text-[#9aa3af]">Belum ada gambar</span>
                  )}
                </div>
              </div>
              <div
                className="mt-1 inline-block max-w-full truncate bg-[#f5b915] px-5 py-1 text-xs font-extrabold uppercase tracking-wide text-white"
                style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%, 10px 50%)' }}
              >
                {shownName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {status && (
        <p
          className={`mt-3 rounded-xl px-4 py-2.5 text-xs font-semibold ${
            status.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {status.kind === 'ok' && <Check size={13} className="mr-1 inline" />}
          {status.msg}
        </p>
      )}
    </div>
  )
}
