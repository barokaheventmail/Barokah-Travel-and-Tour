'use client'

import { Minus, MoveHorizontal, MoveVertical, Plus, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  PANDUAN_POSITION_MAX,
  PANDUAN_POSITION_MIN,
  clampPanduanPositionOffset,
  type PanduanPositionKey,
  type PanduanPositionOffsets,
} from '@/lib/panduan-font'

const stepBtnCls =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dfe4e8] bg-white text-[#1b4f9c] transition-colors hover:border-[#b9cde8] hover:bg-[#eef4fb] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'

const ROWS: {
  title: string
  hint: string
  keys: { key: PanduanPositionKey; label: string; icon: LucideIcon }[]
}[] = [
  {
    title: 'Judul di Atas Nama Event',
    hint: 'Posisi teks kuning besar pada sampul. 0 = posisi bawaan.',
    keys: [
      { key: 'coverHeadingX', label: 'Kiri / kanan', icon: MoveHorizontal },
      { key: 'coverHeadingY', label: 'Atas / bawah', icon: MoveVertical },
    ],
  },
  {
    title: 'Keterangan di Bawah Judul',
    hint: 'Posisi teks keterangan kecil di bawah judul. 0 = posisi bawaan.',
    keys: [
      { key: 'coverSubheadingX', label: 'Kiri / kanan', icon: MoveHorizontal },
      { key: 'coverSubheadingY', label: 'Atas / bawah', icon: MoveVertical },
    ],
  },
]

function PositionInput({
  id,
  label,
  icon: Icon,
  value,
  onChange,
}: {
  id: string
  label: string
  icon: LucideIcon
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-lg border border-[#eef1f4] bg-white p-2">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[10px] font-bold text-[#657080]">
        <Icon size={12} className="text-[#1b4f9c]" />
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(clampPanduanPositionOffset(value - 1))}
          className={stepBtnCls}
          aria-label={`Geser ${label} -1 px`}
        >
          <Minus size={13} />
        </button>
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`${id}-number`} className="sr-only">
            {label} dalam piksel
          </label>
          <input
            id={`${id}-number`}
            type="number"
            min={PANDUAN_POSITION_MIN}
            max={PANDUAN_POSITION_MAX}
            step={1}
            value={value}
            onChange={(e) => onChange(clampPanduanPositionOffset(e.target.value === '' ? 0 : Number(e.target.value)))}
            className="h-8 w-full rounded-lg border border-[#dfe4e8] bg-white py-1 pl-2 pr-6 text-right text-xs font-bold tabular-nums text-[#1b3555] outline-none transition-colors focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#9aa3af]">
            px
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange(clampPanduanPositionOffset(value + 1))}
          className={stepBtnCls}
          aria-label={`Geser ${label} +1 px`}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

export function PanduanPositionSettings({
  positions,
  onChange,
  onResetAll,
}: {
  positions: PanduanPositionOffsets
  onChange: (key: PanduanPositionKey, value: number) => void
  onResetAll: () => void
}) {
  const changedCount = ROWS.reduce(
    (total, row) => total + row.keys.filter(({ key }) => (positions[key] ?? 0) !== 0).length,
    0,
  )

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#1b3555]">
            <MoveHorizontal size={16} className="text-[#1b4f9c]" /> Posisi Teks Sampul
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[#657080]">
            Atur posisi horizontal dan vertikal judul serta keterangan pada sampul panduan. Nilai positif menggeser ke
            kanan / ke bawah, negatif ke kiri / ke atas.
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

      <div className="mt-4 grid gap-2 xl:grid-cols-2">
        {ROWS.map((row) => {
          const changed = row.keys.some(({ key }) => (positions[key] ?? 0) !== 0)
          return (
            <div
              key={row.title}
              className={`rounded-xl border p-3 transition-colors ${
                changed ? 'border-[#cfe0f4] bg-[#f4f8fe]' : 'border-[#eef1f4] bg-[#f8fafc]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-[#1b3555]">{row.title}</h3>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#657080]">{row.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => row.keys.forEach(({ key }) => onChange(key, 0))}
                  disabled={!changed}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#9aa3af] transition-colors hover:bg-white hover:text-[#1b4f9c] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Reset posisi ${row.title}`}
                  title="Reset ke posisi bawaan"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {row.keys.map(({ key, label, icon }) => (
                  <PositionInput
                    key={key}
                    id={`position-${key}`}
                    label={label}
                    icon={icon}
                    value={positions[key] ?? 0}
                    onChange={(value) => onChange(key, value)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
