/** Posisi logo pada tiap halaman panduan peserta. */
export type LogoSlotId = 'kiri' | 'kiri1' | 'tengah' | 'kanan1' | 'kanan'

/** Offset horizontal (px) tiap slot; positif = ke kanan, negatif = ke kiri. */
export type LogoOffsets = Record<LogoSlotId, number>

export const LOGO_SLOT_IDS: LogoSlotId[] = ['kiri', 'kiri1', 'tengah', 'kanan1', 'kanan']

export const DEFAULT_LOGO_OFFSETS: LogoOffsets = { kiri: 0, kiri1: 0, tengah: 0, kanan1: 0, kanan: 0 }

export const LOGO_OFFSET_MIN = -240
export const LOGO_OFFSET_MAX = 240
export const LOGO_OFFSET_STEP = 5

export function clampLogoOffset(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return 0
  return Math.min(LOGO_OFFSET_MAX, Math.max(LOGO_OFFSET_MIN, Math.round(n)))
}

export function parseLogoOffsets(data: string | null | undefined): LogoOffsets {
  if (!data) return { ...DEFAULT_LOGO_OFFSETS }
  try {
    const parsed: unknown = JSON.parse(data)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_LOGO_OFFSETS }
    const record = parsed as Record<string, unknown>
    return {
      kiri: clampLogoOffset(record.kiri),
      kiri1: clampLogoOffset(record.kiri1),
      tengah: clampLogoOffset(record.tengah),
      kanan1: clampLogoOffset(record.kanan1),
      kanan: clampLogoOffset(record.kanan),
    }
  } catch {
    return { ...DEFAULT_LOGO_OFFSETS }
  }
}

/** Kembalikan null bila semua offset 0 (posisi bawaan) supaya kolom tetap bersih. */
export function serializeLogoOffsets(offsets: LogoOffsets): string | null {
  const normalized: LogoOffsets = {
    kiri: clampLogoOffset(offsets.kiri),
    kiri1: clampLogoOffset(offsets.kiri1),
    tengah: clampLogoOffset(offsets.tengah),
    kanan1: clampLogoOffset(offsets.kanan1),
    kanan: clampLogoOffset(offsets.kanan),
  }
  if (LOGO_SLOT_IDS.every((slot) => normalized[slot] === 0)) return null
  return JSON.stringify(normalized)
}

/** Gaya inline untuk menggeser logo tanpa mendorong layout lain (bisa tumpuk). */
export function logoShiftStyle(offset: number): { transform: string } | undefined {
  const n = clampLogoOffset(offset)
  return n === 0 ? undefined : { transform: `translateX(${n}px)` }
}
