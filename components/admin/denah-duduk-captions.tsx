'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, MessageSquareText } from 'lucide-react'
import { UnitTargetPicker, type TargetMode } from '@/components/admin/unit-target-picker'

const FIELD =
  'w-full rounded-xl border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#eef4fb]'

export type DenahDudukBus = {
  id: string
  name: string
  denahDudukKeterangan: string | null
  denahDudukKeterangan2: string | null
}

function CaptionEditor({
  eventId,
  eventTitle,
  previewTitle,
  busId,
  busName,
  buses,
  initialKeterangan,
  initialKeterangan2,
}: {
  eventId: string
  eventTitle: string
  previewTitle: string
  busId: string
  busName: string
  buses: { id: string; name: string }[]
  initialKeterangan: string
  initialKeterangan2: string
}) {
  const router = useRouter()
  const [keterangan, setKeterangan] = useState(initialKeterangan)
  const [keterangan2, setKeterangan2] = useState(initialKeterangan2)
  const [scope, setScope] = useState<{ mode: TargetMode; ids: string[] }>({ mode: 'one', ids: [busId] })
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const lastSaved = useRef(
    JSON.stringify({
      keterangan: initialKeterangan,
      keterangan2: initialKeterangan2,
      mode: 'one',
      ids: [busId],
    }),
  )
  const abortRef = useRef<AbortController | null>(null)

  const noTarget = scope.mode === 'some' && scope.ids.length === 0
  const orangePreview = keterangan.trim() || eventTitle
  const greenPreview = keterangan2.trim() || busName
  const hasPreview = orangePreview.length > 0 || greenPreview.length > 0
  const handleScopeChange = (ids: string[], mode: TargetMode) => setScope({ mode, ids })

  useEffect(() => {
    const signature = JSON.stringify({
      keterangan,
      keterangan2,
      mode: scope.mode,
      ids: scope.ids,
    })
    if (signature === lastSaved.current) return

    if (noTarget) {
      setSaveState('error')
      setSaveError('Pilih minimal satu unit tujuan.')
      return
    }

    setSaveState('saving')
    setSaveError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const body: Record<string, unknown> = {
            denahDudukKeterangan: keterangan.trim() || null,
            denahDudukKeterangan2: keterangan2.trim() || null,
          }
          if (scope.mode === 'all') body.applyToAll = true
          else body.busIds = scope.ids

          const res = await fetch(`/api/admin/events/${eventId}/bus/${busId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan keterangan.')
          if (controller.signal.aborted) return
          const count = scope.mode === 'all' ? buses.length : scope.ids.length
          lastSaved.current = signature
          setSavedCount(count)
          setSaveState('saved')
          router.refresh()
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setSaveState('error')
          setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan keterangan.')
        }
      })()
    }, 650)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [keterangan, keterangan2, scope, noTarget])

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="denah-ket-1" className="text-[11px] font-bold uppercase tracking-wide text-[#e8830c]">
            Keterangan 1 (orange)
          </label>
          <input
            id="denah-ket-1"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value.slice(0, 200))}
            placeholder={eventTitle ? `Otomatis: ${eventTitle}` : 'mis. Duduk sesuai nomor kursi'}
            maxLength={200}
            className={`${FIELD} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="denah-ket-2" className="text-[11px] font-bold uppercase tracking-wide text-[#2ca84a]">
            Keterangan 2 (hijau)
          </label>
          <input
            id="denah-ket-2"
            value={keterangan2}
            onChange={(e) => setKeterangan2(e.target.value.slice(0, 200))}
            placeholder={`Otomatis: ${busName}`}
            maxLength={200}
            className={`${FIELD} mt-1.5`}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#f8fafc] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9aa3af]">Pratinjau</p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <span className="text-4xl font-extrabold uppercase tracking-wide text-[#00A3E0]">{previewTitle}</span>
          {hasPreview && (
            <div className="flex items-center gap-3">
              <span aria-hidden className="h-9 w-0.5 shrink-0 bg-[#00A3E0]" />
              <div className="flex flex-col text-left leading-tight">
                {orangePreview && <p className="text-2xl font-bold uppercase tracking-wide text-[#e8830c]">{orangePreview}</p>}
                {greenPreview && <p className="text-2xl font-bold uppercase tracking-wide text-[#2ca84a]">{greenPreview}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <UnitTargetPicker
          buses={buses}
          currentId={busId}
          mode={scope.mode}
          targets={scope.ids}
          onChange={handleScopeChange}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-[#9aa3af]">
          Keterangan tersimpan otomatis ke unit yang dipilih.
        </p>
        <div className="mt-2 flex min-h-5 items-center gap-1.5 text-[11px] font-semibold">
          {saveState === 'saving' && (
            <span className="inline-flex items-center gap-1 text-[#1b4f9c]">
              <Loader2 size={12} className="animate-spin" /> Menyimpan otomatis…
            </span>
          )}
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-green-700">
              <Check size={12} /> Tersimpan otomatis ke {savedCount.toLocaleString('id-ID')} unit.
            </span>
          )}
          {saveState === 'error' && <span className="text-red-600">{saveError}</span>}
        </div>
      </div>
    </>
  )
}

export function DenahDudukCaptions({
  eventId,
  eventTitle,
  initialTitle,
  buses,
}: {
  eventId: string
  eventTitle: string
  initialTitle: string
  buses: DenahDudukBus[]
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(buses[0]?.id ?? '')
  const [title, setTitle] = useState(initialTitle)
  const [titleState, setTitleState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [titleError, setTitleError] = useState<string | null>(null)
  const lastSavedTitle = useRef(initialTitle.trim())
  const titleAbortRef = useRef<AbortController | null>(null)
  const selected = buses.find((b) => b.id === selectedId) ?? buses[0] ?? null
  const previewTitle = title.trim() || 'Denah Duduk'

  useEffect(() => {
    const signature = title.trim()
    if (signature === lastSavedTitle.current) return

    setTitleState('saving')
    setTitleError(null)
    titleAbortRef.current?.abort()
    const controller = new AbortController()
    titleAbortRef.current = controller

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/admin/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ denahDudukTitle: title.trim() || null }),
            signal: controller.signal,
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan judul.')
          if (controller.signal.aborted) return
          lastSavedTitle.current = signature
          setTitleState('saved')
          router.refresh()
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setTitleState('error')
          setTitleError(err instanceof Error ? err.message : 'Gagal menyimpan judul.')
        }
      })()
    }, 650)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [title, eventId])

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <MessageSquareText size={18} className="text-[#1b4f9c]" />
        <h2 className="text-sm font-bold text-[#1b3555]">Keterangan Denah Duduk</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#657080]">
        Judul dan keterangan Denah Duduk pada panduan peserta. Keterangan pertama berwarna orange, keterangan kedua
        berwarna hijau. Keterangan 1 otomatis berisi judul event dan Keterangan 2 otomatis berisi nama unit bila
        dikosongkan. Judul tersimpan otomatis, sedangkan keterangan bisa disimpan ke unit ini saja, beberapa unit,
        atau semua unit.
      </p>

      <div className="mt-4">
        <label htmlFor="denah-duduk-title" className="text-[11px] font-bold uppercase tracking-wide text-[#1b4f9c]">
          Judul
        </label>
        <input
          id="denah-duduk-title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 200))}
          placeholder="Kosong = Denah Duduk"
          maxLength={200}
          className={`${FIELD} mt-1.5 w-full max-w-md`}
        />
        <p className="mt-1 text-[10px] leading-relaxed text-[#9aa3af]">
          Kosong = judul bawaan “Denah Duduk”. Judul ini dipakai untuk semua unit dan tersimpan otomatis.
        </p>
        <div className="mt-1.5 flex min-h-5 items-center gap-1.5 text-[11px] font-semibold">
          {titleState === 'saving' && (
            <span className="inline-flex items-center gap-1 text-[#1b4f9c]">
              <Loader2 size={12} className="animate-spin" /> Menyimpan judul…
            </span>
          )}
          {titleState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-green-700">
              <Check size={12} /> Judul tersimpan otomatis
            </span>
          )}
          {titleState === 'error' && <span className="text-red-600">{titleError}</span>}
        </div>
      </div>

      {selected ? (
        <>
          <div className="mt-4">
            <label htmlFor="denah-duduk-unit" className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">
              Pilih Unit
            </label>
            <div className="relative mt-1.5 w-full max-w-xs">
              <select
                id="denah-duduk-unit"
                value={selected.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-full border border-[#dfe4e8] bg-white py-2 pl-4 pr-9 text-xs font-bold text-[#1b3555] outline-none transition-colors hover:bg-[#eef4fb]"
              >
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa3af]" />
            </div>
          </div>

          <CaptionEditor
            key={selected.id}
            eventId={eventId}
            eventTitle={eventTitle}
            previewTitle={previewTitle}
            busId={selected.id}
            busName={selected.name}
            buses={buses.map((b) => ({ id: b.id, name: b.name }))}
            initialKeterangan={selected.denahDudukKeterangan ?? ''}
            initialKeterangan2={selected.denahDudukKeterangan2 ?? ''}
          />
        </>
      ) : (
        <p className="mt-4 rounded-xl bg-[#f8fafc] px-4 py-6 text-center text-xs font-semibold text-[#9aa3af]">
          Belum ada unit. Tambahkan bus/unit terlebih dahulu.
        </p>
      )}
    </div>
  )
}
