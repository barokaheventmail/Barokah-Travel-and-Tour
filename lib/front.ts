/**
 * Posisi Driver & Crew digambar sebagai satu baris strip di depan kabin,
 * tepat di bawah dashboard dan di atas dinding pembatas. Nilainya adalah
 * indeks kolom (0-based) pada strip selebar `seatCols`, jadi selalu sejajar
 * dengan grid kursi penumpang.
 *
 *   { driver: 3, crew: 0 }  → Driver di kolom paling kanan, Crew di paling kiri
 *
 * `null` berarti slot itu tidak ditempatkan. Satu kolom hanya untuk satu slot.
 */
export type FrontLayout = { driver: number | null; crew: number | null }

export type FrontSlot = keyof FrontLayout

export const FRONT_SLOTS: readonly FrontSlot[] = ['driver', 'crew']

export function emptyFrontLayout(): FrontLayout {
  return { driver: null, crew: null }
}

/**
 * Posisi default: Driver di pojok kanan atas (lazimnya kemudi bus di kanan),
 * Crew di kolom paling kiri. Kalau kolomnya cuma satu, Crew tidak dipasang.
 */
export function defaultFrontLayout(cols: number): FrontLayout {
  if (!Number.isFinite(cols) || cols <= 0) return emptyFrontLayout()
  return { driver: cols - 1, crew: cols >= 2 ? 0 : null }
}

function inRange(value: unknown, cols: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const v = Math.floor(value)
  if (v < 0 || v >= cols) return null
  return v
}

export function parseFrontLayout(raw: string | null | undefined, cols: number): FrontLayout {
  if (!raw || cols <= 0) return emptyFrontLayout()
  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return emptyFrontLayout()
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyFrontLayout()
  const obj = parsed as Record<string, unknown>
  const driver = inRange(obj.driver, cols)
  const crew = inRange(obj.crew, cols)
  if (driver === null && crew === null) return emptyFrontLayout()
  if (driver !== null && crew !== null && driver === crew) return { driver, crew: null }
  return { driver, crew }
}

export function serializeFrontLayout(front: FrontLayout): string | null {
  if (front.driver === null && front.crew === null) return null
  return JSON.stringify({ driver: front.driver, crew: front.crew })
}

export function validateFrontLayout(
  raw: unknown,
  cols: number,
): { front: FrontLayout; error?: string } {
  if (cols <= 0) return { front: emptyFrontLayout() }
  if (raw === undefined || raw === null) return { front: emptyFrontLayout() }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { front: emptyFrontLayout(), error: 'Layout Driver/Crew tidak valid.' }
  }
  const obj = raw as Record<string, unknown>
  const driver = obj.driver == null ? null : inRange(obj.driver, cols)
  const crew = obj.crew == null ? null : inRange(obj.crew, cols)
  if (obj.driver != null && driver === null) {
    return { front: emptyFrontLayout(), error: 'Posisi Driver di luar grid kursi.' }
  }
  if (obj.crew != null && crew === null) {
    return { front: emptyFrontLayout(), error: 'Posisi Crew di luar grid kursi.' }
  }
  if (driver !== null && crew !== null && driver === crew) {
    return { front: emptyFrontLayout(), error: 'Driver dan Crew tidak boleh satu kolom.' }
  }
  return { front: { driver, crew } }
}
