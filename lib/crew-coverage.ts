/**
 * Cakupan crew per unit untuk panel admin.
 *
 * Peserta pada unit tanpa crew TIDAK bisa discan dari aplikasi crew
 * (app/api/crew/scan/route.ts menolak dengan WRONG_BUS karena seat map
 * app/api/crew/seats/route.ts tidak pernah mengirimnya). Admin tetap
 * menghitungnya sebagai peserta, jadi angka admin dan crew bisa berbeda.
 * Fungsi ini dipakai untuk memunculkan peringatan di panel Kehadiran.
 */

export type CoverageBus = {
  name: string
  /** Jumlah peserta di unit ini. */
  count: number
  /** Jumlah crew yang ditugaskan ke unit ini. */
  workerCount: number
}

export type BusTanpaCrew = {
  name: string
  count: number
}

/**
 * Unit yang punya peserta tapi belum punya crew. Unit kosong atau sudah
 * ada crew-nya tidak dilaporkan.
 */
export function armadasTanpaCrew(buses: CoverageBus[]): BusTanpaCrew[] {
  return buses.filter((b) => b.count > 0 && b.workerCount === 0).map((b) => ({ name: b.name, count: b.count }))
}

/** Jumlah peserta yang tidak bisa discan karena unitnya belum punya crew. */
export function totalPesertaTanpaCrew(buses: BusTanpaCrew[]): number {
  return buses.reduce((acc, b) => acc + b.count, 0)
}
