'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BedDouble, CalendarDays, Car, Check, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const FIELD =
  'w-full rounded-xl border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#eef4fb]'

const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60'

type HeadingPatchFields = {
  title: string
  keterangan: string
  keterangan2: string
}

function HeadingCard({
  eventId,
  icon: Icon,
  label,
  hint,
  defaultTitle,
  defaultNote,
  subtitle,
  fields,
  initial,
}: {
  eventId: string
  icon: LucideIcon
  label: string
  hint: string
  defaultTitle: string
  /** Catatan di bawah input judul, mis. "Otomatis: VW MAGELANG". */
  defaultNote: string
  /** Sub title berpita di bawah judul (hanya itinerary) — tampil di pratinjau. */
  subtitle?: string
  fields: HeadingPatchFields
  initial: { title: string; keterangan: string; keterangan2: string }
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [keterangan, setKeterangan] = useState(initial.keterangan)
  const [keterangan2, setKeterangan2] = useState(initial.keterangan2)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const previewTitle = title.trim() || defaultTitle
  const hasCaption = keterangan.trim().length > 0 || keterangan2.trim().length > 0

  async function save() {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [fields.title]: title.trim() || null,
          [fields.keterangan]: keterangan.trim() || null,
          [fields.keterangan2]: keterangan2.trim() || null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan judul.')
      setStatus({ kind: 'ok', msg: 'Judul halaman tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan judul.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Icon size={18} className="text-[#1b4f9c]" />
        <h2 className="text-sm font-bold text-[#1b3555]">{label}</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#657080]">{hint}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${fields.title}-judul`} className="text-[11px] font-bold uppercase tracking-wide text-[#1b4f9c]">
            Judul
          </label>
          <input
            id={`${fields.title}-judul`}
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder={`Kosong = ${defaultTitle}`}
            maxLength={200}
            className={`${FIELD} mt-1.5`}
          />
          <p className="mt-1 text-[10px] leading-relaxed text-[#9aa3af]">{defaultNote}</p>
        </div>
        <div>
          <label
            htmlFor={`${fields.keterangan}-ket-1`}
            className="text-[11px] font-bold uppercase tracking-wide text-[#e8830c]"
          >
            Keterangan 1 (orange)
          </label>
          <input
            id={`${fields.keterangan}-ket-1`}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value.slice(0, 200))}
            placeholder="mis. Duduk sesuai nomor kursi"
            maxLength={200}
            className={`${FIELD} mt-1.5`}
          />
        </div>
        <div>
          <label
            htmlFor={`${fields.keterangan2}-ket-2`}
            className="text-[11px] font-bold uppercase tracking-wide text-[#2ca84a]"
          >
            Keterangan 2 (hijau)
          </label>
          <input
            id={`${fields.keterangan2}-ket-2`}
            value={keterangan2}
            onChange={(e) => setKeterangan2(e.target.value.slice(0, 200))}
            placeholder="mis. Dilarang merokok"
            maxLength={200}
            className={`${FIELD} mt-1.5`}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#f8fafc] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9aa3af]">Pratinjau</p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-2xl font-extrabold uppercase tracking-wide text-[#00A3E0]">{previewTitle}</span>
            {hasCaption && (
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-7 w-0.5 shrink-0 bg-[#00A3E0]" />
                <div className="flex flex-col text-left leading-tight">
                  {keterangan.trim() && (
                    <p className="text-base font-bold uppercase tracking-wide text-[#e8830c]">{keterangan.trim()}</p>
                  )}
                  {keterangan2.trim() && (
                    <p className="text-base font-bold uppercase tracking-wide text-[#2ca84a]">{keterangan2.trim()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          {subtitle && (
            <span
              className="inline-flex items-center bg-[#00A3E0] px-4 py-1 text-xs font-bold uppercase tracking-widest text-white"
              style={{ clipPath: 'polygon(0 0, calc(100% - 0.6rem) 0, 100% 100%, 0 100%)' }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <button type="button" onClick={save} disabled={saving} className={BTN_PRIMARY}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Simpan Judul
        </button>
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

export function PanduanHeadingSettings({
  eventId,
  eventTitle,
  initialItineraryTitle,
  initialItineraryKeterangan,
  initialItineraryKeterangan2,
  initialDenahKamarTitle,
  initialDenahKamarKeterangan,
  initialDenahKamarKeterangan2,
  initialVwTitle,
  initialVwKeterangan,
  initialVwKeterangan2,
}: {
  eventId: string
  /** Judul event (mis. "trip jogja") — dipakai sebagai default main title itinerary. */
  eventTitle: string
  initialItineraryTitle: string
  initialItineraryKeterangan: string
  initialItineraryKeterangan2: string
  initialDenahKamarTitle: string
  initialDenahKamarKeterangan: string
  initialDenahKamarKeterangan2: string
  initialVwTitle: string
  initialVwKeterangan: string
  initialVwKeterangan2: string
}) {
  // Judul otomatis Denah VW (bergantung jumlah peserta per unit) untuk
  // pratinjau & catatan "Otomatis" pada card judul VW.
  const [vwAutoTitle, setVwAutoTitle] = useState('Denah Kendaraan')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/events/${eventId}/vw`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.autoTitle === 'string' && data.autoTitle.trim()) {
          setVwAutoTitle(data.autoTitle.trim())
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [eventId])

  return (
    <>
      <HeadingCard
        eventId={eventId}
        icon={CalendarDays}
        label="Judul Utama Itinerary"
        hint="Main title halaman Itinerary pada panduan peserta — tampil di atas subtitle berpita ITINERARY (subtitle tidak ikut berubah). Keterangan orange & hijau tampil di sebelah main title, dipisah garis vertikal seperti Keterangan Denah Duduk."
        defaultTitle={eventTitle}
        defaultNote={`Kosong = judul event (${eventTitle || '—'}).`}
        subtitle="Itinerary"
        fields={{
          title: 'itineraryTitle',
          keterangan: 'itineraryKeterangan',
          keterangan2: 'itineraryKeterangan2',
        }}
        initial={{
          title: initialItineraryTitle,
          keterangan: initialItineraryKeterangan,
          keterangan2: initialItineraryKeterangan2,
        }}
      />

      <HeadingCard
        eventId={eventId}
        icon={BedDouble}
        label="Judul Denah Kamar"
        hint="Judul halaman Denah Kamar pada panduan peserta, plus keterangan orange & hijau di sebelahnya. Tampil di setiap lembar denah kamar."
        defaultTitle="Denah Kamar"
        defaultNote="Kosong = judul bawaan “Denah Kamar”."
        fields={{
          title: 'denahKamarTitle',
          keterangan: 'denahKamarKeterangan',
          keterangan2: 'denahKamarKeterangan2',
        }}
        initial={{
          title: initialDenahKamarTitle,
          keterangan: initialDenahKamarKeterangan,
          keterangan2: initialDenahKamarKeterangan2,
        }}
      />

      <HeadingCard
        eventId={eventId}
        icon={Car}
        label="Judul Denah Kendaraan (VW)"
        hint="Judul bagian Denah Kendaraan pada panduan peserta (menimpa judul otomatis), plus keterangan orange & hijau di sebelah judul tiap lembar denah kendaraan."
        defaultTitle={vwAutoTitle}
        defaultNote={`Kosong = otomatis (${vwAutoTitle}). Judul yang sama juga bisa diatur di tab Peserta → Denah Mobil.`}
        fields={{
          title: 'vwTitle',
          keterangan: 'vwKeterangan',
          keterangan2: 'vwKeterangan2',
        }}
        initial={{
          title: initialVwTitle,
          keterangan: initialVwKeterangan,
          keterangan2: initialVwKeterangan2,
        }}
      />
    </>
  )
}
