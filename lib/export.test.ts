import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import {
  buildExportCsv,
  buildExportWorkbook,
  exportFileName,
  filterBuses,
  formatTanggalExport,
  formatWaktuScan,
  sanitizeSheetName,
  type ExportBus,
  type ExportInput,
} from './export'

function peserta(n: number, over: Partial<ExportBus['participants'][number]> = {}) {
  return {
    order: n,
    name: `Peserta ${n}`,
    birthPlace: 'Bandung',
    birthDate: new Date(1998, 2, 12, 0, 0, 0),
    phone: '08123456789',
    seat: `${n}A`,
    room: '101',
    vw: 'B',
    scannedAt: null as Date | null,
    scannedBy: null as string | null,
    ...over,
  }
}

function bus(id: string, name: string, order: number, participants: ExportBus['participants']): ExportBus {
  return { id, name, order, participants }
}

function input(): ExportInput {
  return {
    eventTitle: 'Rihlah Umrah Bandung',
    eventDate: new Date(Date.UTC(2026, 2, 1)),
    buses: [
      bus('b1', 'Bus 01', 1, [
        peserta(1),
        peserta(2, { scannedAt: new Date(2026, 2, 1, 6, 5), scannedBy: 'admin' }),
      ]),
      bus('b2', 'Bus 02', 2, [peserta(1)]),
      bus('b3', 'Bus 03', 3, []),
    ],
  }
}

describe('formatTanggalExport', () => {
  it('pakai komponen tanggal lokal agar tidak bergeser sehari', () => {
    // Tanggal lahir dari parser import disimpan sebagai tengah malam lokal (WIB = 17:00 UTC).
    const d = new Date(1998, 2, 12, 0, 0, 0)
    expect(formatTanggalExport(d)).toBe('12/03/1998')
    // Bandingkan dengan versi UTC yang dulu dipakai export CSV.
    if (d.getTimezoneOffset() > 0) expect(d.toISOString().slice(0, 10)).not.toBe('1998-03-12')
  })

  it('format waktu scan dd/MM/yyyy HH:mm dan aman untuk null', () => {
    const d = new Date(2026, 2, 1, 6, 5)
    expect(formatWaktuScan(d)).toBe('01/03/2026 06:05')
    expect(formatWaktuScan(null)).toBe('')
    expect(formatTanggalExport(null)).toBe('')
  })
})

describe('filterBuses', () => {
  const buses = input().buses

  it('status all mencakup semuanya', () => {
    expect(filterBuses(buses, { status: 'all' }).map((b) => b.id)).toEqual(['b1', 'b2', 'b3'])
    expect(filterBuses(buses, { status: 'all' })[0].participants).toHaveLength(2)
  })

  it('status hadir hanya yang sudah scan', () => {
    const hasil = filterBuses(buses, { status: 'hadir' })
    expect(hasil[0].participants).toHaveLength(1)
    expect(hasil[0].participants[0].scannedBy).toBe('admin')
    expect(hasil[1].participants).toHaveLength(0)
  })

  it('status belum hanya yang belum scan', () => {
    const hasil = filterBuses(buses, { status: 'belum' })
    expect(hasil[0].participants).toHaveLength(1)
    expect(hasil[0].participants[0].scannedAt).toBeNull()
  })

  it('busId menyisakan satu armada saja', () => {
    const hasil = filterBuses(buses, { busId: 'b2', status: 'all' })
    expect(hasil).toHaveLength(1)
    expect(hasil[0].id).toBe('b2')
  })
})

describe('sanitizeSheetName', () => {
  it('memotong nama panjang dan membuang karakter terlarang', () => {
    const taken = new Set<string>()
    const nama = sanitizeSheetName('Bus / [Khusus] :*A?B\\C 01 yang sangat panjang sekali', taken)
    expect(nama.length).toBeLessThanOrEqual(31)
    expect(nama).not.toMatch(/[\\/?*[\]:]/)
  })

  it('menjaga nama tetap unik', () => {
    const taken = new Set<string>()
    expect(sanitizeSheetName('Bus 01', taken)).toBe('Bus 01')
    expect(sanitizeSheetName('Bus 01', taken)).toBe('Bus 01 (2)')
    expect(taken.size).toBe(2)
  })
})

describe('exportFileName', () => {
  it('menyertakan armada dan status', () => {
    expect(exportFileName('Rihlah Bandung', null, 'all', 'xlsx')).toBe('peserta-Rihlah_Bandung-semua.xlsx')
    expect(exportFileName('Rihlah Bandung', 'Bus 03', 'hadir', 'xlsx')).toBe('peserta-Rihlah_Bandung-bus-Bus_03-hadir.xlsx')
    expect(exportFileName('Rihlah Bandung', null, 'all', 'csv')).toMatch(/\.csv$/)
  })
})

describe('buildExportWorkbook', () => {
  it('punya sheet Rekap + satu sheet per armada', () => {
    const wb = buildExportWorkbook(input(), { status: 'all' })
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Rekap', 'Bus 01', 'Bus 02', 'Bus 03'])
  })

  it('armada kosong dengan filter status tetap dapat sheet', () => {
    const wb = buildExportWorkbook(input(), { status: 'hadir' })
    const bus02 = wb.getWorksheet('Bus 02')!
    expect(bus02.getCell('B2').value).toBe('Tidak ada peserta yang sesuai filter.')
  })

  it('sheet armada rapi: header styled, membeku, ada autoFilter, semua kolom punya width', () => {
    const ws = buildExportWorkbook(input(), { status: 'all' }).getWorksheet('Bus 01')!
    const header = ws.getRow(1)
    expect([5, 6, 7, 8].map((i) => ws.getColumn(i).width)).toEqual([16, 10, 10, 12])
    expect(header.getCell(1).font?.bold).toBe(true)
    expect(header.getCell(1).font?.color?.argb).toBe('FFFFFFFF')
    expect((header.getCell(1).fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FF163D78')
    expect(ws.views).toEqual([{ state: 'frozen', ySplit: 1 }])
    expect(ws.autoFilter).toEqual({ from: { row: 1, column: 1 }, to: { row: 1, column: 11 } })
    expect(ws.getColumn(11).width).toBe(14)
  })

  it('tidak ada kolom Bus di sheet armada (sama dengan nama sheet)', () => {
    const ws = buildExportWorkbook(input(), { status: 'all' }).getWorksheet('Bus 01')!
    const headers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => ws.getRow(1).getCell(i).value)
    expect(headers).toEqual(['No', 'Nama', 'Tempat Lahir', 'Tgl Lahir', 'No HP', 'Kursi', 'Kamar', 'VW', 'Status', 'Waktu Scan', 'Crew'])
  })

  it('isi baris: tanggal dd/MM/yyyy lokal, status, waktu scan, no HP teks', () => {
    const ws = buildExportWorkbook(input(), { status: 'all' }).getWorksheet('Bus 01')!
    const baris = { belum: ws.getRow(2), hadir: ws.getRow(3) }
    expect(baris.belum.getCell(4).value).toBe('12/03/1998')
    expect(baris.belum.getCell(9).value).toBe('BELUM')
    expect(baris.belum.getCell(10).value).toBe('')
    expect(baris.hadir.getCell(9).value).toBe('HADIR')
    expect(baris.hadir.getCell(10).value).toBe('01/03/2026 06:05')
    expect(baris.hadir.getCell(11).value).toBe('admin')
    expect(baris.hadir.getCell(5).value).toBe('08123456789')
    expect(baris.hadir.getCell(5).numFmt).toBe('@')
  })

  it('baris HADIR diberi fill hijau, BELUM abu-abu', () => {
    const ws = buildExportWorkbook(input(), { status: 'all' }).getWorksheet('Bus 01')!
    expect((ws.getRow(2).getCell(2).fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFF1F3F5')
    expect((ws.getRow(3).getCell(2).fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFE6F4EA')
  })

  it('sheet Rekap: judul, tabel per armada, dan baris TOTAL benar', () => {
    const ws = buildExportWorkbook(input(), { status: 'all' }).getWorksheet('Rekap')!
    expect(ws.getCell('A1').value).toBe('Rekap Peserta — Rihlah Umrah Bandung')
    expect([1, 2, 3, 4, 5, 6].map((i) => ws.getRow(4).getCell(i).value)).toEqual([
      'Unit',
      'Peserta',
      'Hadir',
      'Belum',
      'Kursi Terisi',
      'Kamar Terisi',
    ])
    expect([1, 2, 3, 4, 5, 6].map((i) => ws.getRow(5).getCell(i).value)).toEqual(['Bus 01', 2, 1, 1, 2, 2])
    expect([1, 2, 3, 4, 5, 6].map((i) => ws.getRow(7).getCell(i).value)).toEqual(['Bus 03', 0, 0, 0, 0, 0])
    expect([1, 2, 3, 4, 5, 6].map((i) => ws.getRow(8).getCell(i).value)).toEqual(['TOTAL', 3, 1, 2, 3, 3])
    expect(ws.views).toEqual([{ state: 'frozen', ySplit: 4 }])
  })

  it('rekap ikut menyesuaikan filter', () => {
    const ws = buildExportWorkbook(input(), { status: 'hadir' }).getWorksheet('Rekap')!
    expect(ws.getRow(5).getCell(3).value).toBe(1)
    expect(ws.getRow(5).getCell(4).value).toBe(0)
    expect(ws.getRow(6).getCell(2).value).toBe(0)
  })

  it('file xlsx valid dan terbaca SheetJS dengan nilai yang benar', async () => {
    const wb = buildExportWorkbook(input(), { busId: 'b1', status: 'all' })
    const buf = await wb.xlsx.writeBuffer()
    const data = XLSX.read(buf, { type: 'array' })
    expect(data.SheetNames).toEqual(['Rekap', 'Bus 01'])
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(data.Sheets['Bus 01'], { header: 1 })
    expect(rows[0]).toContain('Tgl Lahir')
    expect(rows[1]).toContain('12/03/1998')
    expect(rows[2]).toContain('01/03/2026 06:05')
    expect(rows[2]).toContain('HADIR')
  })
})

describe('buildExportCsv', () => {
  it('menyertakan kolom Bus dan tanggal sudah dd/MM/yyyy', () => {
    const csv = buildExportCsv(input(), { status: 'all' })
    const baris = csv.split('\r\n')
    expect(baris[0]).toContain('"Tgl Lahir"')
    expect(baris[0]).toContain('"Bus"')
    expect(baris[1]).toContain('"Bus 01"')
    expect(baris[1]).toContain('"12/03/1998"')
    expect(baris.length).toBe(4) // header + 3 peserta
  })

  it('menghormati filter armada dan status', () => {
    expect(buildExportCsv(input(), { busId: 'b2', status: 'all' }).split('\r\n')).toHaveLength(2)
    expect(buildExportCsv(input(), { status: 'belum' }).split('\r\n')).toHaveLength(3)
  })

  it('meng-escape tanda kutip', () => {
    const kustom = input()
    kustom.buses[0].participants[0].name = 'Ahmad "Alun"'
    expect(buildExportCsv(kustom, { status: 'all' })).toContain('"Ahmad ""Alun"""')
  })
})
