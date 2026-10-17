import { describe, expect, it } from 'vitest'
import {
  PANDUAN_TITLE_TARGETS,
  ROOM_TYPE_CAPACITY,
  resolveKeterangan,
  roomTypeCapacity,
  roomTypeKeterangan2,
  selectTitleTargets,
  vehicleKeterangan2,
} from './panduan-heading'

describe('roomTypeCapacity', () => {
  it('mengenali tipe kamar standar (case-insensitive)', () => {
    expect(roomTypeCapacity('KINGBED')).toBe(2)
    expect(roomTypeCapacity('kingbed')).toBe(2)
    expect(roomTypeCapacity('Twinbed')).toBe(2)
    expect(roomTypeCapacity('TRIPPLEBED')).toBe(3)
    expect(roomTypeCapacity('QUADROBED')).toBe(4)
    expect(roomTypeCapacity('QUEENBED')).toBe(5)
  })

  it('mengambil tipe utama bila ada beberapa nilai dipisah "/"', () => {
    expect(roomTypeCapacity('KINGBED / TWINBED')).toBe(2)
    expect(roomTypeCapacity('QUADROBED / KINGBED')).toBe(4)
  })

  it('null untuk tipe tak dikenal / kosong', () => {
    expect(roomTypeCapacity('Suite')).toBeNull()
    expect(roomTypeCapacity('')).toBeNull()
    expect(roomTypeCapacity(null)).toBeNull()
    expect(roomTypeCapacity(undefined)).toBeNull()
  })
})

describe('roomTypeKeterangan2', () => {
  it('menghasilkan "X Orang/Kamar"', () => {
    expect(roomTypeKeterangan2('KINGBED')).toBe('2 Orang/Kamar')
    expect(roomTypeKeterangan2('TRIPPLEBED')).toBe('3 Orang/Kamar')
  })

  it('null bila tipe tak dikenal', () => {
    expect(roomTypeKeterangan2('Suite')).toBeNull()
  })
})

describe('vehicleKeterangan2', () => {
  it('menghasilkan "X Orang" bila ada peserta', () => {
    expect(vehicleKeterangan2(12)).toBe('12 Orang')
  })

  it('null bila tidak ada peserta', () => {
    expect(vehicleKeterangan2(0)).toBeNull()
  })
})

describe('resolveKeterangan', () => {
  it('memakai teks manual bila diisi', () => {
    expect(resolveKeterangan('manual', 'auto')).toBe('manual')
  })

  it('memakai teks auto bila manual kosong', () => {
    expect(resolveKeterangan('', 'auto')).toBe('auto')
    expect(resolveKeterangan('   ', 'auto')).toBe('auto')
    expect(resolveKeterangan(null, 'auto')).toBe('auto')
  })

  it('null bila keduanya kosong', () => {
    expect(resolveKeterangan('', '')).toBeNull()
    expect(resolveKeterangan(null, null)).toBeNull()
  })
})

describe('PANDUAN_TITLE_TARGETS', () => {
  it('memuat empat halaman dengan field PATCH yang sesuai', () => {
    expect(PANDUAN_TITLE_TARGETS.map((t) => t.key)).toEqual([
      'itinerary',
      'denahKamar',
      'denahKendaraan',
      'denahDuduk',
    ])
    expect(PANDUAN_TITLE_TARGETS.find((t) => t.key === 'denahKendaraan')?.field).toBe('vwTitle')
    expect(ROOM_TYPE_CAPACITY.KINGBED).toBe(2)
  })
})

describe('selectTitleTargets', () => {
  it('mode "one" mengembalikan halaman kartu itu sendiri', () => {
    const result = selectTitleTargets(PANDUAN_TITLE_TARGETS, 'denahKamar', 'one', [])
    expect(result.map((t) => t.key)).toEqual(['denahKamar'])
  })

  it('mode "all" mengembalikan semua halaman', () => {
    const result = selectTitleTargets(PANDUAN_TITLE_TARGETS, 'denahKamar', 'all', [])
    expect(result).toHaveLength(PANDUAN_TITLE_TARGETS.length)
  })

  it('mode "some" mengembalikan halaman terpilih saja', () => {
    const result = selectTitleTargets(PANDUAN_TITLE_TARGETS, 'denahKamar', 'some', [
      'itinerary',
      'denahDuduk',
    ])
    expect(result.map((t) => t.key)).toEqual(['itinerary', 'denahDuduk'])
  })
})
