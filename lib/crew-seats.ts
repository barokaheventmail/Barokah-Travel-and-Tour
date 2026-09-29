/**
 * Kontrak data untuk tab scan crew (Daftar Nama & Peta Kursi).
 * Nama field di sini WAJIB sama dengan yang dipakai components/crew/roster.tsx
 * dan components/seat-grid.tsx: status kehadiran dikirim sebagai `present`.
 */

import { parseSeatLayout, seatNumberMatrix } from './seat'

export type CrewSeat = {
  seat: string | null
  order: number
  name: string
  present: boolean
}

type PesertaSeat = {
  seat: string | null
  order: number
  name: string
  scannedAt: Date | null
}

/** Urutkan sesuai nomor kursi (numerik dulu), fallback nama kursi. */
export function sortSeatsByNumber<T extends { seat: string | null; order: number }>(list: T[]): T[] {
  return [...list].sort((x, y) => {
    const xs = Number.parseInt(x.seat ?? '', 10)
    const ys = Number.parseInt(y.seat ?? '', 10)
    if (!Number.isNaN(xs) && !Number.isNaN(ys)) return xs - ys
    return (x.seat ?? '').localeCompare(y.seat ?? '')
  })
}

/** Kehadiran ikut dari `scannedAt` yang sama dengan panel admin, siapa pun yang mencatatnya. */
export function mapCrewSeats(list: PesertaSeat[]): CrewSeat[] {
  return sortSeatsByNumber(list).map((p) => ({
    seat: p.seat,
    order: p.order,
    name: p.name,
    present: p.scannedAt !== null,
  }))
}

export function countPresent(list: PesertaSeat[]): number {
  return list.filter((p) => p.scannedAt !== null).length
}

/**
 * Event yang boleh DIBACA aplikasi crew.
 *
 * Dulu hanya `ACTIVE`, sehingga begitu admin menutup event, roster, peta
 * kursi, dan riwayat crew mendadak kosong padahal datanya masih ada di panel
 * admin. Sekarang `CLOSED` ikut terbaca (read-only); scan tetap hanya untuk
 * `ACTIVE` (app/api/crew/scan/route.ts). `DRAFT` tetap disembunyikan supaya
 * data persiapan tidak bocor sebelum event dijalankan.
 */
export function isCrewVisibleEvent(status: string): boolean {
  return status === 'ACTIVE' || status === 'CLOSED'
}

/** Nilai `status` event yang boleh dibaca crew, untuk filter Prisma. */
export const CREW_VISIBLE_EVENT_STATUS = ['ACTIVE', 'CLOSED'] as const

export type SeatLayoutBus = {
  seatRows: number
  seatCols: number
  seatLayout: string | null
}

export type UnmappedSeat = {
  seat: string | null
  order: number
  name: string
  present: boolean
}

/**
 * Peserta yang tidak bisa digambar di Peta Kursi.
 *
 * Peta Kursi hanya bisa memetakan nomor kursi yang ada di layout unit, jadi
 * peserta dengan kursi non-numerik, tanpa nomor, atau nomor di luar layout
 * (mis. "Kursi 5" pada unit tanpa layout) muncul di Daftar Nama tapi
 * lenyap dari peta. Kalau unitnya belum punya layout, semua peserta hadir
 * dianggap belum tergambar.
 *
 * Hanya peserta yang HADIR yang dikembalikan, karena peta hanya menggambar
 * kursi yang terisi.
 */
export function unmappedSeats(bus: SeatLayoutBus & { seats: CrewSeat[] }): UnmappedSeat[] {
  const layout = parseSeatLayout(bus)
  const present = bus.seats.filter((s) => s.present)

  if (layout.rows === 0 || layout.cols === 0) return sortSeatsByNumber(present)

  const drawable = new Set<number>()
  for (const row of seatNumberMatrix(layout.rows, layout.cols, layout.cells)) {
    for (const n of row) if (n !== null) drawable.add(n)
  }

  return sortSeatsByNumber(
    present.filter((s) => {
      const n = Number.parseInt(s.seat ?? '', 10)
      return Number.isNaN(n) || !drawable.has(n)
    }),
  )
}
