/**
 * `cells[r][c]`:
 *   0  → kursi nonaktif
 *   >0 → urutan saat admin mengaktifkan kursi itu (1 = paling awal diklik)
 *
 * Nilai ini yang menentukan nomor kursi, jadi urutan klik admin yang jadi
 * penomoran. Layout lama masih 0/1 polos; `seatNumberMatrix` menyamakan
 * urutannya sendiri, jadi data lama tidak perlu dimigrasi.
 */
export type SeatLayout = { rows: number; cols: number; cells: number[][] }

export const SEAT_MIN = 1
export const SEAT_MAX = 24

type SeatLayoutSource = {
  seatRows?: number | null
  seatCols?: number | null
  seatLayout?: string | null
}

function parseCells(raw: unknown, rows: number, cols: number): number[][] {
  const cells: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      const v = Array.isArray(raw) ? (raw as unknown[][])[r]?.[c] : undefined
      row.push(typeof v === 'number' && v > 0 ? Math.floor(v) : 0)
    }
    cells.push(row)
  }

  // Layout lama menyimpan 0/1 polos, jadi semua kursi aktif bernilai 1 dan
  // tidak ada informasi urutan. Nomorinya dikembalikan keconventional
  // kiri→kanan dari atas supaya unit yang sudah terlanjur tersimpan tidak
  // berubah tampilannya. Layout baru (ada nilai > 1) utuh dihormati.
  const aktif = cells.flat().filter((v) => v > 0)
  if (aktif.length > 0 && aktif.every((v) => v === 1)) {
    let seq = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cells[r][c] > 0) cells[r][c] = ++seq
      }
    }
  }
  return cells
}

export function parseSeatLayout(bus: SeatLayoutSource): SeatLayout {
  const rows = Number.isFinite(Number(bus.seatRows)) ? Math.max(0, Math.floor(Number(bus.seatRows))) : 0
  const cols = Number.isFinite(Number(bus.seatCols)) ? Math.max(0, Math.floor(Number(bus.seatCols))) : 0
  if (rows === 0 || cols === 0) return { rows: 0, cols: 0, cells: [] }
  let raw: unknown = null
  try {
    raw = bus.seatLayout ? JSON.parse(bus.seatLayout) : null
  } catch {
    raw = null
  }
  if (!Array.isArray(raw)) {
    return { rows: 0, cols: 0, cells: [] }
  }
  return { rows, cols, cells: parseCells(raw, rows, cols) }
}

/**
 * Nomor kursi mengikuti urutan admin mengaktifkan, bukan posisi di grid.
 * Baris 3 lalu 1 lalu 2 menghasilkan [3, 1, 2]. Nilai yang sama (mis. semua
 * kursi dalam satu baris diklik bersamaan) diurutkan kiri→kanan agar stabil.
 */
export function seatNumberMatrix(rows: number, cols: number, cells: number[][]): (number | null)[][] {
  const matrix: (number | null)[][] = []
  let n = 1
  for (let r = 0; r < rows; r++) {
    const row: (number | null)[] = []
    for (let c = 0; c < cols; c++) {
      const active = (cells[r]?.[c] ?? 0) > 0
      row.push(active ? n++ : null)
    }
    matrix.push(row)
  }

  const ranked = matrix
    .map((row, r) => row.map((n, c) => ({ n, r, c })))
    .flat()
    .filter((cell) => cell.n !== null)
    .sort((a, b) => {
      const sa = cells[a.r]?.[a.c] ?? 0
      const sb = cells[b.r]?.[b.c] ?? 0
      return sa - sb || a.r - b.r || a.c - b.c
    })
    .map((cell, i) => ({ ...cell, n: i + 1 }))

  for (const cell of ranked) matrix[cell.r][cell.c] = cell.n
  return matrix
}

export function seatCount(cells: number[][]): number {
  return cells.reduce((acc, row) => acc + row.filter((v) => v > 0).length, 0)
}

/** Urutan aktivasi berikutnya, dipakai saat admin klik sel/baris/kolom. */
export function nextSeq(cells: number[][]): number {
  let max = 0
  for (const row of cells) for (const v of row) if (v > max) max = v
  return max + 1
}

function cloneCells(cells: number[][]): number[][] {
  return cells.map((row) => [...row])
}

/** Klik satu sel: aktifkan dengan urutan baru, atau matikan kalau sudah aktif. */
export function toggleCell(cells: number[][], r: number, c: number): number[][] {
  const next = cloneCells(cells)
  if (!next[r]) return cells
  if (next[r][c] > 0) {
    next[r][c] = 0
  } else {
    next[r][c] = nextSeq(cells)
  }
  return next
}

/**
 * Klik header baris: seluruh kursi baris itu aktif dalam urutan baru.
 * Kalau barisnya sudah penuh, klik berikutnya malah mematikan semuanya.
 * Within-baris tetap kiri→kanan supaya penomorannya mudah dibaca.
 */
export function toggleRow(cells: number[][], r: number): number[][] {
  const row = cells[r]
  if (!row) return cells
  const next = cloneCells(cells)
  const full = row.every((v) => v > 0)
  if (full) {
    for (let c = 0; c < next[r].length; c++) next[r][c] = 0
    return next
  }
  let seq = nextSeq(cells)
  for (let c = 0; c < next[r].length; c++) {
    if (next[r][c] === 0) next[r][c] = seq++
  }
  return next
}

/** Sama seperti toggleRow, untuk satu kolom (atas→bawah). */
export function toggleCol(cells: number[][], c: number): number[][] {
  const exists = cells.some((row) => row[c] !== undefined)
  if (!exists) return cells
  const full = cells.every((row) => (row[c] ?? 0) > 0)
  const next = cloneCells(cells)
  if (full) {
    for (let r = 0; r < next.length; r++) next[r][c] = 0
    return next
  }
  let seq = nextSeq(cells)
  for (let r = 0; r < next.length; r++) {
    if ((next[r][c] ?? 0) === 0) next[r][c] = seq++
  }
  return next
}

/** Nomor berapa baris ini dimulai, untuk badge "mulai dari #" di header. */
export function rowFirstSeat(cells: number[][], r: number): number | null {
  const matrix = seatNumberMatrix(cells.length, cells[0]?.length ?? 0, cells)
  for (const n of matrix[r] ?? []) if (n !== null) return n
  return null
}

export function serializeSeatLayout(rows: number, cols: number, cells: number[][]): string {
  return JSON.stringify(cells)
}

export function validateSeatShape(rows: unknown, cols: unknown, layout: unknown): { rows: number; cols: number; cells: number[][]; error?: string } {
  const r = Math.floor(Number(rows))
  const c = Math.floor(Number(cols))
  if (!Number.isFinite(r) || !Number.isFinite(c) || r < SEAT_MIN || r > SEAT_MAX || c < SEAT_MIN || c > SEAT_MAX) {
    return { rows: 0, cols: 0, cells: [], error: `Baris & kolom harus antara ${SEAT_MIN} sampai ${SEAT_MAX}.` }
  }
  if (!Array.isArray(layout) || layout.length !== r) {
    return { rows: 0, cols: 0, cells: [], error: 'Layout kursi tidak valid.' }
  }
  const cells: number[][] = []
  for (const row of layout as unknown[]) {
    if (!Array.isArray(row) || row.length !== c) {
      return { rows: 0, cols: 0, cells: [], error: 'Layout kursi tidak valid.' }
    }
    for (const v of row as unknown[]) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        return { rows: 0, cols: 0, cells: [], error: 'Layout kursi tidak valid.' }
      }
    }
    cells.push((row as unknown[]).map((v) => Math.floor(Number(v))))
  }
  return { rows: r, cols: c, cells }
}