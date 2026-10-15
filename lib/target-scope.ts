// Menentukan unit tujuan saat gambar/nama unit diterapkan ke beberapa bus.
// Dipakai bersama oleh unggah & hapus gambar unit supaya scope-nya konsisten.
export type UnitScope = 'one' | 'selected' | 'all'

export function resolveScope(
  applyToAll: boolean,
  requestedIds: string[],
  busId: string,
): { targetIds: string[] | null; scope: UnitScope } {
  if (applyToAll) return { targetIds: null, scope: 'all' }
  const ids = Array.from(new Set([...requestedIds, busId]))
  return { targetIds: ids, scope: ids.length > 1 ? 'selected' : 'one' }
}

export function parseBusIds(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string').slice(0, 2000)
  } catch {
    /* abaikan */
  }
  return []
}
