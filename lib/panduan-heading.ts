/**
 * Nilai otomatis (auto) & target penyimpanan judul section untuk panduan
 * peserta.
 *
 * Aturan umum:
 * - Keterangan 1 (orange): bila dikosongkan admin, otomatis berisi judul event.
 * - Keterangan 2 (hijau): nilainya tergantung section & data peserta:
 *   Denah Kamar → "X Orang/Kamar" (kapasitas standar tipe kamar),
 *   Denah Kendaraan → "X Orang" (jumlah peserta pada kendaraan tsb),
 *   Denah Duduk → identitas bus (ditangani di halaman, default = nama bus).
 * - Teks yang diisi admin selalu menang (manual override) dan tidak pernah
 *   ditimpa saat import Excel, karena auto dihitung saat render dari data.
 *
 * Judul & keterangan diatur per halaman section (Itinerary, Denah Kamar,
 * Denah Kendaraan, Denah Duduk). Saat menyimpan, admin dapat memilih halaman
 * mana saja yang menerima judul tersebut lewat `selectTitleTargets`.
 */

/** Kapasitas standar tiap tipe kamar (jumlah orang per kamar). */
export const ROOM_TYPE_CAPACITY: Record<string, number> = {
  KINGBED: 2,
  TWINBED: 2,
  TRIPPLEBED: 3,
  QUADROBED: 4,
  QUEENBED: 5,
}

/** Jenis kamar utama sebuah nilai. Bila `roomType` memuat beberapa nilai
 *  (dipisah " / " karena data lama), ambil yang pertama. */
function primaryRoomType(roomType: string | null | undefined): string {
  return (roomType ?? '').split('/')[0].trim()
}

/** Kapasitas standar sebuah tipe kamar (null bila tipe tidak dikenali). */
export function roomTypeCapacity(roomType: string | null | undefined): number | null {
  const key = primaryRoomType(roomType).toUpperCase()
  if (!key) return null
  return ROOM_TYPE_CAPACITY[key] ?? null
}

/** Keterangan hijau Denah Kamar untuk satu tipe: "X Orang/Kamar". */
export function roomTypeKeterangan2(roomType: string | null | undefined): string | null {
  const capacity = roomTypeCapacity(roomType)
  return capacity ? `${capacity} Orang/Kamar` : null
}

/** Keterangan hijau Denah Kendaraan: jumlah peserta dalam satu kendaraan. */
export function vehicleKeterangan2(count: number): string | null {
  return count > 0 ? `${count} Orang` : null
}

/** Pilih teks manual bila diisi; kalau kosong pakai nilai otomatis. */
export function resolveKeterangan(
  manual: string | null | undefined,
  auto: string | null | undefined,
): string | null {
  const m = (manual ?? '').trim()
  if (m) return m
  const a = (auto ?? '').trim()
  return a || null
}

// ---------------------------------------------------------------------------
// Target penyimpanan judul (per halaman)
// ---------------------------------------------------------------------------

/** Satu halaman tujuan saat menyimpan judul. `field` = nama field PATCH event. */
export type PanduanTitleTarget = {
  key: string
  label: string
  field: string
}

/** Halaman yang bisa diatur judul/keterangannya di panduan peserta. */
export const PANDUAN_TITLE_TARGETS: PanduanTitleTarget[] = [
  { key: 'itinerary', label: 'Itinerary', field: 'itineraryTitle' },
  { key: 'denahKamar', label: 'Denah Kamar', field: 'denahKamarTitle' },
  { key: 'denahKendaraan', label: 'Denah Kendaraan', field: 'vwTitle' },
  { key: 'denahDuduk', label: 'Denah Duduk', field: 'denahDudukTitle' },
]

export type TitleTargetMode = 'one' | 'some' | 'all'

/**
 * Tentukan halaman mana saja yang menerima judul saat disimpan.
 * - 'one' → halaman kartu itu sendiri.
 * - 'some' → halaman yang dicentang saja; yang lain tidak berubah.
 * - 'all' → semua halaman.
 */
export function selectTitleTargets(
  targets: PanduanTitleTarget[],
  currentKey: string,
  mode: TitleTargetMode,
  selected: string[],
): PanduanTitleTarget[] {
  if (mode === 'all') return targets
  if (mode === 'one') return targets.filter((target) => target.key === currentKey)
  return targets.filter((target) => selected.includes(target.key))
}
