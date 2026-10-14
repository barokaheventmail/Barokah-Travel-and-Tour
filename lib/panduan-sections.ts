/**
 * Urutan halaman + section tambahan pada panduan peserta.
 *
 * Satu node mewakili satu halaman A4 di panduan publik:
 * - `builtin` = section bawaan (Visi & Misi, Doa/Salat, Tata Tertib, dst.),
 *   kontennya tetap dirender oleh halaman panduan. Bila key-nya tidak ada di
 *   daftar, section itu disembunyikan.
 * - `custom` = halaman buatan admin dengan judul bebas, daftar item, dan
 *   keterangan opsional di bawah daftar.
 *
 * Bila `Event.panduanSections` null/kosong, dipakai urutan bawaan (semua
 * section bawaan tampil pada urutan aslinya) supaya event lama tidak berubah.
 */

export const BUILTIN_SECTION_KEYS = [
  'vision',
  'prayer',
  'jamak-qashar',
  'rules',
  'itinerary',
  'seat-map',
  'room-map',
  'vw-map',
] as const

export type BuiltinSectionKey = (typeof BUILTIN_SECTION_KEYS)[number]

export const BUILTIN_SECTION_LABELS: Record<BuiltinSectionKey, string> = {
  vision: 'Visi & Misi',
  prayer: 'Doa Bepergian & Tata Cara Sholat Jamak',
  'jamak-qashar': 'Sholat Jamak Takdim & Qashar',
  rules: 'Tata Tertib & Crew on Duty',
  itinerary: 'Itinerary Perjalanan',
  'seat-map': 'Denah Duduk',
  'room-map': 'Denah Kamar',
  'vw-map': 'Denah VW',
}

export type BuiltinSectionItem = { id: string; type: 'builtin'; builtin: BuiltinSectionKey }
export type CustomSectionItem = {
  id: string
  type: 'custom'
  title: string
  items: string[]
  note: string
}
export type PanduanSectionItem = BuiltinSectionItem | CustomSectionItem

export const MAX_CUSTOM_SECTIONS = 20
export const MAX_SECTION_ITEMS = 40
export const MAX_SECTION_TITLE = 120
export const MAX_SECTION_NOTE = 500
export const MAX_SECTION_ITEM_LEN = 200
/** Ambang jumlah item yang pindah ke kolom kedua (1-20 kiri, sisanya kanan). */
export const SECTION_COLUMN_BREAK = 20

const isBuiltinKey = (value: unknown): value is BuiltinSectionKey =>
  typeof value === 'string' && (BUILTIN_SECTION_KEYS as readonly string[]).includes(value)

export function newSectionId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  return `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function defaultPanduanSections(): PanduanSectionItem[] {
  return BUILTIN_SECTION_KEYS.map((key) => ({ id: key, type: 'builtin', builtin: key }))
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanItems(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => cleanText(item, MAX_SECTION_ITEM_LEN))
    .filter(Boolean)
    .slice(0, MAX_SECTION_ITEMS)
}

/**
 * Baca `Event.panduanSections`. Input tidak valid / kosong -> urutan bawaan.
 * Node yang tidak dikenali dilewati; id unik dijamin.
 */
export function parsePanduanSections(value: string | null | undefined): PanduanSectionItem[] {
  if (!value) return defaultPanduanSections()
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return defaultPanduanSections()
  }
  if (!Array.isArray(parsed)) return defaultPanduanSections()

  const seen = new Set<string>()
  const items: PanduanSectionItem[] = []
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    let id = cleanText(record.id, 80) || newSectionId()
    if (seen.has(id)) id = newSectionId()
    seen.add(id)

    if (record.type === 'builtin') {
      if (!isBuiltinKey(record.builtin)) continue
      items.push({ id, type: 'builtin', builtin: record.builtin })
      continue
    }
    if (record.type === 'custom') {
      const title = cleanText(record.title, MAX_SECTION_TITLE)
      const note = cleanText(record.note, MAX_SECTION_NOTE)
      const list = cleanItems(record.items)
      if (!title && !note && list.length === 0) continue
      items.push({ id, type: 'custom', title, items: list, note })
    }
  }
  return items.length > 0 ? items : defaultPanduanSections()
}

/** Bersihkan & simpan. Node kosong dibuang agar tidak jadi halaman kosong. */
export function serializePanduanSections(items: PanduanSectionItem[]): string {
  const clean: PanduanSectionItem[] = []
  for (const item of items) {
    if (item.type === 'builtin') {
      if (!isBuiltinKey(item.builtin)) continue
      clean.push({ id: item.id, type: 'builtin', builtin: item.builtin })
      continue
    }
    const title = cleanText(item.title, MAX_SECTION_TITLE)
    const note = cleanText(item.note, MAX_SECTION_NOTE)
    const list = cleanItems(item.items)
    if (!title && !note && list.length === 0) continue
    clean.push({ id: item.id, type: 'custom', title, items: list, note })
  }
  return JSON.stringify(clean)
}

/**
 * Bagi item jadi dua kolom: bila <= 20 item, semua di kolom kiri (satu kolom);
 * bila lebih, 20 item pertama kiri dan sisanya kanan.
 */
export function splitSectionItems(items: string[]): { left: string[]; right: string[] } {
  if (items.length <= SECTION_COLUMN_BREAK) return { left: items, right: [] }
  return { left: items.slice(0, SECTION_COLUMN_BREAK), right: items.slice(SECTION_COLUMN_BREAK) }
}
