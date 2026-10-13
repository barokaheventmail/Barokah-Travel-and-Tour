/**
 * Unduh tiket peserta langsung ke folder Download, tanpa jendela cetak.
 *
 * Tiket digambar ulang dari data memakai `pdf-lib`, bukan difoto dari DOM
 * (html2canvas). Alasannya QR: html2canvas meraster QR dan sering membuat
 * modul-modulnya kehilangan kontras, yang berujung QR gagal discan crew.
 * `pdf-lib` menyisipkan PNG QR apa adanya (dari `qrDataUrl`), jadi tetap
 * tajam dan identik dengan yang dicetak. Teksnya juga teks sungguhan, bukan
 * foto, jadi bisa dicari dan disalin.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { encodeToken, qrDataUrl } from './scan'
import { vwLabel } from './print'

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 48

const NAVY = rgb(0.106, 0.31, 0.612)
const NAVY_DEEP = rgb(0.051, 0.157, 0.314)
const INK = rgb(0.106, 0.208, 0.333)
const MUTED = rgb(0.396, 0.439, 0.502)
const LINE = rgb(0.874, 0.894, 0.91)
const SOFT = rgb(0.973, 0.98, 0.988)
const WHITE = rgb(1, 1, 1)
const GREEN = rgb(0.173, 0.659, 0.29)
const GREEN_BG = rgb(0.902, 0.957, 0.918)
const AMBER = rgb(0.725, 0.541, 0.071)
const AMBER_BG = rgb(1, 0.969, 0.878)

const LABEL = 7.5
const VALUE = 11

export type TicketPdfData = {
  token: string
  name: string
  ticketCode: string
  eventTitle: string
  eventDate: string
  eventLocation?: string | null
  busName: string
  seat?: string | null
  room?: string | null
  vw?: string | null
  crew?: string | null
  attended: boolean
  scannedBy?: string | null
  logoPng: Uint8Array
}

/** Pecah teks panjang jadi baris-baris yang muat di lebar tertentu. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
    } else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Label kecil di atas sebuah nilai. */
function drawField(
  page: PDFPage,
  x: number,
  y: number,
  label: string,
  value: string,
  width: number,
  bold: PDFFont
): void {
  page.drawText(label.toUpperCase(), { x, y, size: LABEL, font: bold, color: MUTED })
  const lines = wrap(value, bold, VALUE, width)
  let lineY = y - 15
  for (const line of lines.slice(0, 2)) {
    page.drawText(line, { x, y: lineY, size: VALUE, font: bold, color: INK })
    lineY -= VALUE + 3
  }
}

/** Panel bersudut untuk sekelompok field. */
function panel(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = SOFT
): void {
  page.drawRectangle({ x, y, width, height, color: fill, borderColor: LINE, borderWidth: 0.75 })
}

/** Garis putus-putus untuk memisahkan tiket dari bagian yang harus dicoret. */
function dashedLine(page: PDFPage, x: number, y: number, width: number): void {
  const dash = 5
  const gap = 4
  for (let cx = x; cx < x + width; cx += dash + gap) {
    page.drawRectangle({ x: cx, y, width: Math.min(dash, x + width - cx), height: 1, color: LINE })
  }
}

export async function buildTicketPdf(data: TicketPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  const page = doc.addPage([A4.width, A4.height])
  const { width, height } = page.getSize()
  const inner = width - MARGIN * 2

  // 150pt ≈ 53mm. PNG-nya di-generate sekali di resolusi tinggi lalu
  // diskalakan, bukan diperkecil dari bitmap beresolusi rendah.
  const qrSize = 150
  const qrBytes = Uint8Array.from(Buffer.from((await qrDataUrl(encodeToken(data.token), 600)).split(',')[1], 'base64'))
  const qrImage = await doc.embedPng(qrBytes)
  const logo = await doc.embedPng(data.logoPng).catch(() => null)

  const right = width - MARGIN

  const drawRight = (text: string, atY: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) => {
    page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y: atY, size, font, color })
  }

  // ---- Kepala: logo di kiri, identitas tiket di kanan ------------------
  const logoH = 30
  if (logo) {
    const scale = logoH / logo.height
    const w = logo.width * scale
    page.drawImage(logo, { x: MARGIN, y: height - MARGIN - logoH, width: w, height: logoH })
  } else {
    page.drawText('Barokah', { x: MARGIN, y: height - MARGIN - 22, size: 15, font: bold, color: NAVY })
    page.drawText('Event', { x: MARGIN, y: height - MARGIN - 36, size: 9, font: regular, color: MUTED })
  }

  const titleW = inner - (logo ? 190 : 0)
  const titleLines = wrap(data.eventTitle, regular, 9, titleW).slice(0, 2)
  drawRight('TIKET WISATA', height - MARGIN - 14, bold, 14, NAVY_DEEP)
  titleLines.forEach((line, i) => drawRight(line, height - MARGIN - 30 - i * 12, regular, 9, MUTED))

  let y = height - MARGIN - Math.max(logoH, 46) - 12
  page.drawRectangle({ x: MARGIN, y, width: inner, height: 2.5, color: NAVY })
  y -= 26

  // ---- Nama peserta dalam panel ----------------------------------------
  const nameLines = wrap(data.name, bold, 15, inner - 32)
  const nameH = 34 + nameLines.length * 20
  panel(page, MARGIN, y - nameH, inner, nameH)
  page.drawText('NAMA PESERTA', { x: MARGIN + 16, y: y - 20, size: LABEL, font: bold, color: MUTED })
  nameLines.slice(0, 3).forEach((line, i) => {
    page.drawText(line, { x: MARGIN + 16, y: y - 42 - i * 20, size: 15, font: bold, color: INK })
  })
  y -= nameH + 24

  // ---- Status absensi sebagai pill, rata kanan --------------------------
  const statusText = data.attended ? 'SUDAH HADIR' : 'BELUM HADIR'
  const pillW = bold.widthOfTextAtSize(statusText, 8.5) + 26
  const pillH = 20
  page.drawRectangle({
    x: right - pillW,
    y: y - pillH + 4,
    width: pillW,
    height: pillH,
    color: data.attended ? GREEN_BG : AMBER_BG,
  })
  page.drawText(statusText, {
    x: right - pillW + 13,
    y: y - pillH + 11,
    size: 8.5,
    font: bold,
    color: data.attended ? GREEN : AMBER,
  })
  page.drawText('STATUS ABSENSI', { x: MARGIN, y: y - 11, size: LABEL, font: bold, color: MUTED })
  y -= 38

  // ---- Grid detail, dua kolom ------------------------------------------
  const colGap = 24
  const colWidth = (inner - colGap) / 2
  const rows: [string, string][] = [
    ['No. Tiket', data.ticketCode],
    ['Bus / Unit', data.busName],
    ['Kursi', (data.seat ?? '').trim() || '—'],
    ['Tanggal', data.eventDate],
  ]
  if ((data.room ?? '').trim()) rows.push(['Kamar', (data.room as string).trim()])
  const vw = vwLabel(data.vw)
  if (vw) rows.push(['VW', vw])
  if ((data.eventLocation ?? '').trim()) rows.push(['Lokasi', (data.eventLocation as string).trim()])

  const rowH = 40
  const rowCount = Math.ceil(rows.length / 2)
  panel(page, MARGIN, y - rowCount * rowH - 8, inner, rowCount * rowH + 16)
  for (let i = 0; i < rows.length; i += 2) {
    const rowY = y - 24 - Math.floor(i / 2) * rowH
    for (const c of [0, 1]) {
      const row = rows[i + c]
      if (!row) continue
      drawField(page, MARGIN + 16 + c * (colWidth + colGap), rowY, row[0], row[1], colWidth - 16, bold)
    }
  }
  y -= rowCount * rowH + 34

  // ---- Crew --------------------------------------------------------------
  // Nama peserta & crew dipotong 3/2 baris. Kalau tidak dipotong, isi yang
  // ekstrem (nama 100+ karakter) membuat QR terdorong keluar halaman.
  const crew = (data.crew ?? '').trim()
  if (crew) {
    const crewLines = wrap(crew, regular, 10, inner - 32).slice(0, 2)
    const crewH = 36 + crewLines.length * 14
    panel(page, MARGIN, y - crewH, inner, crewH)
    page.drawText('CREW BERTUGAS', { x: MARGIN + 16, y: y - 20, size: LABEL, font: bold, color: MUTED })
    crewLines.forEach((line, i) => {
      page.drawText(line, { x: MARGIN + 16, y: y - 38 - i * 14, size: 10, font: regular, color: INK })
    })
    y -= crewH + 26
  }

  // ---- Batas potong + QR --------------------------------------------------
  dashedLine(page, MARGIN, y, inner)
  y -= 26

  page.drawText('Pindai QR ini di depan crew', {
    x: (width - bold.widthOfTextAtSize('Pindai QR ini di depan crew', 10.5)) / 2,
    y,
    size: 10.5,
    font: bold,
    color: INK,
  })
  y -= 20

  // QR mengecil kalau ruang sisa menipis, tapi tidak di bawah 120pt (~42mm):
  // di bawah itu modul QR mulai sulit dibaca scanner ponsel.
  const qrBoxPad = 10
  const qrRoom = y - MARGIN - 46 - qrBoxPad * 2
  const qrDraw = Math.max(120, Math.min(qrSize, qrRoom))
  page.drawRectangle({
    x: (width - qrDraw) / 2 - qrBoxPad,
    y: y - qrDraw - qrBoxPad,
    width: qrDraw + qrBoxPad * 2,
    height: qrDraw + qrBoxPad * 2,
    color: WHITE,
    borderColor: LINE,
    borderWidth: 1,
  })
  page.drawImage(qrImage, { x: (width - qrDraw) / 2, y: y - qrDraw, width: qrDraw, height: qrDraw })
  y -= qrDraw + qrBoxPad + 26

  const hint = 'Tunjukkan QR ini ke crew saat absensi keberangkatan.'
  page.drawText(hint, {
    x: (width - regular.widthOfTextAtSize(hint, 9)) / 2,
    y,
    size: 9,
    font: regular,
    color: MUTED,
  })
  y -= 16
  if (data.attended) {
    const note = data.scannedBy ? `Kehadiran tercatat oleh crew ${data.scannedBy}.` : 'Kehadiran Anda sudah tercatat.'
    page.drawText(note, { x: (width - bold.widthOfTextAtSize(note, 9)) / 2, y, size: 9, font: bold, color: GREEN })
  }

  return doc.save()
}

/** Nama file yang aman untuk filesystem. */
export function ticketFileName(name: string, ticketCode: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 40)
  return `tiket-${slug || ticketCode}.pdf`
}