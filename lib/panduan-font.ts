import type { CSSProperties } from 'react'

export const PANDUAN_FONT_FIELDS = [
  { key: 'coverTitle', label: 'Judul Cover', varName: '--panduan-cover-title-delta' },
  { key: 'coverLabel', label: 'Label Cover', varName: '--panduan-cover-label-delta' },
  { key: 'coverDate', label: 'Tanggal Cover', varName: '--panduan-cover-date-delta' },
  { key: 'coverLocation', label: 'Lokasi Cover', varName: '--panduan-cover-location-delta' },
  { key: 'participant', label: 'Nama Peserta', varName: '--panduan-participant-delta' },
  { key: 'sectionHeading', label: 'Judul Bagian', varName: '--panduan-section-heading-delta' },
  { key: 'sectionCaption', label: 'Keterangan Bagian', varName: '--panduan-section-caption-delta' },
  { key: 'body', label: 'Isi Teks', varName: '--panduan-body-delta' },
  { key: 'small', label: 'Teks Kecil', varName: '--panduan-small-delta' },
] as const

export type PanduanFontKey = (typeof PANDUAN_FONT_FIELDS)[number]['key']
export type PanduanFontSizes = Record<PanduanFontKey, number>

export const PANDUAN_FONT_MIN = -20
export const PANDUAN_FONT_MAX = 80

export const DEFAULT_PANDUAN_FONT_SIZES: PanduanFontSizes = {
  coverTitle: 0,
  coverLabel: 0,
  coverDate: 0,
  coverLocation: 0,
  participant: 0,
  sectionHeading: 0,
  sectionCaption: 0,
  body: 0,
  small: 0,
}

export function clampPanduanFontDelta(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(PANDUAN_FONT_MIN, Math.min(PANDUAN_FONT_MAX, Math.round(value)))
}

export function parsePanduanFontSizes(raw: string | null | undefined): PanduanFontSizes {
  const result: PanduanFontSizes = { ...DEFAULT_PANDUAN_FONT_SIZES }
  if (!raw) return result
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return result
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return result
  for (const field of PANDUAN_FONT_FIELDS) {
    const value = (parsed as Record<string, unknown>)[field.key]
    if (typeof value === 'number') result[field.key] = clampPanduanFontDelta(value)
  }
  return result
}

export function serializePanduanFontSizes(sizes: PanduanFontSizes): string | null {
  const normalized: PanduanFontSizes = { ...DEFAULT_PANDUAN_FONT_SIZES }
  let changed = false
  for (const field of PANDUAN_FONT_FIELDS) {
    const value = clampPanduanFontDelta(sizes[field.key] ?? 0)
    normalized[field.key] = value
    if (value !== 0) changed = true
  }
  return changed ? JSON.stringify(normalized) : null
}

/**
 * Nilai delta (px) untuk tiap kelompok teks, dipasang sebagai CSS variable di
 * root panduan. Nilai 0 berarti ukuran bawaan tidak berubah.
 */
export function panduanFontStyleVars(sizes: PanduanFontSizes): CSSProperties {
  const style: Record<string, string> = {}
  for (const field of PANDUAN_FONT_FIELDS) {
    style[field.varName] = `${clampPanduanFontDelta(sizes[field.key] ?? 0)}px`
  }
  return style as CSSProperties
}
