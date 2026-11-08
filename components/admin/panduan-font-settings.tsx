'use client'

import { Minus, Plus, RotateCcw, Type } from 'lucide-react'
import {
  PANDUAN_FONT_FIELDS,
  PANDUAN_FONT_MAX,
  PANDUAN_FONT_MIN,
  clampPanduanFontDelta,
  type PanduanFontKey,
  type PanduanFontSizes,
} from '@/lib/panduan-font'

const FIELD_DESCRIPTIONS: Record<PanduanFontKey, string> = {
  coverHeading: 'Judul kuning besar di atas nama event pada sampul.',
  coverTitle: 'Nama event pada sampul panduan.',
  coverLabel: 'Teks di dalam kotak kuning sampul.',
  coverDate: 'Tanggal perjalanan pada sampul.',
  coverLocation: 'Kota atau lokasi pada sampul.',
  participant: 'Nama peserta di denah kursi, kamar, dan kendaraan.',
  sectionHeading: 'Judul bagian seperti Tata Tertib dan Itinerary.',
  pageTitle: 'Judul utama halaman Itinerary dan semua denah.',
  sectionCaption: 'Keterangan orange dan hijau di samping judul bagian.',
  body: 'Paragraf dan isi teks panduan.',
  small: 'Catatan, label kecil, dan teks pendukung.',
}

const FONT_GROUPS: { id: string; title: string; description: string; keys: PanduanFontKey[] }[] = [
  {
    id: 'cover',
    title: 'Sampul',
    description: 'Teks yang tampil di halaman cover panduan.',
    keys: ['coverHeading', 'coverTitle', 'coverLabel', 'coverDate', 'coverLocation'],
  },
  {
    id: 'content',
    title: 'Isi Panduan',
    description: 'Judul, keterangan, dan isi teks di dalam panduan.',
    keys: ['participant', 'sectionHeading', 'pageTitle', 'sectionCaption', 'body', 'small'],
  },
]

const FIELD_BY_KEY = new Map(PANDUAN_FONT_FIELDS.map((field) => [field.key, field]))

const stepBtnCls =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dfe4e8] bg-white text-[#1b4f9c] transition-colors hover:border-[#b9cde8] hover:bg-[#eef4fb] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'

function FontSizeRow({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: PanduanFontKey
  value: number
  onChange: (key: PanduanFontKey, value: number) => void
}) {
  const field = FIELD_BY_KEY.get(fieldKey)
  if (!field) return null

  const sliderId = `font-${fieldKey}-slider`
  const numberId = `font-${fieldKey}-value`
  const changed = value !== 0

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        changed ? 'border-[#cfe0f4] bg-[#f4f8fe]' : 'border-[#eef1f4] bg-[#f8fafc]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white font-extrabold leading-none text-[#1b4f9c] sm:flex ${
            changed ? 'border-[#b9cde8]' : 'border-[#e8ecf1]'
          }`}
          style={{ fontSize: `${Math.min(30, Math.max(11, 16 + value))}px` }}
        >
          Aa
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <label htmlFor={sliderId} className="text-xs font-bold text-[#1b3555]">
              {field.label}
            </label>
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                  changed ? 'bg-[#e2ecf8] text-[#1b4f9c]' : 'bg-[#eef1f4] text-[#9aa3af]'
                }`}
              >
                {changed ? `${value > 0 ? '+' : ''}${value} px` : 'Bawaan'}
              </span>
              <button
                type="button"
                onClick={() => onChange(fieldKey, 0)}
                disabled={!changed}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#9aa3af] transition-colors hover:bg-white hover:text-[#1b4f9c] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Reset ukuran ${field.label}`}
                title="Reset ke ukuran bawaan"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          <p className="mt-0.5 text-[10px] leading-relaxed text-[#657080]">{FIELD_DESCRIPTIONS[fieldKey]}</p>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(fieldKey, clampPanduanFontDelta(value - 1))}
              className={stepBtnCls}
              aria-label={`Perkecil ${field.label} 1 px`}
            >
              <Minus size={14} />
            </button>

            <div className="min-w-0 flex-1">
              <input
                id={sliderId}
                type="range"
                min={PANDUAN_FONT_MIN}
                max={PANDUAN_FONT_MAX}
                step={1}
                value={value}
                onChange={(e) => onChange(fieldKey, clampPanduanFontDelta(Number(e.target.value)))}
                className="h-1.5 w-full cursor-pointer accent-[#1b4f9c]"
              />
            </div>

            <button
              type="button"
              onClick={() => onChange(fieldKey, clampPanduanFontDelta(value + 1))}
              className={stepBtnCls}
              aria-label={`Perbesar ${field.label} 1 px`}
            >
              <Plus size={14} />
            </button>

            <div className="relative shrink-0">
              <label htmlFor={numberId} className="sr-only">
                Ukuran {field.label} dalam piksel
              </label>
              <input
                id={numberId}
                type="number"
                min={PANDUAN_FONT_MIN}
                max={PANDUAN_FONT_MAX}
                step={1}
                value={value}
                onChange={(e) =>
                  onChange(fieldKey, clampPanduanFontDelta(e.target.value === '' ? 0 : Number(e.target.value)))
                }
                className="h-8 w-[4.75rem] rounded-lg border border-[#dfe4e8] bg-white py-1 pl-2 pr-6 text-right text-xs font-bold tabular-nums text-[#1b3555] outline-none transition-colors focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#9aa3af]">
                px
              </span>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between text-[9px] font-semibold tabular-nums text-[#9aa3af]">
            <span>{PANDUAN_FONT_MIN} px</span>
            <span>0 = bawaan</span>
            <span>+{PANDUAN_FONT_MAX} px</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PanduanFontSettings({
  sizes,
  onChange,
  onResetAll,
}: {
  sizes: PanduanFontSizes
  onChange: (key: PanduanFontKey, value: number) => void
  onResetAll: () => void
}) {
  const changedCount = PANDUAN_FONT_FIELDS.filter((field) => (sizes[field.key] ?? 0) !== 0).length

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#1b3555]">
            <Type size={16} className="text-[#1b4f9c]" /> Ukuran Font
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[#657080]">
            Geser slider atau isi angka untuk mengatur besar/kecil teks. Nilai 0 berarti ukuran bawaan; negatif
            mengecilkan dan positif membesarkan.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetAll}
          disabled={changedCount === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-[11px] font-bold text-[#657080] transition-colors hover:border-[#c6d2df] hover:bg-[#f8fafc] hover:text-[#1b3555] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={12} />
          Reset semua
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {FONT_GROUPS.map((group) => {
          const groupChanged = group.keys.filter((key) => (sizes[key] ?? 0) !== 0).length
          return (
            <section key={group.id}>
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#eef1f4] pb-2">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#1b4f9c]">{group.title}</h3>
                  <p className="mt-0.5 text-[10px] text-[#657080]">{group.description}</p>
                </div>
                {groupChanged > 0 && (
                  <span className="rounded-full bg-[#eef4fb] px-2 py-0.5 text-[10px] font-bold text-[#1b4f9c]">
                    {groupChanged} diubah
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-2 xl:grid-cols-2">
                {group.keys.map((key) => (
                  <FontSizeRow key={key} fieldKey={key} value={sizes[key] ?? 0} onChange={onChange} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
