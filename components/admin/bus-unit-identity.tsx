'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, type PointerEvent } from 'react'
import { Bus, Check, ImagePlus, Loader2, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import {
  clampUnitImageZoom,
  formatUnitImageZoom,
  unitImageStyle,
  UNIT_IMAGE_ZOOM_MAX,
  UNIT_IMAGE_ZOOM_MIN,
  UNIT_IMAGE_ZOOM_STEP,
} from '@/lib/seat'

const FIELD =
  'w-full rounded-xl border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#eef4fb]'

const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60'

const clampPos = (v: number) => Math.max(0, Math.min(100, v))

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
  const boxRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl)
  const [label, setLabel] = useState(initialLabel ?? '')
  const [posX, setPosX] = useState(clampPos(initialPosX))
  const [posY, setPosY] = useState(clampPos(initialPosY))
  const [zoom, setZoom] = useState(clampUnitImageZoom(initialZoom))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingCrop, setSavingCrop] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const shownName = label.trim() || busName
  const imageStyle = unitImageStyle(posX, posY, zoom)

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!imageUrl) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, px: posX, py: posY }
    setDragging(true)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    const size = boxRef.current?.clientWidth || 160
    setPosX(clampPos(d.px - ((e.clientX - d.x) / size) * 100))
    setPosY(clampPos(d.py - ((e.clientY - d.y) / size) * 100))
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
  }

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
      setStatus({ kind: 'ok', msg: 'Posisi & zoom gambar tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan posisi gambar.' })
    } finally {
      setSavingCrop(false)
    }
  }

  const busy = uploading || saving || savingCrop

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Bus size={18} className="text-[#1b4f9c]" />
        <h2 className="text-sm font-bold text-[#1b3555]">Gambar &amp; Nama Unit</h2>
        <span className="rounded-full bg-[#eef3fb] px-2.5 py-0.5 text-[11px] font-bold text-[#1b4f9c]">{busName}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#657080]">
        Muncul di panduan peserta, tepat di bawah Peta Kursi &amp; Daftar Nama. Gambar unit ditampilkan bulat, lalu nama unit
        di bawahnya dengan pita kuning. <strong className="text-[#657080]">Geser gambar langsung</strong> untuk atur bagian
        yang tampil, atur <strong className="text-[#657080]">zoom</strong> bila perlu. JPG / PNG / WebP, maks 5 MB.
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
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={BTN_PRIMARY}>
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              {imageUrl ? 'Ganti Gambar' : 'Unggah Gambar'}
            </button>
            {imageUrl && (
              <button
                type="button"
                onClick={removeImage}
                disabled={busy}
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
            <button type="button" onClick={saveLabel} disabled={busy} className={BTN_PRIMARY}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Simpan Nama
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-[#f8fafc] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9aa3af]">
              Pratinjau — geser gambar untuk atur posisi
            </p>
            <div className="mt-2 flex flex-col items-center">
              <div
                ref={boxRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`relative flex h-40 w-40 shrink-0 touch-none select-none items-center justify-center ${
                  imageUrl ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
                }`}
              >
                <span aria-hidden className="absolute -inset-5 rounded-full bg-[#1b4f9c]/30 blur-xl" />
                <div
                  className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full"
                  style={{ clipPath: 'circle(50% at 50% 50%)' }}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      draggable={false}
                      className="pointer-events-none h-full w-full object-cover"
                      style={imageStyle}
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-[#9aa3af]">Belum ada gambar</span>
                  )}
                </div>
              </div>
              <div
                className="relative z-[1] mt-1 inline-block max-w-full truncate bg-[#f5b915] px-5 py-1 text-xs font-extrabold uppercase tracking-wide text-white"
                style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%, 10px 50%)' }}
              >
                {shownName}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                aria-label="Zoom keluar"
                onClick={() => setZoom((z) => clampUnitImageZoom(z - UNIT_IMAGE_ZOOM_STEP))}
                disabled={busy || !imageUrl}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <input
                type="range"
                min={UNIT_IMAGE_ZOOM_MIN}
                max={UNIT_IMAGE_ZOOM_MAX}
                value={zoom}
                onChange={(e) => setZoom(clampUnitImageZoom(Number(e.target.value)))}
                disabled={busy || !imageUrl}
                className="w-full accent-[#1b4f9c]"
              />
              <button
                type="button"
                aria-label="Zoom masuk"
                onClick={() => setZoom((z) => clampUnitImageZoom(z + UNIT_IMAGE_ZOOM_STEP))}
                disabled={busy || !imageUrl}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
              <span className="w-12 shrink-0 text-right text-[11px] font-bold tabular-nums text-[#657080]">
                {formatUnitImageZoom(zoom)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={saveCrop} disabled={busy || !imageUrl} className={BTN_PRIMARY}>
                {savingCrop ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Simpan Posisi
              </button>
              <button
                type="button"
                onClick={() => {
                  setPosX(50)
                  setPosY(50)
                  setZoom(0)
                }}
                disabled={busy || !imageUrl}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-3 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#eef4fb] active:scale-95 disabled:opacity-60"
              >
                <RotateCcw size={13} /> Reset
              </button>
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
