import * as XLSX from 'xlsx'
import { z } from 'zod'

export type ExcelParticipant = {
  order: number
  name: string
  birthPlace?: string | null
  birthDate?: Date | null
  phone?: string | null
  seat?: string | null
  room?: string | null
  roomType?: string | null
  vw?: string | null
}

export type ExcelBus = {
  name: string
  participants: ExcelParticipant[]
}

export type ExcelParseResult = {
  buses: ExcelBus[]
  total: number
  skipped: number
  diagnostics: ParseDiagnostics
}

export type FieldKey = keyof Omit<ExcelParticipant, 'name'>
export type AssignableField = FieldKey | 'name' | 'bus'

/** Cara sebuah kolom dipetakan ke field. Ditampilkan di UI preview. */
export type MatchKind = 'exact' | 'alias' | 'contains' | 'regex' | 'fuzzy' | 'inferred' | 'positional'

export type ColumnMapping = {
  field: AssignableField
  column: number
  header: string
  kind: MatchKind
  score: number
}

export type SheetDiagnostic = {
  name: string
  status: 'ok' | 'empty' | 'ignored'
  /** 1-based, sama dengan nomor baris di Excel. */
  headerRow: number | null
  mappings: ColumnMapping[]
  unmapped: { column: number; header: string }[]
  notes: string[]
  dataRows: number
  participants: number
}

export type SkippedRow = {
  sheet: string
  row: number
  reason: string
  name?: string
}

export type ParseDiagnostics = {
  sheets: SheetDiagnostic[]
  warnings: string[]
  skippedRows: SkippedRow[]
  skippedTotal: number
}

type FieldAssign = Partial<Record<AssignableField, number>>

/** Batas contoh baris yang dikembalikan ke UI. */
const SKIPPED_SAMPLE_LIMIT = 200
const PREVIEW_ROWS_PER_BUS = 20

/** Header template resmi. Dipakai juga oleh route unduh template. */
export const TEMPLATE_HEADERS = [
  'No',
  'Nama Lengkap',
  'Tempat Lahir',
  'Tanggal Lahir',
  'No Telp/Hp',
  'No Kursi',
  'No Kamar',
  'Tipe Kamar',
  'No VW',
] as const

const FIELD_LABEL: Record<AssignableField, string> = {
  order: 'No',
  name: 'Nama',
  birthPlace: 'Tempat Lahir',
  birthDate: 'Tanggal Lahir',
  phone: 'No Telp/Hp',
  seat: 'No Kursi',
  room: 'No Kamar',
  roomType: 'Tipe Kamar',
  vw: 'No VW',
  bus: 'Unit',
}

const FIELD_ORDER: AssignableField[] = [
  'order',
  'name',
  'birthPlace',
  'birthDate',
  'phone',
  'seat',
  'room',
  'roomType',
  'vw',
  'bus',
]

/** Alias per field, sudah dalam bentuk ternormalisasi (huruf kecil, a-z0-9, spasi). */
const FIELD_ALIASES: Record<AssignableField, string[]> = {
  order: [
    'no',
    'no urut',
    'no urutan',
    'nomor',
    'nomor urut',
    'no peserta',
    'no absen',
    'urutan',
    'absen',
    'idx',
    'no id',
    'nomor peserta',
  ],
  name: ['nama', 'nama lengkap', 'nama peserta', 'nama data', 'peserta', 'nama pax', 'pax', 'namalengkap'],
  birthPlace: ['tempat lahir', 'tempat', 'kota', 'kota lahir', 'place of birth', 'tpl', 'tempat lahir kota'],
  birthDate: [
    'tanggal lahir',
    'tgl lahir',
    'tanggal',
    'tgl',
    'ttl',
    'date of birth',
    'tanggal lahir peserta',
    'tgllahir',
    'tanggal lahir tgl',
  ],
  phone: [
    'no telp',
    'no telp hp',
    'no hp',
    'no wa',
    'no whatsapp',
    'hp',
    'telp',
    'telepon',
    'no telepon',
    'nomer hp',
    'nomor hp',
    'kontak',
    'contact',
    'no hp wa',
    'no hps',
    'notelp',
    'no tlp',
    'notelpon',
  ],
  seat: ['no kursi', 'kursi', 'no seat', 'seat', 'nomor kursi', 'no kursi bus', 'kursi bus', 'seat number'],
  room: ['no kamar', 'kamar', 'no room', 'room', 'penginapan', 'nomor kamar', 'no kamar hotel', 'kamar hotel'],
  roomType: [
    'tipe kamar',
    'type kamar',
    'tipe room',
    'room type',
    'jenis kamar',
    'tipe penginapan',
    'kategori kamar',
    'class kamar',
    'kelas kamar',
  ],
  vw: ['no vw', 'vw', 'vehicle', 'no kendaraan', 'kendaraan', 'mobil', 'no mobil', 'nomor vw'],
  bus: ['bus', 'unit', 'armada', 'no bus', 'nama bus', 'kendaraan bus', 'bus armada', 'nama armada', 'no armada', 'armada bus', 'nama unit', 'no unit', 'unit bus', 'bus unit'],
}

/** Regex cadangan kalau alias literal tidak kena, mis. "NO. HP / WA". */
const FIELD_PATTERNS: { field: AssignableField; re: RegExp }[] = [
  { field: 'order', re: /^(no|not|noto)\b.*(urut|urutan)|^(no|not)\s*\d*$/ },
  { field: 'name', re: /nama|name/ },
  { field: 'birthPlace', re: /(tempat|tpl)\s*lahir|^kota(\s*lahir)?$/ },
  { field: 'birthDate', re: /(tanggal|tgl|tggl)\s*lahir|^(tgl|tanggal|ttl)$/ },
  {
    field: 'phone',
    re: /(no\.?\s*(telp|tlp|hp|hps|wa|whatsapp|telepon|ponsel)|\b(hp|telp|telepon|wa|whatsapp|kontak)\b)/,
  },
  { field: 'seat', re: /(no\.?\s*)?(kursi|seat)\b/ },
  { field: 'roomType', re: /(tipe|type|jenis|kategori|kelas)\s*(kamar|room|penginapan)|room\s*type/ },
  { field: 'room', re: /(no\.?\s*)?(kamar|room|penginapan)\b/ },
  { field: 'vw', re: /(no\.?\s*)?(vw|vehicle|kendaraan|mobil)\b/ },
  { field: 'bus', re: /\b(bus|unit|armada)\b/ },
]

/** Baris rekap di kaki tabel sering ikut terbaca sebagai peserta. */
const JUNK_NAME_RE =
  /^(total|tot|totl|grand\s*total|sub\s*total|subtotal|jumlah|jml|terima\s+kasih|thanks|thank\s*you|berkas|ketik|catatan|note)\b[\s:=0-9a-z]{0,30}$/i

/** Baris rekap yang tidak punya kolom nama, mis. "TOTAL 48 orang" atau "Jumlah: 48". */
const RECAP_RE = /^(total|tot|totl|grand\s*total|sub\s*total|subtotal|jumlah|jml)\b[\s:=0-9a-z]{0,30}$/i

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  mei: 5,
  may: 5,
  jun: 6,
  jul: 7,
  agu: 8,
  aug: 8,
  sep: 9,
  okt: 10,
  oct: 10,
  nov: 11,
  des: 12,
  dec: 12,
}

/* ------------------------------------------------------------------ *
 * Teks
 * ------------------------------------------------------------------ */

function cellText(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  if (raw instanceof Date) return raw.toISOString()
  if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : ''
  return String(raw).trim()
}

function cellRawAt(row: unknown[], idx: number | undefined): unknown {
  if (idx === undefined || !Array.isArray(row)) return undefined
  return row[idx]
}

function cellTextAt(row: unknown[], idx: number | undefined): string {
  return cellText(cellRawAt(row, idx))
}

/** "  NAMA  PESERTA (LENGKAP) " -> "nama peserta lengkap" */
export function normalizeHeader(raw: unknown): string {
  return cellText(raw)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

/* ------------------------------------------------------------------ *
 * Pencocokan header
 * ------------------------------------------------------------------ */

type FieldGuess = { field: AssignableField; kind: MatchKind; score: number }

function guessField(rawHeader: unknown): FieldGuess | null {
  const key = normalizeHeader(rawHeader)
  if (!key) return null
  const compact = key.replace(/ /g, '')
  let best: FieldGuess | null = null
  const offer = (candidate: FieldGuess) => {
    if (!best || candidate.score > best.score) best = candidate
  }

  // 1. Alias persis (versi berspasi dan versi rapat).
  for (const field of FIELD_ORDER) {
    if (FIELD_ALIASES[field].includes(key)) return { field, kind: 'exact', score: 100 }
    if (FIELD_ALIASES[field].includes(compact)) return { field, kind: 'alias', score: 95 }
  }

  // 2. Alias muncul di dalam header ("no telp hp utama" memuat "no telp").
  for (const field of FIELD_ORDER) {
    for (const alias of FIELD_ALIASES[field]) {
      if (alias.length < 3) continue
      if (key.includes(alias) || compact.includes(alias.replace(/ /g, ''))) {
        offer({
          field,
          kind: 'contains',
          score: 70 + Math.min(10, alias.length),
        })
      }
    }
  }
  if (best) return best

  // 3. Regex.
  for (const { field, re } of FIELD_PATTERNS) {
    if (re.test(key)) return { field, kind: 'regex', score: 60 }
  }

  // 4. Fuzzy untuk salah ketik: "nama lengkp", "tmpat lahir".
  for (const field of FIELD_ORDER) {
    for (const alias of FIELD_ALIASES[field]) {
      const sim = similarity(key, alias)
      if (sim >= 0.78) offer({ field, kind: 'fuzzy', score: Math.round(sim * 55) })
    }
  }
  return best
}

/* ------------------------------------------------------------------ *
 * Nilai
 * ------------------------------------------------------------------ */

function makeDate(year: number, month: number, day: number): Date | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  if (year < 100) year += year > 30 ? 1900 : 2000
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  // Tolak tanggal yang melimpah (31/02 tidak boleh bergeser jadi 3 Maret).
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return d
}

/** Serial number Excel (1 = 1900-01-01). */
function fromExcelSerial(n: number): Date | null {
  if (!Number.isFinite(n) || n < 20000 || n > 60000) return null
  const ms = Math.round((n - 25569) * 86400 * 1000)
  const d = new Date(ms)
  return isNaN(d.getTime()) ? null : d
}

export function parseDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw
  if (typeof raw === 'number') return fromExcelSerial(raw)

  const s = String(raw).trim()
  if (!s) return null

  // 12/03/1998, 12-3-98, 12.03.1998
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (dmy) return makeDate(+dmy[3], +dmy[2], +dmy[1])

  // 1998-03-12, 1998/03/12
  const ymd = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/)
  if (ymd) return makeDate(+ymd[1], +ymd[2], +ymd[3])

  // 12 Mar 1998, 12 Maret 1998
  const dmyName = s.match(/^(\d{1,2})[\s\-/]*([a-z]{3,9})[\s\-/]*(\d{2,4})$/i)
  if (dmyName) {
    const month = MONTHS[dmyName[2].slice(0, 3).toLowerCase()]
    if (month) return makeDate(+dmyName[3], month, +dmyName[1])
  }

  // Sengaja TIDAK memakai new Date(s) sebagai jaring pengaman:/javascript
  // bebas menebak ("Bandung 07/04/1995" terbaca jadi 4 Juli). Teks yang tidak
  // dikenali dianggap bukan tanggal, bukan diterka.
  return null
}

/** 85812345678 / +62 812-3456-7890 -> format 08xx Indonesia. */
export function normalizePhone(raw: unknown): string | null {
  let s = cellText(raw)
  if (!s) return null
  if (typeof raw === 'number') s = raw.toFixed(0)
  // Notasi ilmiah dari Excel: 8.58123E+10
  if (/e\+/i.test(s)) {
    const n = Number(s)
    if (Number.isFinite(n)) s = n.toFixed(0)
  }
  let digits = s.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('62')) digits = '0' + digits.slice(2)
  else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) digits = '0' + digits
  // Kurang dari 8 digit bukan nomor telepon (biasanya sisa kode/keterangan).
  return digits.length >= 8 ? digits : null
}

/**
 * Kolom TTL sering digabung: "Sukabumi, 12/03/1998". Pecah supaya tempat lahir
 * dan tanggal lahir tidak ada yang hilang.
 */
function splitTtl(raw: unknown): { place: string | null; date: Date | null } {
  const s = collapseSpaces(cellText(raw))
  if (!s) return { place: null, date: null }
  const direct = parseDate(s)
  if (direct) return { place: null, date: direct }
  // "Sukabumi, 12/03/1998" maupun "Bandung 07/04/1995": ambil potongan tanggal
  // di dalam teks, sisanya dianggap tempat lahir.
  const hit = s.match(
    /\d{1,2}[\s\-/]*(?:jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|may|jun(?:i)?|jul(?:i)?|agu(?:stus)?|aug|sep(?:tember)?|okt(?:ober)?|oct|nov(?:ember)?|des(?:ember)?|dec)[\s\-/]*\d{2,4}|\d{4}[\s\-/]\d{1,2}[\s\-/]\d{1,2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[\s\-/]+[a-z]{3,9}[\s\-/]*\d{2,4}/i,
  )
  if (!hit) return { place: null, date: null }
  const date = parseDate(hit[0])
  if (!date) return { place: null, date: null }
  const head = collapseSpaces(s.slice(0, hit.index))
    .replace(/[,;]+$/, '')
    .trim()
  if (!head || /\d/.test(head)) return { place: null, date }
  return { place: head, date }
}

/** Deteksi baris rekap yang tidak punya kolom nama, mis. "TOTAL 48 orang". */
function recapReason(row: unknown[]): string | null {
  const filled = row.filter((c) => cellText(c))
  if (filled.length > 2) return null
  const text = collapseSpaces(cellTextAt(row, 0))
  if (!RECAP_RE.test(text)) return null
  return `Baris rekap (${text}) tidak dihitung sebagai peserta.`
}

function junkReason(name: string): string | null {
  if (!name) return 'Nama kosong'
  if (JUNK_NAME_RE.test(name)) return 'Baris rekap (TOTAL/JUMLAH), bukan peserta'
  if (/^[\d\s.\-/*]+$/.test(name)) return 'Isi kolom nama bukan teks (kemungkinan baris rekap)'
  if (name.length < 2) return 'Nama terlalu pendek untuk dibaca sebagai peserta'
  return null
}

function isJunkName(name: string): boolean {
  return junkReason(name) !== null
}

function cleanName(raw: unknown): string {
  return collapseSpaces(cellText(raw).replace(/\s*\*+\s*$/, ''))
}

/* ------------------------------------------------------------------ *
 * Deteksi header
 * ------------------------------------------------------------------ */

/**
 * Skor satu baris sebagai kandidat header. `nama` berbobot paling tinggi
 * karena tanpa nama tidak ada yang bisa diimpor; sel kosong menurunkan skor.
 */
function scoreHeaderRow(row: unknown[]): {
  map: FieldAssign
  mappings: ColumnMapping[]
  score: number
} {
  const map: FieldAssign = {}
  const mappings: ColumnMapping[] = []
  const cands: { col: number; guess: FieldGuess }[] = []

  for (let c = 0; c < row.length; c++) {
    const guess = guessField(row[c])
    if (guess) cands.push({ col: c, guess })
  }
  cands.sort((a, b) => b.guess.score - a.guess.score || a.col - b.col)

  let score = 0
  for (const { col, guess } of cands) {
    if (map[guess.field] !== undefined) continue // kolom terkuat menang
    map[guess.field] = col
    mappings.push({
      field: guess.field,
      column: col,
      header: cellText(row[col]) || `Kolom ${col + 1}`,
      kind: guess.kind,
      score: guess.score,
    })
    score += guess.field === 'name' ? 3 : guess.field === 'order' ? 1.2 : 1
  }
  score -= (row.length - cands.length) * 0.15
  return { map, mappings, score }
}

type HeaderDetection = {
  index: number
  map: FieldAssign
  mappings: ColumnMapping[]
  positional?: boolean
  /** true kalau baris `index` adalah header dan TIDAK ikut dipakai sebagai data. */
  headerConsumed: boolean
}

/** Baris mana yang paling mungkin jadi header (dicek sampai 200 baris). */
function detectHeader(rows: unknown[][]): HeaderDetection | null {
  let best: HeaderDetection | null = null
  let bestScore = 0
  for (let i = 0; i < Math.min(rows.length, 200); i++) {
    const row = rows[i]
    if (!Array.isArray(row) || row.length === 0) continue
    // Baris dengan 1 sel terisi biasanya banner judul ("DATA PESERTA"), bukan header.
    if (row.filter((c) => cellText(c)).length < 2) continue
    const { map, mappings, score } = scoreHeaderRow(row)
    if (score <= 0 || map.name === undefined) continue
    if (score > bestScore) {
      bestScore = score
      best = { index: i, map, mappings, headerConsumed: true }
    }
  }
  return bestScore >= 1.5 ? best : null
}

/** Baris yang isinya sudah jelas data (bukan header): tanggal atau HP terbaca. */
function looksLikeDataRow(row: unknown[]): boolean {
  if (row.filter((c) => cellText(c)).length < 3) return false
  const name = cellText(row[1])
  if (!name || isJunkName(name) || /\d/.test(name)) return false
  if (parseDate(row[3])) return true
  if (normalizePhone(row[4])) return true
  return false
}

/**
 * Tanpa baris header sama sekali, pakai urutan template. Baris pertama tidak
 * diperlakukan sebagai header kalau isinya sudah terlihat seperti data, supaya
 * peserta di baris pertama tidak hilang.
 */
function positionalHeader(rows: unknown[][]): HeaderDetection | null {
  const first = rows.findIndex((r) => Array.isArray(r) && r.filter((c) => cellText(c)).length >= 2)
  if (first < 0) return null

  let index = first
  let headerConsumed = true
  const limit = Math.min(rows.length, first + 6)
  for (let i = first; i < limit; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    if (looksLikeDataRow(row)) {
      index = i
      headerConsumed = false
      break
    }
    if (i === first) {
      // Baris pertama tidak terlihat seperti data: anggap sebagai header.
      index = i
      headerConsumed = true
    } else {
      // Baris berikutnya tidak terlihat seperti data: baris pertama dianggap header.
      index = first
      headerConsumed = true
      break
    }
  }

  const width = Math.min(rows[index].length, TEMPLATE_HEADERS.length)
  const map: FieldAssign = {}
  const mappings: ColumnMapping[] = []
  for (let i = 0; i < width; i++) {
    const field = FIELD_ORDER[i]
    map[field] = i
    mappings.push({
      field,
      column: i,
      header: TEMPLATE_HEADERS[i],
      kind: 'positional',
      score: 30,
    })
  }
  return { index, map, mappings, positional: true, headerConsumed }
}

/* ------------------------------------------------------------------ *
 * Inferensi kolom dari isi
 * ------------------------------------------------------------------ */

const SIGNATURES: {
  field: AssignableField
  test: (t: string) => boolean
  label: string
}[] = [
  {
    field: 'birthDate',
    label: 'tanggal lahir',
    test: (t) =>
      /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(t) ||
      /^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}$/.test(t) ||
      /^\d{1,2}\s+[a-z]{3,9}\s+\d{2,4}$/i.test(t),
  },
  {
    field: 'phone',
    label: 'nomor HP/telepon',
    test: (t) => {
      const d = t.replace(/\D/g, '')
      return d.length >= 9 && d.length <= 14
    },
  },
  {
    field: 'seat',
    label: 'kode kursi',
    test: (t) => /^[a-z]{0,2}\s?-?\s?\d{1,2}$/i.test(t),
  },
  { field: 'room', label: 'nomor kamar', test: (t) => /^\d{1,4}$/.test(t) },
]

/**
 * Kalau sebuah field tidak punya kolom, cari dari isi data: kolom yang
 * mayoritas isinya sesuai pola field itu. Hanya diambil kalau rasionya tinggi
 * supaya tidak salah tebak.
 */
function inferColumns(
  rows: unknown[][],
  dataStart: number,
  map: FieldAssign,
  mappings: ColumnMapping[],
  notes: string[],
): void {
  const used = new Set(Object.values(map))
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const sample: unknown[][] = []
  for (let i = dataStart; i < rows.length && sample.length < 200; i++) {
    if (rows[i].some((c) => cellText(c))) sample.push(rows[i])
  }
  if (sample.length < 3) return

  for (const { field, test, label } of SIGNATURES) {
    if (map[field] !== undefined) continue
    let bestCol = -1
    let bestRatio = 0
    for (let c = 0; c < width; c++) {
      if (used.has(c)) continue
      let filled = 0
      let hits = 0
      for (const row of sample) {
        const t = cellText(row[c])
        if (!t) continue
        filled++
        if (test(t)) hits++
      }
      if (filled < Math.max(3, sample.length * 0.5)) continue
      const ratio = hits / filled
      if (ratio > bestRatio) {
        bestRatio = ratio
        bestCol = c
      }
    }
    if (bestCol >= 0 && bestRatio >= 0.6) {
      map[field] = bestCol
      used.add(bestCol)
      mappings.push({
        field,
        column: bestCol,
        header: `Kolom ${bestCol + 1} (ditebak dari isi)`,
        kind: 'inferred',
        score: Math.round(bestRatio * 50),
      })
      notes.push(
        `Kolom "${FIELD_LABEL[field]}" tidak ada di header. Kolom ${bestCol + 1} dikenali sebagai ${label} dari isinya.`,
      )
    }
  }
}

/* ------------------------------------------------------------------ *
 * Satu sheet
 * ------------------------------------------------------------------ */

type SheetParse = {
  buses: ExcelBus[]
  diagnostic: SheetDiagnostic
  skippedRows: SkippedRow[]
  /** Total baris yang benar-benar dilewati (termasuk yang tidak masuk contoh). */
  skippedCount: number
}

function isGenericSheetName(name: string): boolean {
  return /^(sheet\s*\d*|lembar\s*\d*|worksheet\s*\d*)$/i.test(name)
}

function sanitizeBusName(raw: string, fallback: string): string {
  const name = collapseSpaces(raw).replace(/\*+$/, '').trim()
  if (!name || isGenericSheetName(name)) return fallback
  return name
}

function parseSheet(sheetName: string, rows: unknown[][]): SheetParse {
  const diag: SheetDiagnostic = {
    name: sheetName,
    status: 'ignored',
    headerRow: null,
    mappings: [],
    unmapped: [],
    notes: [],
    dataRows: 0,
    participants: 0,
  }
  const skippedRows: SkippedRow[] = []
  let skippedCount = 0
  const skipRow = (row: number, reason: string, name?: string) => {
    // Contoh dibatasi supaya file 50rb baris tidak mengubah response jadi MB-an,
    // tapi hitungan totalnya tetap akurat.
    skippedCount += 1
    if (skippedRows.length < SKIPPED_SAMPLE_LIMIT) skippedRows.push({ sheet: sheetName, row, reason, name })
  }

  if (rows.length === 0) {
    diag.notes.push('Sheet kosong.')
    return { buses: [], diagnostic: diag, skippedRows, skippedCount }
  }

  const detection = detectHeader(rows) ?? positionalHeader(rows)
  if (!detection) {
    diag.notes.push('Header tidak ditemukan dan isi sheet tidak menyerupai tabel peserta. Sheet dilewati.')
    return { buses: [], diagnostic: diag, skippedRows, skippedCount }
  }

  if (detection.positional) {
    diag.notes.push(
      detection.headerConsumed
        ? `Header tidak dikenali. Baris ${detection.index + 1} dibaca sebagai header, kolom mengikuti urutan template.`
        : `Tanpa header. Baris ${detection.index + 1} adalah data pertama, kolom mengikuti urutan template.`,
    )
  } else {
    diag.notes.push(`Header terdeteksi di baris ${detection.index + 1}.`)
  }

  const { index: headerIndex, map } = detection
  const dataStart = detection.headerConsumed ? headerIndex + 1 : headerIndex
  diag.headerRow = detection.headerConsumed ? headerIndex + 1 : null
  diag.mappings = [...detection.mappings]
  inferColumns(rows, dataStart, map, diag.mappings, diag.notes)

  const width = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const mappedCols = new Set(Object.values(map))
  for (let c = 0; c < width; c++) {
    if (mappedCols.has(c)) continue
    const headerText = detection.headerConsumed ? cellText(rows[headerIndex]?.[c]) : ''
    diag.unmapped.push({ column: c, header: headerText || `Kolom ${c + 1}` })
  }
  if (diag.unmapped.length) {
    const names = diag.unmapped.map((u) => u.header).join(', ')
    diag.notes.push(`${diag.unmapped.length} kolom tidak dikenali dan diabaikan: ${names}.`)
  }

  const byBus = new Map<string, ExcelParticipant[]>()
  const usedOrder = new Map<string, Set<number>>()
  const sheetBus = sanitizeBusName(sheetName, 'Unit 1')
  let duplicatedOrder = 0
  let junkRows = 0
  let blankRows = 0

  const freeOrder = (bus: string): number => {
    const taken = usedOrder.get(bus) ?? new Set<number>()
    usedOrder.set(bus, taken)
    let n = taken.size + 1
    while (taken.has(n)) n++
    return n
  }

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    if (!row.some((c) => cellText(c))) continue
    diag.dataRows++

    const name = cleanName(cellRawAt(row, map.name))
    if (!name) {
      // Baris kosong itu wajar di template (slot yang belum diisi), jadi
      // dihitung terpisah, bukan dilaporkan sebagai "dilewati".
      blankRows++
      // Baris rekap sering tidak punya nama: "TOTAL 48 orang" ada di kolom No/keterangan.
      // Kalau sel pertama kelihatan seperti rekap, tetap laporkan supaya user
      // tahu baris itu sengaja dibuang.
      const recap = recapReason(row)
      if (recap) {
        junkRows++
        skipRow(i + 1, recap, collapseSpaces(cellTextAt(row, 0)))
      }
      continue
    }
    const junk = junkReason(name)
    if (junk) {
      junkRows++
      skipRow(i + 1, junk, name)
      continue
    }

    const busName = map.bus !== undefined ? sanitizeBusName(cellTextAt(row, map.bus), sheetBus) : sheetBus

    // Ambil digit depan saja supaya "1-2" tidak jadi 12; duplikat direnumber
    // karena (event, bus, order) unik dan duplikat akan menimpa peserta lain.
    const lead = cellTextAt(row, map.order).match(/^\s*(\d{1,6})/)
    const taken = usedOrder.get(busName) ?? new Set<number>()
    usedOrder.set(busName, taken)
    let order = lead ? parseInt(lead[1], 10) : 0
    if (!order || taken.has(order)) {
      if (order) duplicatedOrder++
      order = freeOrder(busName)
    }
    taken.add(order)

    // TTL gabungan: "Sukabumi, 12/03/1998".
    let birthPlace: string | null = null
    let birthDate: Date | null = null
    if (map.birthDate !== undefined) {
      const raw = cellRawAt(row, map.birthDate)
      if (typeof raw === 'string' && raw.trim()) {
        // Sekaligus menangani "12/03/1998", "Sukabumi, 12/03/1998", dan
        // "Bandung 07/04/1995" (TTL yang tidak dipisah koma).
        const split = splitTtl(raw)
        birthPlace = split.place
        birthDate = split.date
      } else {
        birthDate = parseDate(raw)
      }
    }
    if (!birthPlace && map.birthPlace !== undefined) {
      const placeText = collapseSpaces(cellTextAt(row, map.birthPlace))
      if (placeText) {
        const split = splitTtl(placeText)
        birthPlace = split.place ?? placeText
        if (!birthDate) birthDate = split.date
      }
    }

    if (!byBus.has(busName)) byBus.set(busName, [])
    byBus.get(busName)!.push({
      order,
      name,
      birthPlace: birthPlace || null,
      birthDate,
      phone: normalizePhone(cellRawAt(row, map.phone)),
      seat: cellTextAt(row, map.seat) || null,
      room: cellTextAt(row, map.room) || null,
      roomType: cellTextAt(row, map.roomType) || null,
      vw: cellTextAt(row, map.vw) || null,
    })
  }

  if (duplicatedOrder) {
    diag.notes.push(
      `${duplicatedOrder} nomor peserta duplikat; nomor dirapikan otomatis agar tidak menimpa peserta lain.`,
    )
  }
  if (junkRows) {
    diag.notes.push(
      `${junkRows} baris bukan peserta (baris rekap TOTAL/JUMLAH atau isi kolom nama tidak valid) dilewati.`,
    )
  }
  if (blankRows) {
    diag.notes.push(`${blankRows} baris tanpa nama dilewati.`)
  }
  if (byBus.size === 0) {
    diag.status = 'empty'
    diag.notes.push('Tidak ada peserta di sheet ini (kemungkinan sheet kosong atau sheet template).')
    return { buses: [], diagnostic: diag, skippedRows, skippedCount }
  }
  if (byBus.size > 1) {
    diag.notes.push(`Sheet ini memuat ${byBus.size} unit (dari kolom unit), dipecah menjadi ${byBus.size} unit.`)
  }

  diag.status = 'ok'
  diag.participants = [...byBus.values()].reduce((n, p) => n + p.length, 0)
  const buses = [...byBus.entries()].map(([name, participants]) => ({
    name,
    participants,
  }))
  return { buses, diagnostic: diag, skippedRows, skippedCount }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export function parseWorkbook(buffer: ArrayBuffer, fileName = ''): ExcelParseResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const result: ExcelParseResult = {
    buses: [],
    total: 0,
    skipped: 0,
    diagnostics: { sheets: [], warnings: [], skippedRows: [], skippedTotal: 0 },
  }

  const fileBase = fileName.replace(/\.[^.]+$/, '').trim()

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils
      // blankrows:true menjaga indeks baris tetap sama dengan nomor baris di
      // Excel, supaya nomor baris pada laporan "baris dilewati" akurat.
      .sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: '',
        raw: true,
        blankrows: true,
      })
      .filter((row): row is unknown[] => Array.isArray(row))

    const parsed = parseSheet(sheetName, rows)
    result.diagnostics.sheets.push(parsed.diagnostic)
    // Count semua baris yang dilewati; hanya 200 pertama yang dikirim sebagai contoh.
    result.skipped += parsed.skippedCount
    result.diagnostics.skippedTotal += parsed.skippedCount
    for (const s of parsed.skippedRows) {
      if (result.diagnostics.skippedRows.length < SKIPPED_SAMPLE_LIMIT) result.diagnostics.skippedRows.push(s)
    }
    for (const bus of parsed.buses) {
      result.buses.push(bus)
      result.total += bus.participants.length
    }
  }

  // Nama unit ganda antar sheet tetap harus dibedakan karena ada unique di DB.
  const seen = new Map<string, number>()
  for (const bus of result.buses) {
    const n = seen.get(bus.name) ?? 0
    seen.set(bus.name, n + 1)
    if (n > 0) bus.name = `${bus.name} (${n + 1})`
  }

  // CSV/ODS hanya punya satu sheet; pakai nama file sebagai nama unit.
  if (result.buses.length === 1 && isGenericSheetName(result.buses[0].name) && fileBase) {
    result.buses[0].name = sanitizeBusName(fileBase, 'Unit 1')
  }

  const ignored = result.diagnostics.sheets.filter((s) => s.status === 'ignored')
  if (ignored.length) {
    result.diagnostics.warnings.push(
      `${ignored.length} sheet tidak terbaca dan dilewati: ${ignored.map((s) => `"${s.name}"`).join(', ')}.`,
    )
  }
  const emptySheets = result.diagnostics.sheets.filter((s) => s.status === 'empty')
  if (emptySheets.length) {
    result.diagnostics.warnings.push(
      `${emptySheets.length} sheet tidak berisi peserta dan dilewati: ${emptySheets.map((s) => `"${s.name}"`).join(', ')}.`,
    )
  }
  if (result.buses.length === 0) {
    result.diagnostics.warnings.push('Tidak ada sheet yang bisa dibaca. Periksa apakah file berisi tabel peserta.')
  }
  for (const sheet of result.diagnostics.sheets) {
    if (sheet.status !== 'ok') continue
    for (const m of sheet.mappings) {
      if (m.kind === 'inferred') {
        result.diagnostics.warnings.push(
          `Sheet "${sheet.name}": kolom ${FIELD_LABEL[m.field]} tidak ada di header, dibaca dari isi kolom ${m.column + 1}.`,
        )
      }
    }
    if (sheet.mappings.some((m) => m.kind === 'positional')) {
      result.diagnostics.warnings.push(
        `Sheet "${sheet.name}": header tidak dikenali, semua kolom dibaca berdasarkan urutan template.`,
      )
    }
  }

  return result
}

/** Tanggal lokal sebagai yyyy-mm-dd. toISOString bisa mundur satu hari. */
function localIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type PreviewParticipant = {
  order: number
  name: string
  birthPlace: string | null
  birthDate: string | null
  phone: string | null
  seat: string | null
  room: string | null
  roomType: string | null
  vw: string | null
}

export type ImportPreview = {
  buses: { name: string; count: number; sample: PreviewParticipant[] }[]
  total: number
  skipped: number
  diagnostics: ParseDiagnostics
}

/** Ringkasan hasil parse untuk UI preview (tidak menulis ke database). */
export function buildPreview(parsed: ExcelParseResult): ImportPreview {
  return {
    buses: parsed.buses.map((b) => ({
      name: b.name,
      count: b.participants.length,
      sample: b.participants.slice(0, PREVIEW_ROWS_PER_BUS).map((p) => ({
        order: p.order,
        name: p.name,
        birthPlace: p.birthPlace ?? null,
        birthDate: p.birthDate ? localIsoDate(p.birthDate) : null,
        phone: p.phone ?? null,
        seat: p.seat ?? null,
        room: p.room ?? null,
        roomType: p.roomType ?? null,
        vw: p.vw ?? null,
      })),
    })),
    total: parsed.total,
    skipped: parsed.diagnostics.skippedTotal,
    diagnostics: parsed.diagnostics,
  }
}

/* ------------------------------------------------------------------ *
 * Template resmi
 * ------------------------------------------------------------------ */

/** Lebar kolom template, dibaca berdasarkan nama header supaya sinkron. */
const TEMPLATE_COL_WIDTH: Record<string, number> = {
  No: 6,
  'Nama Lengkap': 24,
  'Tempat Lahir': 18,
  'Tanggal Lahir': 16,
  'No Telp/Hp': 16,
  'No Kursi': 12,
  'No Kamar': 12,
  'Tipe Kamar': 14,
  'No VW': 12,
}

/**
 * Baris contoh template. Setiap baris WAJIB punya jumlah sel sama dengan
 * TEMPLATE_HEADERS, kalau tidak semua kolom setelahnya bergeser.
 */
const TEMPLATE_ROWS: (string | number)[][][] = [
  [
    [1, 'Ahmad Fauzi', 'Sukabumi', '12/03/1998', '085812345678', 'A1', '101', 'Twin', 'VW-01'],
    [2, 'Siti Rahmawati', 'Bandung', '05/11/2000', '085812345679', 'A2', '102', 'Twin', 'VW-01'],
  ],
  [
    [1, 'Nurhaliza Putri', 'Bogor', '30/01/1999', '085812345681', 'B1', '201', 'Double', 'VW-02'],
    [2, 'Agus Setiawan', 'Depok', '17/09/2001', '085812345682', 'B2', '202', 'Double', 'VW-02'],
  ],
]

/** Sheet template + contoh data, dipakai route unduh template. */
export function buildTemplateWorkbook(): ArrayBuffer {
  const widths = TEMPLATE_HEADERS.map((h) => ({ wch: TEMPLATE_COL_WIDTH[h] ?? 14 }))
  const wb = XLSX.utils.book_new()
  TEMPLATE_ROWS.forEach((rows, i) => {
    const sheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], ...rows])
    sheet['!cols'] = widths
    XLSX.utils.book_append_sheet(wb, sheet, `Bus ${i + 1}`)
  })
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

export const eventSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  location: z.string().trim().default(''),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).default('ACTIVE'),
  note: z.string().trim().nullish(),
  panduanItinerary: z.string().trim().nullish(),
  crewName: z.string().trim().nullish(),
  crewPhone: z.string().trim().nullish(),
  crewRole: z.string().trim().nullish(),
  crewPhotoUrl: z.string().trim().nullish(),
})

export const eventPatchSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').optional(),
  date: z.string().min(1, 'Tanggal wajib diisi').optional(),
  location: z.string().trim().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  note: z.string().trim().nullish(),
  panduanItinerary: z.string().trim().nullish(),
  crewName: z.string().trim().nullish(),
  crewPhone: z.string().trim().nullish(),
  crewRole: z.string().trim().nullish(),
  crewPhotoUrl: z.string().trim().nullish(),
  denahKamarCrewName: z.string().trim().nullish(),
  denahKamarCrewRole: z.string().trim().nullish(),
  denahKamarCrewPhotoUrl: z.string().trim().nullish(),
  denahVwCrewName: z.string().trim().nullish(),
  denahVwCrewRole: z.string().trim().nullish(),
  denahVwCrewPhotoUrl: z.string().trim().nullish(),
  panduanLogoLeft: z.string().trim().nullish(),
  panduanLogoRight: z.string().trim().nullish(),
  panduanLogoTopRight: z.string().trim().nullish(),
  panduanLogoTopRight2: z.string().trim().nullish(),
})
