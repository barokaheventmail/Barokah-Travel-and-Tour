import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseWorkbook,
  parseDate,
  normalizePhone,
  normalizeHeader,
  buildPreview,
  buildTemplateWorkbook,
  TEMPLATE_HEADERS,
} from '../lib/excel'
import {
  FACILITY_MAX_NAME,
  FACILITY_MAX_NOTE,
  FACILITY_MAX_ITEMS,
  FACILITY_ICON_GROUPS,
  FACILITY_ICON_LABELS,
  FACILITY_ICON_OPTIONS,
  parseFacilities,
  serializeFacilities,
  validateFacilities,
} from '../lib/facilities'
import { FACILITY_ICONS } from '../components/facility-icon'
import { encodeToken, decodeToken, ticketCodeFromToken } from '../lib/scan'
import { formatLogDetail } from '../lib/log-labels'
import { CREW_PASSWORD_SUFFIX, crewPassword } from '../lib/crew-password'

const HEADERS = ['No', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'No Telp/Hp', 'No Kursi', 'No Kamar', 'No VW']

function makeBuffer(sheets: { name: string; rows: (string | number)[][] }[]): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADERS, ...sheet.rows]), sheet.name)
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as ArrayBuffer
}

function makeBufferFull(sheets: { name: string; aoa: (string | number)[][] }[]): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.aoa), sheet.name)
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as ArrayBuffer
}

function ymd(d: Date | null | undefined): string | null {
  if (!d) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

describe('parseExcel', () => {
  it('memetakan kolom dan men-disable baris tanpa nama', () => {
    const buf = makeBuffer([
      {
        name: 'Bus 1',
        rows: [
          [1, 'Ahmad Fauzi', 'Sukabumi', '12/03/1998', '085812345678', 'A1', '101', 'VW-01'],
          [2, 'Siti Rahmawati', 'Bandung', '05/11/2000', '085812345679', 'A2', '102', 'VW-01'],
          [3, '', 'kosong', '', '', '', '', ''],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    expect(result.buses).toHaveLength(1)
    expect(result.buses[0].name).toBe('Bus 1')
    expect(result.buses[0].participants).toHaveLength(2)
    // Baris tanpa nama dihitung terpisah, bukan "dilewati", karena baris kosong
    // itu normal di template.
    expect(result.skipped).toBe(0)
    expect(result.diagnostics.sheets[0].notes.join(' ')).toContain('1 baris tanpa nama')
    const ahmad = result.buses[0].participants[0]
    expect(ahmad.name).toBe('Ahmad Fauzi')
    expect(ahmad.phone).toBe('085812345678')
    expect(ahmad.seat).toBe('A1')
    expect(ahmad.vw).toBe('VW-01')
    expect(ahmad.birthPlace).toBe('Sukabumi')
    expect(ahmad.birthDate && ymd(ahmad.birthDate)).toBe('1998-03-12')
    expect(ahmad.birthDate?.getDate()).toBe(12)
  })

  it('tiap sheet jadi 1 bus', () => {
    const buf = makeBuffer([
      { name: 'Bus 1', rows: [[1, 'Andi', 'x', '', '', '', '', '']] },
      { name: 'Bus 2', rows: [[1, 'Budi', 'x', '', '', '', '', '']] },
    ])
    const result = parseWorkbook(buf)
    expect(result.buses.map((b) => b.name)).toEqual(['Bus 1', 'Bus 2'])
    expect(result.total).toBe(2)
  })

  it('mendeteksi header di tengah sheet (file ber-blok judul) & mengabaikan kolom CATATAN', () => {
    const buf = makeBufferFull([
      {
        name: 'Bus 1',
        aoa: [
          ['DATA PESERTA'],
          [''],
          ['PT.COMBIPHAR'],
          [...HEADERS, 'CATATAN'],
          [1, 'Farisa Hilmi', 'Jakarta', '12/03/1998', '085800000001', '1', '101', 'VW-01', ''],
          [2, 'Ardian', 'Bandung', '05/11/2000', '085800000002', '2', '102', 'VW-01', ''],
          [3, '', '', '', '', '', '', '', 'pindah'],
          ['CATATAN:'],
          ['x', '', '', '', '', '', '', '', ''],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    expect(result.buses).toHaveLength(1)
    expect(result.buses[0].participants).toHaveLength(2)
    // Tiga baris sisanya tidak punya nama (kolom A berisi "CATATAN:"/catatan),
    // jadi dihitung sebagai baris kosong, bukan peserta yang "dilewati".
    expect(result.skipped).toBe(0)
    expect(result.diagnostics.sheets[0].notes.join(' ')).toContain('3 baris tanpa nama')
    const farisa = result.buses[0].participants[0]
    expect(farisa.name).toBe('Farisa Hilmi')
    expect(farisa.order).toBe(1)
    expect(farisa.phone).toBe('085800000001')
    expect(farisa.birthPlace).toBe('Jakarta')
    expect(farisa.birthDate && ymd(farisa.birthDate)).toBe('1998-03-12')
    expect(result.buses[0].participants[1].order).toBe(2)
  })

  it('header tetap terdeteksi walau ada kolom kosong sebelum No', () => {
    const buf = makeBufferFull([
      {
        name: 'Bus A',
        aoa: [
          ['', ...HEADERS],
          ['', 1, 'Zainal', 'Sukabumi', '', '085700000001', '1', '201', 'VW-02'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    expect(result.total).toBe(1)
    expect(result.buses[0].participants[0].name).toBe('Zainal')
    expect(result.buses[0].participants[0].phone).toBe('085700000001')
  })

  it('membaca kolom Tipe Kamar tanpa menggeser No Kamar / No VW', () => {
    const buf = makeBufferFull([
      {
        name: 'Bus 1',
        aoa: [
          ['No', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'No. Telp/HP', 'No Kursi', 'No Kamar', 'Tipe Kamar', 'No VW'],
          [1, 'Ahmad Fauzi', 'Sukabumi', '12/03/1998', '085812345678', 'A1', '101', 'Twin', 'VW-01'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    const p = result.buses[0].participants[0]
    expect(p.room).toBe('101')
    expect(p.roomType).toBe('Twin')
    expect(p.vw).toBe('VW-01')
  })
})

describe('parseDate', () => {
  it('mendukung dd/mm/yyyy dengan 2 digit tahun dinormalisasi', () => {
    expect(ymd(parseDate('12/03/1998'))).toBe('1998-03-12')
    expect(ymd(parseDate('01-01-98'))).toBe('1998-01-01')
    expect(ymd(parseDate('5/5/30'))).toBe('2030-05-05')
  })
  it('mendukung ISO dan mengembalikan null untuk input tidak valid', () => {
    expect(ymd(parseDate('2026-10-12'))).toBe('2026-10-12')
    expect(parseDate('gibberish')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
})

describe('qr token', () => {
  const token = 'tok123abc'
  it('encode/decode membungkus & membaca ulang dengan prefiks', () => {
    const payload = encodeToken(token)
    expect(payload.startsWith('BTHT:')).toBe(true)
    expect(decodeToken(payload)).toBe(token)
  })
  it('decode menerima token polos dan URL /tiket/<token>', () => {
    expect(decodeToken(token)).toBe(token)
    expect(decodeToken('https://site.example/tiket/tok123abc')).toBe(token)
    expect(decodeToken('https://site.example/tiket/tok123abc?x=1')).toBe(token)
  })
  it('decode menolak string kosong', () => {
    expect(decodeToken('')).toBeNull()
    expect(decodeToken('   ')).toBeNull()
  })
  it('ticketCodeFromToken menghasilkan kode tiket huruf besar persis', () => {
    const date = new Date('2026-09-17T00:00:00.000Z')
    expect(ticketCodeFromToken(date, 'cmuh1z9zw0008ifaat10qud8e')).toBe('BTH-26-QUD8E')
    expect(ticketCodeFromToken(date, 'cmu0000l3prf')).toBe('BTH-26-L3PRF')
  })
})

describe('fasilitas', () => {
  it('parseFacilities membaca JSON dan membuang item tanpa nama', () => {
    const raw = JSON.stringify([
      { icon: 'snowflake', name: 'AC', note: 'Pendingin kabin' },
      { icon: 'wifi', name: '   ', note: 'kosong' },
      { icon: 'usb-plug', name: 'USB', note: '' },
    ])
    expect(parseFacilities({ facilities: raw })).toEqual([
      { icon: 'snowflake', name: 'AC', note: 'Pendingin kabin' },
      { icon: 'usb-plug', name: 'USB', note: '' },
    ])
  })
  it('parseFacilities aman untuk null, JSON rusak & ikon asing', () => {
    expect(parseFacilities({ facilities: null })).toEqual([])
    expect(parseFacilities({ facilities: '{bukan json' })).toEqual([])
    expect(parseFacilities('{"a":1}')).toEqual([])
    expect(parseFacilities({ facilities: JSON.stringify([{ icon: 'nope', name: 'WiFi' }]) })).toEqual([
      { icon: 'armchair', name: 'WiFi', note: '' },
    ])
  })
  it('serializeFacilities mengembalikan null saat kosong', () => {
    expect(serializeFacilities([])).toBeNull()
    const json = serializeFacilities([{ icon: 'wifi', name: 'WiFi', note: 'Gratis' }])
    expect(parseFacilities({ facilities: json })).toEqual([{ icon: 'wifi', name: 'WiFi', note: 'Gratis' }])
  })
  it('validateFacilities menolak ikon tak dikenal & melebihi batas', () => {
    expect(validateFacilities([{ icon: 'nope', name: 'AC' }]).error).toBeTruthy()
    expect(validateFacilities([{ icon: 'wifi', name: 'x'.repeat(FACILITY_MAX_NAME + 1) }]).error).toBeTruthy()
    expect(validateFacilities([{ icon: 'wifi', name: 'WiFi', note: 'x'.repeat(FACILITY_MAX_NOTE + 1) }]).error).toBeTruthy()
    expect(validateFacilities('bukan array').error).toBeTruthy()
    const many = Array.from({ length: FACILITY_MAX_ITEMS + 1 }, (_, i) => ({ icon: 'wifi', name: `F${i}`, note: '' }))
    expect(validateFacilities(many).error).toBeTruthy()
  })
  it('validateFacilities membersihkan input dan mengabaikan baris kosong', () => {
    const res = validateFacilities([
      { icon: 'tv', name: ' TV ', note: ' Layar ' },
      { icon: 'wifi', name: '', note: 'tanpa nama' },
    ])
    expect(res.error).toBeUndefined()
    expect(res.items).toEqual([{ icon: 'tv', name: 'TV', note: 'Layar' }])
  })
  it('katalog ikon konsisten: tanpa duplikat, semua punya label & komponen', () => {
    const all = FACILITY_ICON_GROUPS.flatMap((g) => [...g.icons])
    expect(new Set(all).size).toBe(all.length)
    expect(FACILITY_ICON_OPTIONS).toEqual(all)
    expect(all.length).toBeGreaterThanOrEqual(50)
    for (const icon of all) {
      expect(FACILITY_ICON_LABELS[icon], `label ${icon}`).toBeTruthy()
      expect(FACILITY_ICONS[icon], `komponen ${icon}`).toBeTruthy()
    }
    for (const icon of Object.keys(FACILITY_ICONS)) {
      expect(FACILITY_ICON_OPTIONS, `katalog memuat ${icon}`).toContain(icon)
    }
    expect(FACILITY_ICON_OPTIONS).toContain('ellipsis')
  })
  it('validateFacilities menerima ikon baru & tetap menolak yang asing', () => {
    const res = validateFacilities([
      { icon: 'ellipsis', name: 'Lainnya', note: '' },
      { icon: 'bus-front', name: 'Armada', note: '' },
      { icon: 'plug-zap', name: 'Colokan cepat', note: '' },
    ])
    expect(res.error).toBeUndefined()
    expect(res.items.map((i) => i.icon)).toEqual(['ellipsis', 'bus-front', 'plug-zap'])
    expect(validateFacilities([{ icon: 'smart-tv', name: 'X' }]).error).toBeTruthy()
  })
})

describe('crewPassword', () => {
  it('membentuk password deterministik username + 1123', () => {
    expect(crewPassword('armada1')).toBe('armada11123')
    expect(crewPassword('armada2')).toBe('armada21123')
    expect(crewPassword('dufan')).toBe('dufan1123')
  })
  it('menggunakan suffix tetap 1123', () => {
    expect(CREW_PASSWORD_SUFFIX).toBe('1123')
  })
})

describe('label log hapus massal', () => {
  it('hapus kursi & fasilitas per unit tetap menyebut nama bus', () => {
    expect(formatLogDetail('bus.seatLayoutClear', { name: 'Bus 1' })).toBe('Layout kursi Bus 1 dihapus')
    expect(formatLogDetail('bus.facilitiesClear', { name: 'Bus 1' })).toBe('Fasilitas Bus 1 dihapus')
  })
  it('scope all menampilkan jumlah unit, bukan ???', () => {
    expect(formatLogDetail('bus.seatLayoutClear', { scope: 'all', buses: 45 })).toBe(
      'Layout kursi dihapus di 45 unit',
    )
    expect(formatLogDetail('bus.facilitiesClear', { scope: 'all', buses: 2 })).toBe('Fasilitas dihapus di 2 unit')
    expect(formatLogDetail('bus.seatLayoutClear', { scope: 'all' })).toBe('Layout kursi dihapus di ??? unit')
  })
})

describe('parseExcel toleran (template beda)', () => {
  it('tetap terbaca walau kolom No tidak ada sama sekali', () => {
    const buf = makeBufferFull([
      {
        name: 'Armada 7',
        aoa: [
          ['DATA PESERTA'],
          [''],
          ['NAMA PESERTA', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'NO. HP / WA', 'NO KURSI'],
          ['Budi Santoso', 'Bogor', '12/03/1998', '081234567890', 'A1'],
          ['Siti Aminah', 'Bandung', '05/11/2000', '081298765432', 'A2'],
          ['TOTAL', '', '', '', ''],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    expect(result.total).toBe(2)
    expect(result.buses[0].name).toBe('Armada 7')
    // Nomor berurutan dipakai karena tidak ada kolom No.
    expect(result.buses[0].participants.map((p) => p.order)).toEqual([1, 2])
    expect(result.buses[0].participants[0].name).toBe('Budi Santoso')
    expect(result.skipped).toBe(1)
    expect(result.diagnostics.skippedRows[0]).toMatchObject({ sheet: 'Armada 7', row: 6 })
    expect(result.diagnostics.skippedRows[0].reason).toContain('rekap')
  })

  it('menerima header aneh (titik, spasi berlebih, tanda kurung) & memecah TTL gabungan', () => {
    const buf = makeBufferFull([
      {
        name: 'BUS-01',
        aoa: [
          ['Rekap absen pilgrimage 2026'],
          ['no. urut', 'NAMA PESERTA (LENGKAP)', 'TTL', 'no. telp / hp', 'kursi', 'kamar', 'notes bebas'],
          ['1', 'Andi', 'Sukabumi, 12/03/1998', '+62 812-1111-2222', '1A', '101', 'x'],
          ['2', 'Rina', 'Bandung, 05/11/2000', '0812 9876 543', '2A', '102', 'y'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    expect(result.total).toBe(2)
    const [andi, rina] = result.buses[0].participants
    expect(andi.birthPlace).toBe('Sukabumi')
    expect(ymd(andi.birthDate)).toBe('1998-03-12')
    expect(andi.phone).toBe('081211112222')
    expect(rina.birthPlace).toBe('Bandung')
    expect(rina.phone).toBe('08129876543')
    // Kolom "notes bebas" tidak boleh jadi peserta.
    expect(result.diagnostics.sheets[0].unmapped.map((u) => u.header)).toEqual(['notes bebas'])
  })

  it('tidak menimpa peserta lain saat nomor duplikat', () => {
    const buf = makeBufferFull([
      {
        name: 'Bus 1',
        aoa: [
          ['No', 'Nama'],
          ['1', 'Andi'],
          ['1', 'Rina'],
          ['', 'Toni'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    const orders = result.buses[0].participants.map((p) => p.order)
    expect(new Set(orders).size).toBe(3)
    expect(result.buses[0].participants.map((p) => p.name)).toEqual(['Andi', 'Rina', 'Toni'])
    expect(result.diagnostics.sheets[0].notes.join(' ')).toContain('duplikat')
  })

  it('membaca kolom tanpa header lewat isi kolom (tanggal & HP ditebak)', () => {
    const buf = makeBufferFull([
      {
        name: 'Data',
        aoa: [
          ['LAPORAN PESERTA'],
          [''],
          ['1', 'Agus', 'Bandung', '07/04/1995', '081234500001'],
          ['2', 'Bambang', 'Solo', '08/05/1996', '081234500002'],
          ['3', 'Cahyo', 'Solo', '09/06/1997', '081234500003'],
          ['4', 'Dedi', 'Solo', '10/07/1998', '081234500004'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    // Tidak ada header yang cocok: kolom dibaca sebagai data pertama.
    expect(result.total).toBe(4)
    expect(result.diagnostics.sheets[0].headerRow).toBeNull()
    const first = result.buses[0].participants[0]
    expect(first.name).toBe('Agus')
    expect(ymd(first.birthDate)).toBe('1995-04-07')
    expect(first.phone).toBe('081234500001')
  })

  it('menebak kolom tanggal & HP dari isi walau header tidak menyebutnya', () => {
    const buf = makeBufferFull([
      {
        name: 'Bus 3',
        aoa: [
          ['Nama', 'Tempat Lahir', 'Keterangan 1', 'Keterangan 2'],
          ['Andi', 'Bandung', '07/04/1995', '081234500001'],
          ['Rina', 'Solo', '08/05/1996', '081234500002'],
          ['Toni', 'Malang', '09/06/1997', '081234500003'],
          ['Sari', 'Solo', '10/07/1998', '081234500004'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    expect(result.total).toBe(4)
    const first = result.buses[0].participants[0]
    expect(first.name).toBe('Andi')
    expect(ymd(first.birthDate)).toBe('1995-04-07')
    expect(first.phone).toBe('081234500001')
    const kinds = result.diagnostics.sheets[0].mappings.map((m) => `${m.field}:${m.kind}`)
    expect(kinds).toContain('birthDate:inferred')
    expect(kinds).toContain('phone:inferred')
  })

  it('membaca file tanpa header sama sekali berdasarkan urutan template', () => {
    const buf = makeBufferFull([
      {
        name: 'Peserta',
        aoa: [
          ['1', 'Zaenab', 'Solo', '01/02/1995', '081111111111'],
          ['2', 'Yuni', 'Solo', '02/02/1996', '081222222222'],
          ['3', 'Wawan', 'Solo', '03/02/1997', '081333333333'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    expect(result.total).toBe(3)
    expect(result.buses[0].participants.map((p) => p.name)).toEqual(['Zaenab', 'Yuni', 'Wawan'])
    expect(result.diagnostics.warnings.join(' ')).toContain('urutan template')
  })

  it('memecah satu sheet menjadi beberapa unit dari kolom Bus', () => {
    const buf = makeBufferFull([
      {
        name: 'Data',
        aoa: [
          ['Armada', 'Nama', 'Asal', 'Tanggal Lahir', 'Kontak'],
          ['Armada A', 'Gita', 'Solo', '01/02/1995', '081111111111'],
          ['Armada A', 'Hana', 'Solo', '02/02/1996', '081222222222'],
          ['Armada B', 'Indah', 'Malang', '03/02/1997', '081333333333'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    expect(result.buses.map((b) => b.name)).toEqual(['Armada A', 'Armada B'])
    expect(result.buses.map((b) => b.participants.length)).toEqual([2, 1])
    expect(result.buses[0].participants[0].name).toBe('Gita')
  })

  it('menandai sheet yang tidak terbaca, bukan diam-diam membuangnya', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No', 'Nama'], ['1', 'Good Data']]), 'Bus 1')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b'], ['c', 'd']]), 'Catatan Internal')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as ArrayBuffer
    const result = parseWorkbook(buf)
    expect(result.buses.map((b) => b.name)).toEqual(['Bus 1'])
    const ignored = result.diagnostics.sheets.find((s) => s.name === 'Catatan Internal')
    expect(ignored?.status).not.toBe('ok')
    expect(result.diagnostics.warnings.join(' ')).toContain('Catatan Internal')
  })

  it('menandai sheet kosong sebagai "tidak berisi peserta", bukan "tidak terbaca"', () => {
    const buf = makeBufferFull([
      { name: 'Bus 1', aoa: [[...HEADERS], [1, 'Ani', 'Solo', '', '', '', '', '']] },
      { name: 'Bus 2', aoa: [[...HEADERS], [1, '', '', '', '', '', '', '']] },
    ])
    const result = parseWorkbook(buf)
    const empty = result.diagnostics.sheets.find((s) => s.name === 'Bus 2')
    expect(empty?.status).toBe('empty')
    expect(result.diagnostics.warnings.join(' ')).toContain('tidak berisi peserta')
    expect(result.buses.map((b) => b.name)).toEqual(['Bus 1'])
  })

  it('membaca file CSV (satu sheet, nama unit dari kolom Bus)', () => {
    const csv = 'No,Nama Lengkap,No HP,Armada\n1,Fuad,0812 111 222,Armada 3\n2,Gani,0812 333 444,Armada 3\n'
    const buf = new TextEncoder().encode(csv).buffer as ArrayBuffer
    const result = parseWorkbook(buf, 'peserta.csv')
    expect(result.buses.map((b) => b.name)).toEqual(['Armada 3'])
    expect(result.total).toBe(2)
    expect(result.buses[0].participants[0].phone).toBe('0812111222')
  })

  it('menyamakan nama unit yang kembar antar sheet', () => {
    const buf = makeBufferFull([
      { name: 'Armada A', aoa: [[...HEADERS], [1, 'Andi', '', '', '', '', '', '']] },
      {
        name: 'Data',
        aoa: [
          ['Nama', 'Armada'],
          ['Budi', 'Armada A'],
          ['Cahyo', 'Armada A'],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    // DB punya unique (event, name) jadi nama kembar harus dibedakan.
    expect(result.buses.map((b) => b.name)).toEqual(['Armada A', 'Armada A (2)'])
  })

  it('menolak rekap bertrailing angka dan TTL yang dipisah spasi', () => {
    const buf = makeBufferFull([
      {
        name: 'Armada 5',
        aoa: [
          ['Nama', 'TTL', 'HP / WA', 'Armada'],
          ['Agus', 'Bandung 07/04/1995', '+62 812-1111-2222', 'Armada 5'],
          ['Bambang', 'Solo 08/05/1996', '0812999', 'Armada 5'],
          ['TOTAL 2 orang', '', '', ''],
          ['Jumlah: 2', '', '', ''],
        ],
      },
    ])
    const result = parseWorkbook(buf)
    // "TOTAL 2 orang" / "Jumlah: 2" bukan peserta.
    expect(result.total).toBe(2)
    expect(result.skipped).toBe(2)
    expect(result.buses.map((b) => b.name)).toEqual(['Armada 5'])
    const [agus, bambang] = result.buses[0].participants
    // dd/mm/yyyy, bukan m/d/y: 7 April 1995.
    expect(agus.birthPlace).toBe('Bandung')
    expect(ymd(agus.birthDate)).toBe('1995-04-07')
    expect(agus.phone).toBe('081211112222')
    expect(bambang.birthPlace).toBe('Solo')
    expect(ymd(bambang.birthDate)).toBe('1996-05-08')
    // 6 digit bukan nomor telepon.
    expect(bambang.phone).toBeNull()
  })

  it('tidak menebak tanggal dari teks asing', () => {
    expect(parseDate('Bandung 07/04/1995')).toBeNull()
    expect(parseDate('31/02/1998')).toBeNull()
    expect(parseDate('12/03/1998')).not.toBeNull()
    expect(ymd(parseDate('12/03/1998'))).toBe('1998-03-12')
  })

  it('menghitung total baris dilewati dengan benar walau contoh dibatasi 200', () => {
    const rows: (string | number)[][] = [[...HEADERS]]
    for (let i = 1; i <= 260; i += 1) rows.push([i, `Peserta ${i}`, '', '', '', '', '', ''])
    rows.push(['TOTAL', '', '', '', '', '', '', ''])
    const result = parseWorkbook(makeBufferFull([{ name: 'Bus 1', aoa: rows }]))
    expect(result.total).toBe(260)
    // Contoh dibatasi, tapi angka di UI harus jujur.
    expect(result.diagnostics.skippedRows).toHaveLength(1)
    expect(result.skipped).toBe(1)
    expect(result.diagnostics.skippedTotal).toBe(1)
  })

  it('buildPreview memberi tanggal sebagai yyyy-mm-dd tanpa bergeser hari', () => {
    const buf = makeBufferFull([
      { name: 'Bus 1', aoa: [[...HEADERS], [1, 'Andi', 'Solo', '12/03/1998', '085812345678', '', '', '']] },
    ])
    const preview = buildPreview(parseWorkbook(buf))
    expect(preview.buses[0].sample[0].birthDate).toBe('1998-03-12')
    expect(preview.total).toBe(1)
  })
})

describe('normalizePhone', () => {
  it('menormalkan nomor Indonesia dari berbagai bentuk', () => {
    expect(normalizePhone('081234567890')).toBe('081234567890')
    expect(normalizePhone('+62 812-3456-7890')).toBe('081234567890')
    expect(normalizePhone('628123456789')).toBe('08123456789')
    // Angka 8123456789 kehilangan nol depan di Excel, jadi dikembalikan ke 0...
    expect(normalizePhone(8123456789)).toBe('08123456789')
    expect(normalizePhone('812-3456-789')).toBe('08123456789')
    expect(normalizePhone('')).toBeNull()
  })
})

describe('normalizeHeader', () => {
  it('menyeragamkan variasi penulisan header', () => {
    expect(normalizeHeader(' NO. TELP/HP ')).toBe('no telp hp')
    expect(normalizeHeader('NAMA PESERTA (LENGKAP)')).toBe('nama peserta lengkap')
    expect(normalizeHeader('Tanggal  Lahir')).toBe('tanggal lahir')
  })
})

describe('template Excel resmi', () => {
  function readTemplate() {
    const wb = XLSX.read(buildTemplateWorkbook(), { type: 'array' })
    return wb
  }

  it('setiap baris contoh punya jumlah sel sama dengan header', () => {
    const wb = readTemplate()
    expect(wb.SheetNames).toEqual(['Bus 1', 'Bus 2'])
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '', blankrows: true })
      expect(rows[0]).toEqual([...TEMPLATE_HEADERS])
      for (const row of rows.slice(1)) {
        // Guard bug kolom bergeser: satu sel kurang = semua kolom setelahnya geser.
        expect({ sheet: name, len: row.length }).toEqual({ sheet: name, len: TEMPLATE_HEADERS.length })
      }
    }
  })

  it('lebar kolom template tertulis dan sinkron dengan jumlah header', () => {
    // cellStyles dipakai hanya saat membaca; file-nya memang sudah menyimpan wch.
    const wb = XLSX.read(buildTemplateWorkbook(), { type: 'array', cellStyles: true })
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name] as XLSX.WorkSheet & { '!cols'?: { wch?: number }[] }
      expect(sheet['!cols']).toHaveLength(TEMPLATE_HEADERS.length)
      for (const col of sheet['!cols'] ?? []) expect(col.wch).toBeGreaterThan(0)
    }
  })

  it('file template terbaca kembali tanpa kolom yang bergeser', () => {
    const result = parseWorkbook(buildTemplateWorkbook(), 'template-peserta-barokah.xlsx')
    expect(result.total).toBe(4)
    expect(result.skipped).toBe(0)
    expect(result.buses.map((b) => b.name)).toEqual(['Bus 1', 'Bus 2'])
    expect(result.buses.map((b) => b.participants.length)).toEqual([2, 2])

    const [fauzi, siti] = result.buses[0].participants
    expect(fauzi).toMatchObject({
      order: 1,
      name: 'Ahmad Fauzi',
      birthPlace: 'Sukabumi',
      phone: '085812345678',
      seat: 'A1',
      room: '101',
      roomType: 'Twin',
      vw: 'VW-01',
    })
    expect(ymd(fauzi.birthDate)).toBe('1998-03-12')
    // Baris kedua sempat pernah salah jumlah selnya; ini yang mengunci perbaikannya.
    expect(siti).toMatchObject({
      order: 2,
      name: 'Siti Rahmawati',
      birthPlace: 'Bandung',
      phone: '085812345679',
      seat: 'A2',
      room: '102',
      roomType: 'Twin',
      vw: 'VW-01',
    })
    expect(ymd(siti.birthDate)).toBe('2000-11-05')
  })
})
