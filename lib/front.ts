/**
 * Posisi Driver, Crew & TL (Tour Leader) digambar sebagai satu baris strip di
 * depan kabin, tepat di bawah dashboard dan di atas dinding pembatas. Nilainya
 * adalah indeks kolom (0-based) pada strip selebar `seatCols`, jadi selalu
 * sejajar dengan grid kursi penumpang.
 *
 *   { driver: 3, crew: 0, tl: 2 }  → Driver di kolom paling kanan, Crew di
 *   paling kiri, TL di tengah.
 *
 * `null` berarti slot itu tidak ditempatkan. Satu kolom hanya untuk satu slot.
 */
export type FrontLayout = { driver: number | null; crew: number | null; tl: number | null }

export type FrontSlot = keyof FrontLayout

export const FRONT_SLOTS: readonly FrontSlot[] = ['driver', 'crew', 'tl']

export function emptyFrontLayout(): FrontLayout {
  return { driver: null, crew: null, tl: null }
}

/**
 * Posisi default: Driver di pojok kanan atas (lazimnya kemudi bus di kanan),
 * Crew di kolom paling kiri. TL tidak dipasang secara default karena tidak
 * setiap unit punya Tour Leader. Kalau kolomnya cuma satu, Crew tidak dipasang.
 */
export function defaultFrontLayout(cols: number): FrontLayout {
  if (!Number.isFinite(cols) || cols <= 0) return emptyFrontLayout()
  return { driver: cols - 1, crew: cols >= 2 ? 0 : null, tl: null }
}

function inRange(value: unknown, cols: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const v = Math.floor(value)
  if (v < 0 || v >= cols) return null
  return v
}

/** Tepikan slot bentrok — urutan FRONT_SLOTS jadi prioritas (driver menang). */
function dedupe(slots: Record<FrontSlot, number | null>): FrontLayout {
  const seen = new Set<number>()
  const out = emptyFrontLayout()
  for (const slot of FRONT_SLOTS) {
    const v = slots[slot]
    if (v === null || seen.has(v)) continue
    seen.add(v)
    out[slot] = v
  }
  return out
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
  const tl = inRange(obj.tl, cols)
  if (driver === null && crew === null && tl === null) return emptyFrontLayout()
  return dedupe({ driver, crew, tl })
}

export function serializeFrontLayout(front: FrontLayout): string | null {
  if (front.driver === null && front.crew === null && front.tl === null) return null
  return JSON.stringify({ driver: front.driver, crew: front.crew, tl: front.tl })
}

const SLOT_LABELS: Record<FrontSlot, string> = {
  driver: 'Driver',
  crew: 'Crew',
  tl: 'TL (Tour Leader)',
}

export function validateFrontLayout(
  raw: unknown,
  cols: number,
): { front: FrontLayout; error?: string } {
  if (cols <= 0) return { front: emptyFrontLayout() }
  if (raw === undefined || raw === null) return { front: emptyFrontLayout() }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { front: emptyFrontLayout(), error: 'Layout strip depan tidak valid.' }
  }
  const obj = raw as Record<string, unknown>
  const values = emptyFrontLayout()
  for (const slot of FRONT_SLOTS) {
    if (obj[slot] == null) continue
    const v = inRange(obj[slot], cols)
    if (v === null) {
      return { front: emptyFrontLayout(), error: `Posisi ${SLOT_LABELS[slot]} di luar grid kursi.` }
    }
    values[slot] = v
  }
  const seen = new Map<number, FrontSlot>()
  for (const slot of FRONT_SLOTS) {
    const v = values[slot]
    if (v === null) continue
    const clash = seen.get(v)
    if (clash) {
      return {
        front: emptyFrontLayout(),
        error: `${SLOT_LABELS[clash]} dan ${SLOT_LABELS[slot]} tidak boleh satu kolom.`,
      }
    }
    seen.set(v, slot)
  }
  return { front: values }
}
