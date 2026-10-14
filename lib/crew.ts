/**
 * Crew on Duty untuk section Tata Tertib pada panduan peserta.
 *
 * Daftar disimpan sebagai JSON di kolom `Event.crewList` supaya bisa memuat
 * banyak crew (maksimal {@link MAX_CREW}) tanpa mengubah struktur tabel.
 * Kolom tunggal lama (crewName/crewRole/crewPhotoUrl) tetap dibaca sebagai
 * fallback supaya event yang belum disimpan ulang tetap tampil.
 */

export const MAX_CREW = 10

const NAME_MAX = 120
const ROLE_MAX = 120
const URL_MAX = 500

export type CrewMember = {
  name: string
  role: string
  photoUrl: string | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function toText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function normalizeCrewMember(value: unknown): CrewMember | null {
  if (!isRecord(value)) return null
  const name = toText(value.name, NAME_MAX)
  const role = toText(value.role, ROLE_MAX)
  const photoUrl = toText(value.photoUrl, URL_MAX) || null
  if (!name && !role && !photoUrl) return null
  return { name, role, photoUrl }
}

/** Baca `Event.crewList` (JSON) menjadi daftar crew yang tervalidasi. */
export function parseCrewList(raw: string | null | undefined): CrewMember[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .map(normalizeCrewMember)
    .filter((crew): crew is CrewMember => crew !== null)
    .slice(0, MAX_CREW)
}

/** Ubah daftar crew menjadi JSON untuk disimpan. Daftar kosong => null. */
export function serializeCrewList(list: CrewMember[]): string | null {
  const cleaned = (Array.isArray(list) ? list : [])
    .map(normalizeCrewMember)
    .filter((crew): crew is CrewMember => crew !== null)
    .slice(0, MAX_CREW)
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null
}

/**
 * Daftar crew efektif: pakai `crewList` bila ada, jika tidak jatuh ke kolom
 * tunggal lama supaya event lama tetap menampilkan crew-nya.
 */
export function effectiveCrewList(event: {
  crewList?: string | null
  crewName?: string | null
  crewRole?: string | null
  crewPhotoUrl?: string | null
}): CrewMember[] {
  const list = parseCrewList(event.crewList)
  if (list.length > 0) return list
  const legacy: CrewMember = {
    name: (event.crewName ?? '').trim(),
    role: (event.crewRole ?? '').trim(),
    photoUrl: event.crewPhotoUrl ?? null,
  }
  return legacy.name || legacy.role || legacy.photoUrl ? [legacy] : []
}
