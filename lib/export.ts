import ExcelJS from 'exceljs'

export type ExportStatusFilter = 'all' | 'hadir' | 'belum'

export type ExportParticipant = {
  order: number
  name: string
  birthPlace: string | null
  birthDate: Date | null
  phone: string | null
  seat: string | null
  room: string | null
  roomType: string | null
  vw: string | null
  scannedAt: Date | null
  scannedBy: string | null
}

export type ExportBus = {
  id: string
  name: string
  order: number
  participants: ExportParticipant[]
}

export type ExportInput = {
  eventTitle: string
  eventDate: Date
  buses: ExportBus[]
}

export type ExportFilter = {
  busId?: string | null
  status: ExportStatusFilter
}

/** Warna header: biru tua yang sama dengan tombol admin. */
const HEADER_FILL = 'FF163D78'
const BORDER = 'FFD6DCE4'
const HADIR_FILL = 'FFE6F4EA'
const BELUM_FILL = 'FFF1F3F5'

const COLUMNS: { header: string; key: keyof ExportParticipant | 'status'; width: number }[] = [
  { header: 'No', key: 'order', width: 6 },
  { header: 'Nama', key: 'name', width: 26 },
  { header: 'Tempat Lahir', key: 'birthPlace', width: 16 },
  { header: 'Tgl Lahir', key: 'birthDate', width: 13 },
  { header: 'No HP', key: 'phone', width: 16 },
  { header: 'Kursi', key: 'seat', width: 10 },
  { header: 'Kamar', key: 'room', width: 10 },
  { header: 'Tipe Kamar', key: 'roomType', width: 12 },
  { header: 'VW', key: 'vw', width: 12 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Waktu Scan', key: 'scannedAt', width: 18 },
  { header: 'Crew', key: 'scannedBy', width: 14 },
]

/** dd/MM/yyyy dari komponen tanggal lokal, sama seperti tampilan tabel admin. */
export function formatTanggalExport(d: Date | null | undefined): string {
  if (!d) return ''
  const day = d.getDate()
  const month = d.getMonth() + 1
  if (!day || !month) return ''
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${d.getFullYear()}`
}

export function formatWaktuScan(d: Date | null | undefined): string {
  if (!d) return ''
  const base = formatTanggalExport(d)
  if (!base) return ''
  return `${base} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function matchesStatus(p: ExportParticipant, status: ExportStatusFilter): boolean {
  if (status === 'hadir') return p.scannedAt !== null
  if (status === 'belum') return p.scannedAt === null
  return true
}

/** Buang unit yang tidak dipilih & peserta yang tidak sesuai filter status. */
export function filterBuses(buses: ExportBus[], filter: ExportFilter): ExportBus[] {
  return buses
    .filter((b) => !filter.busId || b.id === filter.busId)
    .map((b) => ({ ...b, participants: b.participants.filter((p) => matchesStatus(p, filter.status)) }))
}

/** Nama sheet Excel: maksimal 31 karakter, tanpa karakter terlarang, tetap unik. */
export function sanitizeSheetName(raw: string, taken: Set<string>): string {
  const cleaned = (raw || 'Unit').replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim()
  const base = (cleaned || 'Unit').slice(0, 31)
  if (!taken.has(base)) {
    taken.add(base)
    return base
  }
  for (let n = 2; n < 1000; n += 1) {
    const suffix = ` (${n})`
    const candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
    if (!taken.has(candidate)) {
      taken.add(candidate)
      return candidate
    }
  }
  return base
}

export function exportFileName(
  eventTitle: string,
  busName: string | null,
  status: ExportStatusFilter,
  ext: 'xlsx' | 'csv',
): string {
  const safe = (s: string) => s.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)
  const parts = ['peserta', safe(eventTitle) || 'event']
  parts.push(busName ? `bus-${safe(busName)}` : 'semua')
  if (status !== 'all') parts.push(status)
  return `${parts.join('-')}.${ext}`
}

function fillRow(row: ExcelJS.Row, argb?: string) {
  if (!argb) return
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
  })
}

function addBusSheet(wb: ExcelJS.Workbook, bus: ExportBus, sheetName: string) {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }))
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  ws.getRow(1).height = 22
  ws.getRow(1).alignment = { vertical: 'middle' }
  ws.getRow(1).eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER } },
      left: { style: 'thin', color: { argb: BORDER } },
      bottom: { style: 'thin', color: { argb: BORDER } },
      right: { style: 'thin', color: { argb: BORDER } },
    }
  })
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } }
  // Judul sheet ikut berulang saat dicetak.
  ws.pageSetup.printTitlesRow = '1:1'

  const sorted = [...bus.participants].sort((a, b) => a.order - b.order)
  for (const p of sorted) {
    const row = ws.addRow({
      order: p.order,
      name: p.name,
      birthPlace: p.birthPlace,
      birthDate: formatTanggalExport(p.birthDate),
      phone: p.phone,
      seat: p.seat,
      room: p.room,
      roomType: p.roomType,
      vw: p.vw,
      status: p.scannedAt ? 'HADIR' : 'BELUM',
      scannedAt: formatWaktuScan(p.scannedAt),
      scannedBy: p.scannedBy,
    })
    row.alignment = { vertical: 'middle' }
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
    row.getCell(1).numFmt = '0'
    // No HP, No Kursi, No Kamar, Tipe Kamar & VW disimpan sebagai teks supaya
    // tidak jadi notasi ilmiah.
    for (const idx of [5, 6, 7, 8, 9]) row.getCell(idx).numFmt = '@'
    fillRow(row, p.scannedAt ? HADIR_FILL : BELUM_FILL)
  }

  if (sorted.length === 0) {
    const note = ws.addRow(['', 'Tidak ada peserta yang sesuai filter.'])
    note.getCell(2).font = { italic: true, color: { argb: 'FF8A93A3' } }
  }

  return ws
}

function addRekapSheet(wb: ExcelJS.Workbook, input: ExportInput, buses: ExportBus[]) {
  const ws = wb.addWorksheet('Rekap', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ws.columns = [
    { key: 'bus', width: 26 },
    { key: 'total', width: 12 },
    { key: 'hadir', width: 10 },
    { key: 'belum', width: 10 },
    { key: 'seat', width: 14 },
    { key: 'room', width: 14 },
  ]

  ws.mergeCells('A1:F1')
  const title = ws.getCell('A1')
  title.value = `Rekap Peserta — ${input.eventTitle}`
  title.font = { bold: true, size: 14, color: { argb: 'FF1B3555' } }
  title.alignment = { vertical: 'middle' }
  ws.getRow(1).height = 26

  ws.mergeCells('A2:F2')
  const sub = ws.getCell('A2')
  sub.value = `Tanggal acara: ${formatTanggalExport(input.eventDate)} · dibuat ${formatWaktuScan(new Date())}`
  sub.font = { size: 10, color: { argb: 'FF8A93A3' } }

  // Label header ditulis eksplisit ke baris 4, bukan lewat `header:` di ws.columns
  // (itu selalu menulis ke baris 1 dan akan tertimpa judul).
  const REKAP_HEADERS = ['Unit', 'Peserta', 'Hadir', 'Belum', 'Kursi Terisi', 'Kamar Terisi']
  const header = ws.getRow(4)
  REKAP_HEADERS.forEach((label, i) => {
    header.getCell(i + 1).value = label
  })
  header.height = 22
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER } },
      left: { style: 'thin', color: { argb: BORDER } },
      bottom: { style: 'thin', color: { argb: BORDER } },
      right: { style: 'thin', color: { argb: BORDER } },
    }
  })

  const totals = { total: 0, hadir: 0, belum: 0, seat: 0, room: 0 }
  for (const bus of buses) {
    const hadir = bus.participants.filter((p) => p.scannedAt).length
    const seat = bus.participants.filter((p) => p.seat && p.seat.trim()).length
    const room = bus.participants.filter((p) => p.room && p.room.trim()).length
    const row = ws.addRow({
      bus: bus.name,
      total: bus.participants.length,
      hadir,
      belum: bus.participants.length - hadir,
      seat,
      room,
    })
    totals.total += bus.participants.length
    totals.hadir += hadir
    totals.belum += bus.participants.length - hadir
    totals.seat += seat
    totals.room += room
    for (let i = 2; i <= 6; i += 1) {
      row.getCell(i).alignment = { vertical: 'middle', horizontal: 'center' }
      row.getCell(i).numFmt = '0'
    }
  }

  const totalRow = ws.addRow({ bus: 'TOTAL', ...totals })
  totalRow.font = { bold: true, color: { argb: 'FF1B3555' } }
  totalRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF0F7' } }
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER } },
      left: { style: 'thin', color: { argb: BORDER } },
      bottom: { style: 'double', color: { argb: BORDER } },
      right: { style: 'thin', color: { argb: BORDER } },
    }
    if (colNumber > 1) cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  return ws
}

/** Workbook export: sheet Rekap + 1 sheet per unit. */
export function buildExportWorkbook(input: ExportInput, filter: ExportFilter): ExcelJS.Workbook {
  const buses = filterBuses(input.buses, filter)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Barokah Travel & Tour'
  wb.created = new Date()
  addRekapSheet(wb, input, buses)
  const taken = new Set<string>(['Rekap'])
  for (const bus of buses) {
    addBusSheet(wb, bus, sanitizeSheetName(bus.name, taken))
  }
  return wb
}

/** CSV datar (format lama), tanggal sudah dirapikan ke dd/MM/yyyy. */
export function buildExportCsv(input: ExportInput, filter: ExportFilter): string {
  const buses = filterBuses(input.buses, filter)
  const header = ['No', 'Nama', 'Tempat Lahir', 'Tgl Lahir', 'No HP', 'Kursi', 'Kamar', 'Tipe Kamar', 'VW', 'Bus', 'Status', 'Waktu Scan', 'Crew']
  const cell = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [header.map(cell).join(',')]
  for (const bus of buses) {
    for (const p of [...bus.participants].sort((a, b) => a.order - b.order)) {
      lines.push(
        [
          p.order,
          p.name,
          p.birthPlace ?? '',
          formatTanggalExport(p.birthDate),
          p.phone ?? '',
          p.seat ?? '',
          p.room ?? '',
          p.roomType ?? '',
          p.vw ?? '',
          bus.name,
          p.scannedAt ? 'HADIR' : 'BELUM',
          formatWaktuScan(p.scannedAt),
          p.scannedBy ?? '',
        ]
          .map(cell)
          .join(','),
      )
    }
  }
  return lines.join('\r\n')
}
