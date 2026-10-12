import { parseItineraryDoc, groupItineraryByDay } from './itinerary'
import { clampCellSize, seatCount, validateSeatShape } from './seat'
import { validateFrontLayout, type FrontLayout } from './front'
import { validateFacilities, type Facility } from './facilities'

export type PresetKindId = 'PANDUAN' | 'KURSI'

export const PRESET_MAX_NAME = 200

export type PanduanPresetData = {
  panduanItinerary: string
  panduanLogoLeft: string | null
  panduanLogoRight: string | null
  panduanLogoTopRight: string | null
  panduanLogoTopRight2: string | null
}

export type KursiPresetData = {
  seatRows: number
  seatCols: number
  seatCellW: number
  seatCellH: number
  seatLayout: number[][]
  frontLayout: FrontLayout
  facilities: Facility[]
}

export type PresetSummary = {
  primary: string
  secondary: string
}

/** Opsi ringkas preset KURSI yang dikirim ke editor kursi. */
export type PresetOption = { id: string; name: string }

/** Preset KURSI lengkap; datanya dipakai editor untuk memperbarui state di klien. */
export type KursiPresetOption = { id: string; name: string } & KursiPresetData

/** Preset PANDUAN lengkap; datanya dipakai editor untuk mengisi state di klien. */
export type PanduanPresetOption = { id: string; name: string } & PanduanPresetData

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toNullableStr(value: unknown): string | null {
  const s = toStr(value).trim()
  return s ? s : null
}

export function validatePanduanPreset(input: unknown): { data: PanduanPresetData | null; error?: string } {
  if (!input || typeof input !== 'object') return { data: null, error: 'Data preset panduan tidak valid.' }
  const record = input as Record<string, unknown>
  const itinerary = toStr(record.panduanItinerary)
  try {
    const parsed = itinerary ? JSON.parse(itinerary) : []
    if (!Array.isArray(parsed)) throw new Error('not array')
  } catch {
    return { data: null, error: 'Itinerary preset tidak valid.' }
  }
  return {
    data: {
      panduanItinerary: itinerary,
      panduanLogoLeft: toNullableStr(record.panduanLogoLeft),
      panduanLogoRight: toNullableStr(record.panduanLogoRight),
      panduanLogoTopRight: toNullableStr(record.panduanLogoTopRight),
      panduanLogoTopRight2: toNullableStr(record.panduanLogoTopRight2),
    },
  }
}

export function validateKursiPreset(input: unknown): { data: KursiPresetData | null; error?: string } {
  if (!input || typeof input !== 'object') return { data: null, error: 'Data preset kursi tidak valid.' }
  const record = input as Record<string, unknown>
  const shape = validateSeatShape(record.seatRows, record.seatCols, record.seatLayout)
  if (shape.error) return { data: null, error: shape.error }
  const front = validateFrontLayout(record.frontLayout, shape.cols)
  if (front.error) return { data: null, error: front.error }
  const facilities = validateFacilities(record.facilities ?? [])
  if (facilities.error) return { data: null, error: facilities.error }
  return {
    data: {
      seatRows: shape.rows,
      seatCols: shape.cols,
      seatCellW: clampCellSize(record.seatCellW),
      seatCellH: clampCellSize(record.seatCellH),
      seatLayout: shape.cells,
      frontLayout: front.front,
      facilities: facilities.items,
    },
  }
}

function safeParse(data: string | null | undefined): Record<string, unknown> | null {
  try {
    const parsed = data ? JSON.parse(data) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function parsePanduanPreset(data: string | null | undefined): PanduanPresetData | null {
  const record = safeParse(data)
  if (!record) return null
  const validation = validatePanduanPreset(record)
  if (validation.error || !validation.data) {
    const itinerary = toStr(record.panduanItinerary)
    return {
      panduanItinerary: itinerary,
      panduanLogoLeft: toNullableStr(record.panduanLogoLeft),
      panduanLogoRight: toNullableStr(record.panduanLogoRight),
      panduanLogoTopRight: toNullableStr(record.panduanLogoTopRight),
      panduanLogoTopRight2: toNullableStr(record.panduanLogoTopRight2),
    }
  }
  return validation.data
}

export function parseKursiPreset(data: string | null | undefined): KursiPresetData | null {
  const record = safeParse(data)
  if (!record) return null
  const validation = validateKursiPreset(record)
  if (validation.error || !validation.data) return null
  return validation.data
}

export function presetSummary(kind: PresetKindId, data: string | null | undefined): PresetSummary {
  if (kind === 'PANDUAN') {
    const parsed = parsePanduanPreset(data)
    if (!parsed) return { primary: 'Preset panduan', secondary: '—' }
    const doc = parseItineraryDoc(parsed.panduanItinerary)
    const days = groupItineraryByDay(doc.rows, doc.notes, doc.sideNotes)
    const agenda = doc.rows.length
    const logos = [parsed.panduanLogoLeft, parsed.panduanLogoRight, parsed.panduanLogoTopRight, parsed.panduanLogoTopRight2].filter(Boolean).length
    return {
      primary: `${days.length} hari · ${agenda} agenda`,
      secondary: logos > 0 ? `${logos} logo kustom` : 'Logo bawaan',
    }
  }
  const parsed = parseKursiPreset(data)
  if (!parsed) return { primary: 'Preset kursi', secondary: '—' }
  const active = seatCount(parsed.seatLayout)
  const facilities = parsed.facilities.filter((f) => f.name.trim() !== '').length
  return {
    primary: `${parsed.seatRows}×${parsed.seatCols} · ${active} kursi`,
    secondary: facilities > 0 ? `${facilities} fasilitas` : 'Tanpa fasilitas',
  }
}
