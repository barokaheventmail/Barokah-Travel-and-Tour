import { describe, expect, it } from 'vitest'
import {
  buildSections,
  packColumns,
  primaryType,
  sectionWidths,
  UNASSIGNED_TYPE,
  type RoomMapRoom,
} from './room-map'

function room(code: string, type: string | null, occupants: number): RoomMapRoom {
  return {
    room: code,
    roomType: type,
    members: Array.from({ length: occupants }, (_, i) => ({ name: `P${i}`, busName: 'Bus 1' })),
  }
}

describe('primaryType', () => {
  it('mengambil tipe pertama bila ada beberapa nilai', () => {
    expect(primaryType('Club / VIP')).toBe('Club')
  })

  it('merapikan spasi dan null', () => {
    expect(primaryType('  Twin  ')).toBe('Twin')
    expect(primaryType(null)).toBe('')
    expect(primaryType(undefined)).toBe('')
  })
})

describe('packColumns', () => {
  it('tidak memecah satu kamar antar kolom', () => {
    const rooms = [room('A', 'X', 5), room('B', 'X', 5), room('C', 'X', 5), room('D', 'X', 5)]
    // 5 baris/kamar, batas 18 baris -> maksimal 3 kamar per kolom.
    const columns = packColumns(rooms, 18)
    expect(columns.map((c) => c.length)).toEqual([3, 1])
  })

  it('mengisi kolom sampai baris penuh lalu lanjut kolom baru', () => {
    const rooms = Array.from({ length: 5 }, (_, i) => room(`R${i}`, 'X', 2))
    const columns = packColumns(rooms, 6)
    expect(columns.map((c) => c.length)).toEqual([3, 2])
  })
})

describe('buildSections', () => {
  const rooms = [
    room('K01', 'KINGBED', 2),
    room('K02', 'KINGBED', 2),
    room('T01', 'TWINBED', 2),
    room('Q01', 'QUEENBED', 5),
    room('Z01', null, 1),
    room('Z02', '  ', 1),
  ]

  it('mengelompokkan kamar per tipe kamar', () => {
    const sections = buildSections(rooms, [])
    const byType = Object.fromEntries(sections.map((s) => [s.type, s]))
    expect(byType.KINGBED.rooms.map((r) => r.room)).toEqual(['K01', 'K02'])
    expect(byType.TWINBED.totalMembers).toBe(2)
    expect(byType.QUEENBED.capacity).toBe(5)
  })

  it('menghitung kapasitas sebagai penghuni terbanyak dalam satu kamar', () => {
    const sections = buildSections(rooms, [])
    const kingbed = sections.find((s) => s.type === 'KINGBED')!
    expect(kingbed.capacity).toBe(2)
    expect(kingbed.totalRooms).toBe(2)
    expect(kingbed.totalMembers).toBe(4)
  })

  it('menaruh tipe terdaftar lebih dulu, tipe data tambahan setelahnya, dan tanpa tipe paling akhir', () => {
    const sections = buildSections(rooms, ['QUEENBED', 'KINGBED'])
    expect(sections.map((s) => s.type)).toEqual([
      'QUEENBED',
      'KINGBED',
      'TWINBED',
      UNASSIGNED_TYPE,
    ])
  })

  it('tetap menampilkan tipe terdaftar yang belum berpenghuni sebagai bagian kosong', () => {
    const sections = buildSections(rooms, ['KINGBED', 'QUADROBED'])
    const quad = sections.find((s) => s.type === 'QUADROBED')!
    expect(quad.empty).toBe(true)
    expect(quad.totalRooms).toBe(0)
    expect(quad.capacity).toBe(0)
  })

  it('mengurutkan nomor kamar secara numerik di dalam tiap tipe', () => {
    const sections = buildSections([room('K10', 'KINGBED', 2), room('K2', 'KINGBED', 2)], [])
    expect(sections[0].rooms.map((r) => r.room)).toEqual(['K2', 'K10'])
  })
})

describe('sectionWidths', () => {
  it('total lebar selalu 100% dan kolom Nama tetap lega', () => {
    const section = buildSections(
      [room('KINGBED-0001', 'KINGBED', 2), room('KINGBED-0002', 'KINGBED', 2)],
      [],
    )[0]
    // many rooms to push the No column wider
    const big = { ...section, totalRooms: 1250, rooms: [] }
    const widths = sectionWidths(big)
    const total = widths.no + widths.nama + widths.room + widths.type
    expect(total).toBeCloseTo(100, 5)
    expect(widths.nama).toBeGreaterThanOrEqual(26)
  })

  it('kolom No melebar saat nomor mencapai ribuan', () => {
    const base = buildSections([room('R1', 'X', 1)], [])[0]
    const threeDigits = sectionWidths({ ...base, totalRooms: 250 })
    const fourDigits = sectionWidths({ ...base, totalRooms: 2500 })
    expect(fourDigits.no).toBeGreaterThan(threeDigits.no)
  })
})
