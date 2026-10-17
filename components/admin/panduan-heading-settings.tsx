'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Armchair, BedDouble, CalendarDays, Car, Check, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { UnitTargetPicker, type TargetMode } from '@/components/admin/unit-target-picker'
import { PANDUAN_TITLE_TARGETS, selectTitleTargets } from '@/lib/panduan-heading'

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
  currentKey,
  icon: Icon,
  label,
  hint,
  defaultTitle,
  defaultNote,
  subtitle,
  autoKeterangan,
  keterangan2Note,
  titleOnly = false,
  fields,
  initial,
}: {
  eventId: string
  /** Kunci halaman di PANDUAN_TITLE_TARGETS (untuk tombol "Halaman Ini"). */
  currentKey: string
  icon: LucideIcon
  label: string
  hint: string
  defaultTitle: string
  /** Catatan di bawah input judul, mis. "Otomatis: VW MAGELANG". */
  defaultNote: string
  /** Sub title berpita di bawah judul (hanya itinerary) — tampil di pratinjau. */
  subtitle?: string
  /** Nilai otomatis keterangan orange saat input kosong (placeholder & pratinjau). */
  autoKeterangan?: string
  /** Catatan di bawah input keterangan hijau, mis. nilai otomatisnya. */
  keterangan2Note?: string
  /** Judul saja tanpa input keterangan (mis. Denah Duduk — keterangan per unit). */
  titleOnly?: boolean
  fields: HeadingPatchFields
  initial: { title: string; keterangan: string; keterangan2: string }
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [keterangan, setKeterangan] = useState(initial.keterangan)
  const [keterangan2, setKeterangan2] = useState(initial.keterangan2)
  const [scope, setScope] = useState<{ mode: TargetMode; ids: string[] }>({ mode: 'one', ids: [currentKey] })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const previewTitle = title.trim() || defaultTitle
  const autoOrange = (autoKeterangan ?? '').trim()
  const previewOrange = titleOnly ? '' : keterangan.trim() || autoOrange
  const previewGreen = titleOnly ? '' : keterangan2.trim()
  const hasCaption = previewOrange.length > 0 || previewGreen.length > 0

  const targets = selectTitleTargets(PANDUAN_TITLE_TARGETS, currentKey, scope.mode, scope.ids)
  const noTarget = targets.length === 0

  async function save() {
    if (noTarget) {
      setStatus({ kind: 'err', msg: 'Pilih minimal satu halaman tujuan.' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const body: Record<string, unknown> = {}
      // Judul diterapkan ke halaman yang dipilih saja; halaman lain tidak
      // berubah. Keterangan selalu tersimpan ke halaman kartu ini.
      for (const target of targets) body[target.field] = title.trim() || null
      if (!titleOnly) {
        body[fields.keterangan] = keterangan.trim() || null
        body[fields.keterangan2] = keterangan2.trim() || null
      }

      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan judul.')
      setStatus({ kind: 'ok', msg: `Judul tersimpan ke ${targets.length} halaman.` })
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

      <div className={`mt-4 grid gap-4 ${titleOnly ? '' : 'sm:grid-cols-3'}`}>
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
        {!titleOnly && (
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
              placeholder={autoOrange ? `Otomatis: ${autoOrange}` : 'mis. Duduk sesuai nomor kursi'}
              maxLength={200}
              className={`${FIELD} mt-1.5`}
            />
            {autoOrange && (
              <p className="mt-1 text-[10px] leading-relaxed text-[#9aa3af]">
                Kosong = otomatis judul event ({autoOrange}).
              </p>
            )}
          </div>
        )}
        {!titleOnly && (
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
            {keterangan2Note && (
              <p className="mt-1 text-[10px] leading-relaxed text-[#9aa3af]">{keterangan2Note}</p>
            )}
          </div>
        )}
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
                  {previewOrange && (
                    <p className="text-base font-bold uppercase tracking-wide text-[#e8830c]">{previewOrange}</p>
                  )}
                  {previewGreen && (
                    <p className="text-base font-bold uppercase tracking-wide text-[#2ca84a]">{previewGreen}</p>
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
        <UnitTargetPicker
          buses={PANDUAN_TITLE_TARGETS.map((t) => ({ id: t.key, name: t.label }))}
          currentId={currentKey}
          mode={scope.mode}
          targets={scope.ids}
          onChange={(ids, mode) => setScope({ mode, ids })}
          label="Simpan judul ke"
          oneLabel="Halaman Ini"
          allLabel="Semua Halaman"
          someLabel="Pilih halaman…"
          noun="halaman"
          disabled={saving}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-[#9aa3af]">
          Halaman yang tidak dipilih tidak ikut berubah. Judul yang sudah tersimpan tetap tersimpan.
          {!titleOnly && ' Keterangan orange & hijau selalu disimpan ke halaman ini.'}
        </p>
      </div>

      <div className="mt-4">
        <button type="button" onClick={save} disabled={saving || noTarget} className={BTN_PRIMARY}>
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
  initialDenahDudukTitle,
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
  initialDenahDudukTitle: string
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
        currentKey="itinerary"
        icon={CalendarDays}
        label="Judul Utama Itinerary"
        hint="Main title halaman Itinerary pada panduan peserta — tampil di atas subtitle berpita ITINERARY (subtitle tidak ikut berubah). Keterangan orange & hijau tampil di sebelah main title, dipisah garis vertikal seperti Keterangan Denah Duduk."
        defaultTitle={eventTitle}
        defaultNote={`Kosong = judul event (${eventTitle || '—'}).`}
        subtitle="Itinerary"
        autoKeterangan={eventTitle}
        keterangan2Note="Tidak ada nilai otomatis — keterangan hijau tampil hanya bila diisi."
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
        currentKey="denahKamar"
        icon={BedDouble}
        label="Judul Denah Kamar"
        hint="Judul halaman Denah Kamar pada panduan peserta, plus keterangan orange & hijau di sebelahnya. Tampil di setiap lembar denah kamar."
        defaultTitle="Denah Kamar"
        defaultNote="Kosong = judul bawaan “Denah Kamar”."
        autoKeterangan={eventTitle}
        keterangan2Note="Kosong = otomatis “X Orang/Kamar” mengikuti kapasitas tipe kamar (KINGBED 2, TWINBED 2, TRIPPLEBED 3, QUADROBED 4, QUEENBED 5)."
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
        currentKey="denahKendaraan"
        icon={Car}
        label="Judul Denah Kendaraan (VW)"
        hint="Judul bagian Denah Kendaraan pada panduan peserta (menimpa judul otomatis), plus keterangan orange & hijau di sebelah judul tiap lembar denah kendaraan."
        defaultTitle={vwAutoTitle}
        defaultNote={`Kosong = otomatis (${vwAutoTitle}). Judul yang sama juga bisa diatur di tab Peserta → Denah Mobil.`}
        autoKeterangan={eventTitle}
        keterangan2Note="Kosong = otomatis “X Orang” sesuai jumlah peserta pada tiap kendaraan."
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

      <HeadingCard
        eventId={eventId}
        currentKey="denahDuduk"
        icon={Armchair}
        label="Judul Denah Duduk"
        hint="Judul utama tiap lembar Denah Duduk pada panduan peserta (dipakai semua unit). Keterangan orange & hijau Denah Duduk diatur per unit di tab Kursi & Fasilitas."
        defaultTitle="Denah Duduk"
        defaultNote="Kosong = judul bawaan “Denah Duduk”."
        titleOnly
        fields={{ title: 'denahDudukTitle', keterangan: '', keterangan2: '' }}
        initial={{ title: initialDenahDudukTitle, keterangan: '', keterangan2: '' }}
      />
    </>
  )
}
