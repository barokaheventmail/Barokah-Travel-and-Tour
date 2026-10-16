const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function formatTanggalPendek(d: Date): string {
  return `${d.getDate()} ${months[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export function formatTanggal(d: Date): string {
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function toISOInput(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function toLocalInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function formatWaktuLengkap(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()].slice(0, 3)} ${d.getFullYear()} · ${h}:${m} WIB`
}

/** "YYYY-MM-DD" (lokal) untuk `input type="date"`. Null/kosong = ''. */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Tanggal event dengan dukungan rentang (multi-hari):
 * - dateEnd null / sama dengan date → "12 Mar 2026"
 * - rentang se-bulan            → "12–14 Mar 2026"
 * - rentang beda bulan          → "28 Feb – 2 Mar 2026"
 * - rentang beda tahun          → "30 Des 2026 – 2 Jan 2027"
 */
export function formatTanggalRentang(date: Date | string, dateEnd?: Date | string | null): string {
  const start = typeof date === 'string' ? new Date(date) : date
  const end = dateEnd ? (typeof dateEnd === 'string' ? new Date(dateEnd) : dateEnd) : null
  if (isNaN(start.getTime()) || !end || isNaN(end.getTime()) || end.getTime() === start.getTime()) {
    return formatTanggalPendek(start)
  }
  const short = (d: Date) => `${d.getDate()} ${months[d.getMonth()].slice(0, 3)}`
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${months[start.getMonth()].slice(0, 3)} ${start.getFullYear()}`
    }
    return `${short(start)} – ${short(end)} ${end.getFullYear()}`
  }
  return `${formatTanggalPendek(start)} – ${formatTanggalPendek(end)}`
}