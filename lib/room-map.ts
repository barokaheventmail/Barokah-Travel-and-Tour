export type RoomMapMember = { name: string; busName: string }
export type RoomMapRoom = { room: string; roomType: string | null; members: RoomMapMember[] }

/** Batas baris nama per kolom & jumlah kolom per lembar A4. */
export const ROWS_PER_COLUMN = 16
export const COLUMNS_PER_PAGE = 2
/** Nama bagian untuk kamar yang belum diisi tipe kamarnya. */
export const UNASSIGNED_TYPE = 'Tanpa Tipe Kamar'

export type RoomSection = {
  type: string
  rooms: RoomMapRoom[]
  totalRooms: number
  totalMembers: number
  /** Kapasitas per kamar: jumlah penghuni terbanyak pada satu kamar. */
  capacity: number
  empty: boolean
}

/** Jenis kamar utama sebuah kamar. Bila `roomType` memuat beberapa nilai
 *  (dipisah " / " karena data lama), ambil yang pertama sebagai penentu
 *  pengelompokan. */
export function primaryType(roomType: string | null | undefined): string {
  return (roomType ?? '').split('/')[0].trim()
}

/** Bagi daftar kamar jadi beberapa kolom, tiap kolom maksimal `rowsPerColumn`
 *  baris nama. Satu kamar tidak pernah dipecah antar kolom. */
export function packColumns(rooms: RoomMapRoom[], rowsPerColumn: number): RoomMapRoom[][] {
  const columns: RoomMapRoom[][] = []
  let current: RoomMapRoom[] = []
  let rows = 0
  for (const room of rooms) {
    const roomRows = Math.max(1, room.members.length)
    if (current.length > 0 && rows + roomRows > rowsPerColumn) {
      columns.push(current)
      current = []
      rows = 0
    }
    current.push(room)
    rows += roomRows
  }
  if (current.length > 0) columns.push(current)
  return columns
}

/** Susun daftar bagian (section) per tipe kamar. Urutan mengikuti daftar tipe
 *  kamar event, lalu tipe tambahan yang hanya muncul di data, dan terakhir
 *  "Tanpa Tipe Kamar". Tipe yang terdaftar tapi belum berpenghuni tetap
 *  ditampilkan (dengan pesan kosong) supaya admin tahu. */
export function buildSections(rooms: RoomMapRoom[], configured: string[]): RoomSection[] {
  const map = new Map<string, RoomMapRoom[]>()
  for (const room of rooms) {
    const key = primaryType(room.roomType) || UNASSIGNED_TYPE
    const list = map.get(key)
    if (list) list.push(room)
    else map.set(key, [room])
  }

  const order: string[] = []
  const push = (raw: string) => {
    const name = raw.trim()
    if (name && !order.includes(name)) order.push(name)
  }
  for (const name of configured) push(name)
  for (const name of map.keys()) if (name !== UNASSIGNED_TYPE) push(name)
  if (map.has(UNASSIGNED_TYPE)) push(UNASSIGNED_TYPE)

  return order.map((type) => {
    const list = (map.get(type) ?? [])
      .slice()
      .sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true }))
    const capacity = list.reduce((max, room) => Math.max(max, room.members.length), 0)
    const totalMembers = list.reduce((sum, room) => sum + room.members.length, 0)
    return { type, rooms: list, totalRooms: list.length, totalMembers, capacity, empty: list.length === 0 }
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Lebar kolom (persen) yang menyesuaikan isi tiap tipe: kolom No & No Kamar
 *  mengikuti panjang angka/nomor, kolom Tipe mengikuti nama tipe, sisanya untuk
 *  kolom Nama supaya tidak terpotong. */
export function sectionWidths(section: RoomSection): {
  no: number
  nama: number
  room: number
  type: number
} {
  const noDigits = String(Math.max(section.totalRooms, 1)).length
  const roomLen = section.rooms.reduce((max, room) => Math.max(max, room.room.length), 0)
  const typeLen = section.rooms.reduce(
    (max, room) => Math.max(max, (room.roomType ?? '').trim().length),
    0,
  )

  const no = clamp(noDigits * 2.6 + 3.5, 6, 16)
  let room = clamp(roomLen * 2.6 + 3.5, 18, 28)
  let type = clamp(Math.max(typeLen, 4) * 2.6 + 3.5, 20, 34)
  let nama = 100 - no - room - type

  // Pastikan kolom Nama tetap lega; kurangi kolom Tipe lalu No Kamar bila perlu.
  if (nama < 26) {
    const deficit = 26 - nama
    const typeCut = Math.min(deficit, type - 20)
    type -= typeCut
    const rest = deficit - typeCut
    if (rest > 0) room -= Math.min(rest, room - 18)
    nama = 100 - no - room - type
  }

  return { no, nama, room, type }
}
