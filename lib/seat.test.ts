import { describe, expect, it } from 'vitest'
import {
  clampCellSize,
  nextSeq,
  parseCellSize,
  parseSeatLayout,
  rowFirstSeat,
  seatCount,
  seatNumberMatrix,
  toggleCell,
  toggleCol,
  toggleRow,
  validateSeatShape,
  SEAT_CELL_MAX,
} from './seat'

/** Grid 3x3 kosong, semua nonaktif. */
const kosong = () => [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
]

const flat = (m: (number | null)[][]) => m.map((r) => r.map((n) => (n === null ? '·' : n)).join('')).join(' | ')

describe('nomor kursi mengikuti urutan klik', () => {
  it('baris 3 lalu 1 lalu 2 menghasilkan [3, 1, 2]', () => {
    let cells = kosong()
    cells = toggleRow(cells, 2)
    cells = toggleRow(cells, 0)
    cells = toggleRow(cells, 1)
    expect(flat(seatNumberMatrix(3, 3, cells))).toBe('456 | 789 | 123')
  })

  it('bukan urutan indeks baris —snapshot yang menangkap regression [1, 2, 3]', () => {
    // Kalau penomoran ikut posisi grid, hasilnya baris 3 = 7..9 di kolom
    // paling kanan. Yang benar: baris 3 dapat nomor paling awal.
    let cells = kosong()
    cells = toggleRow(cells, 2)
    const m = seatNumberMatrix(3, 3, cells)
    expect(m[2][0]).toBe(1)
    expect(m[0][0]).toBeNull()
  })

  it('kolom 2 lalu kolom 1 menghasilkan [2, 1]', () => {
    let cells = kosong()
    cells = toggleCol(cells, 1)
    cells = toggleCol(cells, 0)
    expect(flat(seatNumberMatrix(3, 3, cells))).toBe('41· | 52· | 63·')
  })

  it('klik sel satuan ikut urut, bukan posisi', () => {
    let cells = kosong()
    cells = toggleCell(cells, 2, 2) // (3,3)
    cells = toggleCell(cells, 0, 0) // (1,1)
    expect(flat(seatNumberMatrix(3, 3, cells))).toBe('2·· | ··· | ··1')
  })

  it('sel lalu baris: sel yang diklik dulu nomornya lebih kecil', () => {
    let cells = toggleCell(kosong(), 0, 0)
    cells = toggleRow(cells, 2)
    const m = seatNumberMatrix(3, 3, cells)
    expect(m[0][0]).toBe(1)
    expect(m[2][0]).toBe(2)
  })
})

describe('klik baris & kolom', () => {
  it('klik baris menyalakan seluruh isinya', () => {
    const cells = toggleRow(kosong(), 1)
    expect(seatCount(cells)).toBe(3)
    expect(cells[1]).toEqual([1, 2, 3])
  })

  it('klik baris yang sudah penuh mematikan semuanya', () => {
    const cells = toggleRow(toggleRow(kosong(), 1), 1)
    expect(seatCount(cells)).toBe(0)
    expect(cells[1]).toEqual([0, 0, 0])
  })

  it('klik kolom menyalakan seluruh isinya dan klik kedua mematikan', () => {
    const on = toggleCol(kosong(), 2)
    expect(seatCount(on)).toBe(3)
    expect(seatCount(toggleCol(on, 2))).toBe(0)
  })

  it('baris & kolom bertumpuk: klik kolom tidak menimpa urutan yang sudah ada', () => {
    let cells = toggleRow(kosong(), 0)
    cells = toggleCol(cells, 0)
    // (1,1) sudah aktif jadi nomornya tetap 1, sisanya menyusul
    expect(flat(seatNumberMatrix(3, 3, cells))).toBe('123 | 4·· | 5··')
    expect(seatCount(cells)).toBe(5)
  })

  it('klik kolom pada baris yang sudah penuh hanya mengisi yang kosong', () => {
    let cells = toggleRow(kosong(), 1)
    cells = toggleCol(cells, 0)
    expect(seatCount(cells)).toBe(5)
    expect(cells[0][0]).toBeGreaterThan(0)
  })

  it('sel yang dinonaktifkan tidak menggeser nomor kursi lain', () => {
    let cells = toggleRow(kosong(), 0)
    cells = toggleRow(cells, 1)
    cells = toggleRow(cells, 2)
    cells = toggleCell(cells, 0, 0)
    // (1,1) mati, jadi 8 kursi yang tersisa dirapatkan ulang 1..8 rapat.
    // Yang penting: tidak ada nomor dobel atau lompatan.
    expect(flat(seatNumberMatrix(3, 3, cells))).toBe('·12 | 345 | 678')
    expect(seatCount(cells)).toBe(8)
  })

  it('indeks di luar jangkauan tidak merusak layout', () => {
    const cells = kosong()
    expect(toggleRow(cells, 9)).toBe(cells)
    expect(toggleCol(cells, 9)).toBe(cells)
    expect(toggleCell(cells, 9, 9)).toBe(cells)
  })

  it('fungsi toggle tidak mengubah array asal', () => {
    const cells = kosong()
    toggleRow(cells, 0)
    toggleCell(cells, 1, 1)
    expect(cells).toEqual(kosong())
  })
})

describe('nomor Always 1..N tanpa duplikat', () => {
  it('urutanTdup dari layout lama (semua 1) dirapikan', () => {
    const m = seatNumberMatrix(2, 2, [
      [1, 1],
      [1, 1],
    ])
    expect(flat(m)).toBe('12 | 34')
  })

  it('nomor berurutan rapat walau ada lompatan urutan', () => {
    const m = seatNumberMatrix(2, 2, [
      [9, 40],
      [3, 100],
    ])
    expect(flat(m)).toBe('23 | 14')
  })
})

describe('rowFirstSeat', () => {
  it('mengembalikan nomor terkecil di baris itu, mengikuti urutan klik', () => {
    let cells = toggleRow(kosong(), 2)
    cells = toggleRow(cells, 0)
    // baris 3 diklik lebih dulu, jadi dapat nomor lebih kecil
    expect(rowFirstSeat(cells, 2)).toBe(1)
    expect(rowFirstSeat(cells, 1)).toBeNull()
    expect(rowFirstSeat(cells, 0)).toBe(4)
  })
})

describe('nextSeq', () => {
  it('melewati urutan yang sudah terpakai', () => {
    expect(nextSeq(kosong())).toBe(1)
    expect(nextSeq([[7, 3], [0, 12]])).toBe(13)
  })
})

describe('layout lama tetap dibaca tanpa migrasi', () => {
  it('0/1 polos dinomori seperti semula: kiri→kanan dari atas', () => {
    const l = parseSeatLayout({ seatRows: 2, seatCols: 3, seatLayout: '[[1,0,1],[1,1,0]]' })
    expect(seatCount(l.cells)).toBe(4)
    expect(flat(seatNumberMatrix(l.rows, l.cols, l.cells))).toBe('1·2 | 34·')
  })

  it('layout tersimpan dengan urutan klik persists', () => {
    const l = parseSeatLayout({ seatRows: 3, seatCols: 2, seatLayout: '[[0,5],[0,4],[0,3]]' })
    expect(flat(seatNumberMatrix(l.rows, l.cols, l.cells))).toBe('·3 | ·2 | ·1')
  })

  it('layout null tetap kosong', () => {
    expect(parseSeatLayout({ seatRows: 0, seatCols: 0, seatLayout: null }).cells).toEqual([])
    expect(parseSeatLayout({ seatRows: 2, seatCols: 2, seatLayout: 'bukan json' }).cells).toEqual([])
  })
})

describe('ukuran kotak kursi (rasio lebar:tinggi)', () => {
  it('default persegi 1:1', () => {
    expect(parseCellSize({})).toEqual({ w: 1, h: 1 })
  })

  it('membaca rasio tersimpan', () => {
    expect(parseCellSize({ seatCellW: 2, seatCellH: 1 })).toEqual({ w: 2, h: 1 })
  })

  it('membatasi nilai ke rentang yang wajar', () => {
    expect(clampCellSize(0)).toBe(1)
    expect(clampCellSize(99)).toBe(SEAT_CELL_MAX)
    expect(clampCellSize(-3)).toBe(1)
    expect(clampCellSize('abc')).toBe(1)
    expect(clampCellSize(undefined)).toBe(1)
    expect(clampCellSize(3.8)).toBe(3)
  })
})

describe('validateSeatShape menerima urutan klik', () => {
  it('menolak nilai negatif atau bukan angka', () => {
    expect(validateSeatShape(2, 2, [[1, -3], [1, 1]]).error).toBeTruthy()
    expect(validateSeatShape(2, 2, [['a', 1], [1, 1]]).error).toBeTruthy()
  })

  it('lolos dan mempertahankan urutan', () => {
    const s = validateSeatShape(2, 2, [
      [2, 0],
      [0, 1],
    ])
    expect(s.error).toBeUndefined()
    expect(s.cells).toEqual([
      [2, 0],
      [0, 1],
    ])
  })
})