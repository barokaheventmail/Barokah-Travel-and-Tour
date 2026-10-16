import { describe, expect, it } from 'vitest'
import { vehicleSectionTitle, vehicleTypeTitle } from './participant-groups'

const none = { vw: 0, jeepParis: 0, jeepMerapi: 0, jeepBromo: 0 }

describe('vehicleTypeTitle', () => {
  it('memakai Nama VW untuk bagian VW', () => {
    expect(vehicleTypeTitle(0, 'VW MAGELANG')).toBe('VW MAGELANG')
  })

  it('memakai "VW MAGELANG" bila Nama VW kosong', () => {
    expect(vehicleTypeTitle(0, '')).toBe('VW MAGELANG')
    expect(vehicleTypeTitle(0, null)).toBe('VW MAGELANG')
  })

  it('override vwTitle menang untuk bagian VW', () => {
    expect(vehicleTypeTitle(0, 'VW MAGELANG', '  VW ISTIMEWA  ')).toBe('VW ISTIMEWA')
  })

  it('memakai nama tetap untuk tiap jenis jeep', () => {
    expect(vehicleTypeTitle(1)).toBe('JEEP PARIS')
    expect(vehicleTypeTitle(2)).toBe('JEEP MERAPI')
    expect(vehicleTypeTitle(3)).toBe('JEEP BROMO')
  })

  it('memakai "Tanpa Kendaraan" untuk yang belum ditempatkan', () => {
    expect(vehicleTypeTitle(4)).toBe('Tanpa Kendaraan')
  })

  it('override tidak mengubah judul bagian jeep', () => {
    expect(vehicleTypeTitle(1, 'VW MAGELANG', 'VW ISTIMEWA')).toBe('JEEP PARIS')
  })
})

describe('vehicleSectionTitle', () => {
  it('memakai override vwTitle bila diisi', () => {
    expect(vehicleSectionTitle({ ...none, vw: 10 }, 'VW MAGELANG', '  Denah Spesial  ')).toBe('Denah Spesial')
  })

  it('menampilkan Nama VW bila ada VW', () => {
    expect(vehicleSectionTitle({ ...none, vw: 5 }, 'VW MAGELANG')).toBe('VW MAGELANG')
  })

  it('memakai "VW MAGELANG" bila Nama VW kosong tapi ada VW', () => {
    expect(vehicleSectionTitle({ ...none, vw: 5 }, '')).toBe('VW MAGELANG')
    expect(vehicleSectionTitle({ ...none, vw: 5 }, null)).toBe('VW MAGELANG')
  })

  it('memakai nama jeep bila hanya ada jeep', () => {
    expect(vehicleSectionTitle({ ...none, jeepParis: 3 })).toBe('JEEP PARIS')
    expect(vehicleSectionTitle({ ...none, jeepMerapi: 3 })).toBe('JEEP MERAPI')
    expect(vehicleSectionTitle({ ...none, jeepBromo: 3 })).toBe('JEEP BROMO')
  })

  it('mengutamakan VW saat event punya VW dan jeep', () => {
    expect(vehicleSectionTitle({ vw: 10, jeepParis: 4, jeepMerapi: 5, jeepBromo: 0 }, 'VW MAGELANG')).toBe(
      'VW MAGELANG',
    )
  })

  it('kembali ke "Denah VW" bila tidak ada kendaraan', () => {
    expect(vehicleSectionTitle(none, 'VW MAGELANG')).toBe('Denah VW')
  })
})
