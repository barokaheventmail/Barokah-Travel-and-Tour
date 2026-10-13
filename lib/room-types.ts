export type RoomTypeOption = { id: string; name: string }

/** Batas panjang nama tipe kamar; samakan dengan kolom `RoomType.name`. */
export const MAX_ROOM_TYPE_NAME = 100

/**
 * Ambil nama tipe kamar unik dari sekumpulan nilai: buang yang kosong,
 * rapikan spasi, dan jaga urutan kemunculan pertama. Dipakai import Excel
 * untuk mengetahui tipe kamar baru mana yang perlu ditambahkan ke daftar.
 */
export function collectRoomTypeNames(values: Iterable<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const name = (raw ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}
