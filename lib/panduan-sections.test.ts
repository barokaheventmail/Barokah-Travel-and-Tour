import { describe, expect, it } from 'vitest'
import {
  BUILTIN_SECTION_KEYS,
  MAX_SECTION_ITEMS,
  defaultPanduanSections,
  parsePanduanSections,
  serializePanduanSections,
  splitSectionItems,
  type PanduanSectionItem,
} from './panduan-sections'

describe('parsePanduanSections', () => {
  it('memakai urutan bawaan saat nilai kosong / null', () => {
    const hasil = parsePanduanSections(null)
    expect(hasil.map((s) => (s.type === 'builtin' ? s.builtin : 'custom'))).toEqual([...BUILTIN_SECTION_KEYS])
  })

  it('memakai urutan bawaan saat JSON tidak valid', () => {
    expect(parsePanduanSections('{bukan json')).toEqual(defaultPanduanSections())
  })

  it('membaca node builtin & custom sesuai urutan tersimpan', () => {
    const value = JSON.stringify([
      { id: 'c1', type: 'custom', title: 'Perlengkapan', items: ['Topi', 'Jaket'], note: 'Tanda (*) opsional' },
      { id: 'rules', type: 'builtin', builtin: 'rules' },
    ])
    const hasil = parsePanduanSections(value)
    expect(hasil).toHaveLength(2)
    expect(hasil[0]).toMatchObject({ type: 'custom', title: 'Perlengkapan', items: ['Topi', 'Jaket'], note: 'Tanda (*) opsional' })
    expect(hasil[1]).toMatchObject({ type: 'builtin', builtin: 'rules' })
  })

  it('melewati node tidak dikenal dan key builtin yang salah', () => {
    const value = JSON.stringify([
      { id: 'x', type: 'builtin', builtin: 'tidak-ada' },
      { id: 'y', type: 'aneh' },
      null,
      { id: 'z', type: 'custom', title: 'Judul', items: [], note: '' },
    ])
    const hasil = parsePanduanSections(value)
    expect(hasil).toHaveLength(1)
    expect(hasil[0]).toMatchObject({ type: 'custom', title: 'Judul' })
  })

  it('membatasi jumlah item ke MAX_SECTION_ITEMS dan membuang item kosong', () => {
    const many = Array.from({ length: 60 }, (_, i) => `Item ${i + 1}`)
    const value = JSON.stringify([{ id: 'c1', type: 'custom', title: 'Banyak', items: ['', ...many, '  '], note: '' }])
    const hasil = parsePanduanSections(value)
    expect(hasil[0].type).toBe('custom')
    if (hasil[0].type === 'custom') {
      expect(hasil[0].items).toHaveLength(MAX_SECTION_ITEMS)
      expect(hasil[0].items[0]).toBe('Item 1')
    }
  })

  it('kembali ke urutan bawaan bila hasil parse kosong', () => {
    expect(parsePanduanSections('[]')).toEqual(defaultPanduanSections())
  })
})

describe('serializePanduanSections', () => {
  it('mempertahankan urutan dan membuang custom yang benar-benar kosong', () => {
    const items: PanduanSectionItem[] = [
      { id: 'a', type: 'custom', title: '  ', items: ['', '  '], note: '   ' },
      { id: 'rules', type: 'builtin', builtin: 'rules' },
      { id: 'b', type: 'custom', title: 'Perlengkapan', items: ['Topi', ' '], note: 'Catatan' },
    ]
    const hasil = JSON.parse(serializePanduanSections(items))
    expect(hasil).toEqual([
      { id: 'rules', type: 'builtin', builtin: 'rules' },
      { id: 'b', type: 'custom', title: 'Perlengkapan', items: ['Topi'], note: 'Catatan' },
    ])
  })
})

describe('splitSectionItems', () => {
  it('satu kolom bila item <= 20', () => {
    const items = Array.from({ length: 20 }, (_, i) => `i${i + 1}`)
    const { left, right } = splitSectionItems(items)
    expect(left).toHaveLength(20)
    expect(right).toHaveLength(0)
  })

  it('20 item pertama di kiri, sisanya di kanan bila lebih dari 20', () => {
    const items = Array.from({ length: 40 }, (_, i) => `i${i + 1}`)
    const { left, right } = splitSectionItems(items)
    expect(left).toHaveLength(20)
    expect(right).toHaveLength(20)
    expect(left[0]).toBe('i1')
    expect(left[19]).toBe('i20')
    expect(right[0]).toBe('i21')
    expect(right[19]).toBe('i40')
  })

  it('aman untuk daftar kosong', () => {
    expect(splitSectionItems([])).toEqual({ left: [], right: [] })
  })
})
