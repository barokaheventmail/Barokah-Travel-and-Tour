import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { buildTicketPdf, ticketFileName, type TicketPdfData } from './ticket-pdf'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const logo = new Uint8Array(readFileSync('public/logo-barokah-event.png'))

const data = {
  token: 'cmunepcsd04964kqfjnzdecbwabc',
  name: 'Cahya Aryani',
  ticketCode: 'BTH-26-ABCDE',
  eventTitle: 'Family Gathering PT Combiphar 2026',
  eventDate: 'Sabtu, 3 Oktober 2026',
  eventLocation: 'Pantai Carita, Pandeglang',
  busName: 'Bus 01',
  seat: '12A',
  room: '204',
  vw: 'VW 044',
  crew: 'Ahmad Fauzi · Siti Rahma',
  attended: true,
  scannedBy: 'crew1',
  logoPng: logo,
}

describe('buildTicketPdf', () => {
  it('menghasilkan file PDF yang valid', async () => {
    const bytes = await buildTicketPdf(data)
    expect(bytes.byteLength).toBeGreaterThan(1000)
    const header = Buffer.from(bytes.slice(0, 5)).toString('latin1')
    expect(header).toBe('%PDF-')
    // Penutup standar pdf-lib; kalau tidak ketemu berarti file terpotong.
    expect(Buffer.from(bytes).toString('latin1')).toContain('%%EOF')
  })

  it('PDF-nya bisa dibuka ulang (bukan halaman rusak)', async () => {
    const bytes = await buildTicketPdf(data)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    const page = doc.getPage(0)
    // A4 portrait.
    expect(Math.round(page.getWidth())).toBe(595)
    expect(Math.round(page.getHeight())).toBe(842)
  })

  it('status absensi "Belum Hadir" tetap bisa dibuat', async () => {
    const bytes = await buildTicketPdf({ ...data, attended: false, scannedBy: null })
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
  })

  it('field kosong tidak bikin error dan tidak ada "undefined" di PDF', async () => {
    const bytes = await buildTicketPdf({
      ...data,
      seat: null,
      room: null,
      vw: null,
      eventLocation: null,
      crew: '',
      attended: false,
      scannedBy: null,
    })
    const isi = Buffer.from(bytes).toString('latin1')
    expect(isi).not.toContain('undefined')
    expect(isi).not.toContain('NaN')
  })

  it('nama peserta yang sangat panjang tidak menggagalkan pembuatan', async () => {
    const panjang = 'Ahmad Fauzi Bin Abdul Somad Al Bakar Al Hasaniyah '.repeat(6)
    const bytes = await buildTicketPdf({ ...data, name: panjang, crew: panjang })
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
  })

  it('label VW tidak jadi "VW VW 044"', async () => {
    const bytes = await buildTicketPdf({ ...data, vw: 'VW 044' })
    expect(bytes.byteLength).toBeGreaterThan(1000)
    const isi = Buffer.from(bytes).toString('latin1')
    expect(isi).not.toContain('VW VW')
  })

  // Konten tiket digambar manual (bukan flow), jadi isi yang ekstrem bisa
  // mendorong QR ke luar halaman. Ketiga kasus ini yang paling mungkin terjadi
  // di lapangan: field minimal, isi normal, dan nama/crew kepanjangan.
  const layouts: [string, Partial<TicketPdfData>][] = [
    ['field minimal', { seat: null, room: null, vw: null, eventLocation: null, crew: '', attended: false, scannedBy: null }],
    ['isi normal', {}],
    [
      'nama & crew kepanjangan',
      {
        name: 'Ahmad Fauzi Bin Abdul Somad Al Bakar Al Hasaniyah '.repeat(4),
        eventTitle: 'Family Gathering PT Combiphar 2026 - Retret Tahunan Karyawan '.repeat(4),
        crew: 'Ahmad Fauzi Bin Abdul Somad Al Bakar Al Hasaniyah '.repeat(6),
      },
    ],
  ]

  for (const [label, override] of layouts) {
    it(`tidak ada yang keluar halaman saat ${label}`, async () => {
      const bytes = await buildTicketPdf({ ...data, ...override })
      const { lowest, qrSize } = lowestContent(bytes)
      // Margin bawah 48pt; di bawah itu konten tercetak keluar area cetak.
      expect(lowest).toBeGreaterThanOrEqual(48)
      // QR tetap di bawah 120pt supaya modulnya masih kebaca scanner.
      expect(qrSize).toBeGreaterThanOrEqual(120)
    })
  }
})

/**
 * Batas bawah konten & ukuran QR, dibaca dari content stream. Stream-nya
 * dikompresi Flate, jadi harus di-inflate dulu sebelum di-parse.
 */
function lowestContent(bytes: Uint8Array): { lowest: number; qrSize: number } {
  const raw = Buffer.from(bytes)
  let content = ''
  let at = 0
  for (;;) {
    const start = raw.indexOf('stream', at)
    if (start < 0) break
    let from = start + 'stream'.length
    if (raw[from] === 0x0d) from += 1
    if (raw[from] === 0x0a) from += 1
    const end = raw.indexOf('endstream', from)
    if (end < 0) break
    try {
      content += `${inflateSync(raw.subarray(from, end))}\n`
    } catch {
      // Bukan stream Flate (mis. font atau gambar) - lewati.
    }
    at = end + 'endstream'.length
  }

  const rects = [...content.matchAll(/([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re/g)].map((m) => ({
    bottom: Math.min(+m[2], +m[2] + +m[4]),
  }))
  const images = [...content.matchAll(/1 0 0 1 ([\d.-]+) ([\d.-]+) cm\s+1 0 0 1 0 0 cm\s+([\d.]+) 0 0 ([\d.]+) 0 0 cm/g)]
  const sizes = images.map((m) => +m[3]).filter((size) => size > 60)
  const bottoms = [...rects.map((r) => r.bottom), ...images.map((m) => +m[2])]
  // Kosong berarti tidak ada yang bisa diparse -> gagal, bukan lolos diam-diam.
  expect(bottoms.length).toBeGreaterThan(0)
  return { lowest: Math.min(...bottoms), qrSize: Math.max(...sizes, 0) }
}

describe('ticketFileName', () => {
  it('membuat nama file dari nama peserta', () => {
    expect(ticketFileName('Cahya Aryani', 'BTH-26-ABCDE')).toBe('tiket-cahya-aryani.pdf')
  })

  it('spasi berlebih jadi satu tanda hubung', () => {
    expect(ticketFileName('Ahmad   Fauzi', 'X')).toBe('tiket-ahmad-fauzi.pdf')
  })

  it('karakter yang tidak aman untuk filename dibuang', () => {
    expect(ticketFileName('Budi /Santoso*', 'X')).toBe('tiket-budi-santoso.pdf')
  })

  it('nama kosong atau cuma simbol jatuh ke nomor tiket', () => {
    expect(ticketFileName('***', 'BTH-26-ABCDE')).toBe('tiket-BTH-26-ABCDE.pdf')
    expect(ticketFileName('   ', 'BTH-26-ABCDE')).toBe('tiket-BTH-26-ABCDE.pdf')
  })

  it('panjang nama dibatasi supaya tidak jadi nama file kepanjangan', () => {
    const nama = ticketFileName('A'.repeat(200), 'X')
    expect(nama.length).toBeLessThanOrEqual(50)
  })
})