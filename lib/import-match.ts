/**
 * Pencocokan baris import Excel dengan peserta yang sudah ada di satu unit.
 *
 * Kenapa modul ini ada: sebelumnya import mencocokkan baris file ke peserta lewat
 * kolom "No" (`Participant.order`). "No" itu POSISI di daftar, bukan identitas.
 * Begitu satu baris disisipkan di tengah file, semua nomor setelahnya bergeser dan
 * import menulis nama yang salah ke peserta yang sudah scan — token tiket dan
 * `scannedAt`-nya ikut pindah ke orang yang salah (audit ronde 2, temuan A1).
 *
 * Aturan baru, dari yang paling yakin:
 *   1. nama + nomor HP sama          -> orang yang sama (update)
 *   2. nama sama                     -> orang yang sama (update)
 *   3. "No" sama DAN nama sama       -> orang yang sama (update)
 *   4. nama baru, "No" masih kosong  -> peserta baru (create)
 *   5. nama baru, "No" sudah dipakai  -> BENTROK: dibiarkan, tidak ada yang ditimpa
 *   6. nama sama 2x dalam 1 file     -> baris kedua diabaikan (duplikat)
 *
 * Kolom "No" sekarang hanya petunjuk. Kalau pesertanya ketemu lewat nama, urutan
 * roster TIDAK digeser: import memperbarui isi data, bukan menata ulang daftar.
 * Akibatnya import file yang sama selalu idempoten dan tidak pernah menukar
 * identitas, kehadiran, atau tiket.
 */

import { normalizePhone } from './excel'

export type ExistingParticipant = {
  id: string
  order: number
  name: string
  phone: string | null
}

export type ImportRow = {
  order: number
  name: string
  phone?: string | null
}

/** Cara baris file dipastikan milik peserta yang sudah ada. */
export type MatchBy = 'nama+hp' | 'nama' | 'nomor' | 'paksa'

export type ImportDecision =
  | { kind: 'create'; row: ImportRow; slot: number; moved: boolean }
  | { kind: 'update'; row: ImportRow; id: string; by: MatchBy }
  | { kind: 'conflict'; row: ImportRow; occupiedBy: string; occupiedId: string; reason: 'slot' | 'ambigu' }
  | { kind: 'duplicate'; row: ImportRow }

export type ImportConflict = {
  order: number
  name: string
  occupiedBy: string | null
  reason: 'slot' | 'ambigu'
  message: string
}

export type ImportPlan = {
  decisions: ImportDecision[]
  created: number
  updated: number
  conflicts: ImportConflict[]
  duplicates: number
  forced: number
}

/** Normalisasi nama untuk perbandingan: huruf besar/kecil dan spasi tidak berpengaruh. */
export function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function conflictMessage(row: ImportRow, occupiedBy: string | null, reason: 'slot' | 'ambigu'): string {
  if (reason === 'ambigu') {
    return `"${row.name}" ada lebih dari satu di sistem, jadi tidak bisa dipastikan peserta mana yang dimaksud. Baris dilewati.`
  }
  return `No ${row.order} sudah dipakai "${occupiedBy}" di sistem, sedangkan "${row.name}" belum ada di daftar. Baris dilewati supaya data peserta lain tidak tertimpa.`
}

/**
 * Susun rencana import untuk satu unit. Fungsi murni: tidak menyentuh database,
 * jadi bisa diuji penuh tanpa Prisma.
 *
 * `forceByOrder` mengembalikan perilaku lama (cocokkan murni lewat kolom "No").
 * Sengaja tidak jadi default: mode itu menukar identitas saat baris bergeser.
 * Dipakai admin lewat checkbox eksplisit kalau memang sedang memperbaiki daftar
 * yang nomornya sudah pasti sama.
 */
export function planImport(options: {
  existing: ExistingParticipant[]
  rows: ImportRow[]
  forceByOrder?: boolean
}): ImportPlan {
  const { existing, rows, forceByOrder = false } = options

  const byId = new Map(existing.map((e) => [e.id, e]))
  const byOrder = new Map<number, string>()
  const byName = new Map<string, string[]>()
  const byNamePhone = new Map<string, string>()
  const slotTaken = new Set<number>()

  for (const e of existing) {
    byOrder.set(e.order, e.id)
    slotTaken.add(e.order)
    const nk = normalizeNameKey(e.name)
    byName.set(nk, [...(byName.get(nk) ?? []), e.id])
    const pk = normalizePhone(e.phone)
    if (pk) byNamePhone.set(`${nk}|${pk}`, e.id)
  }

  let nextSlot = existing.reduce((max, e) => Math.max(max, e.order), 0) + 1
  const claimed = new Set<string>()
  const seenIdentity = new Map<string, ImportRow>()
  const decisions: ImportDecision[] = []
  const conflicts: ImportConflict[] = []
  let created = 0
  let updated = 0
  let duplicates = 0
  let forced = 0

  for (const row of rows) {
    const nk = normalizeNameKey(row.name)
    const pk = normalizePhone(row.phone)
    const identity = pk ? `${nk}|${pk}` : nk

    // (6) Baris identik kedua di dalam file yang sama. Ditangkap di sini, sebelum
    // bisa menimpa peserta lain yang kebetulan ada di nomor tersebut.
    if (seenIdentity.has(identity)) {
      decisions.push({ kind: 'duplicate', row })
      duplicates++
      continue
    }
    seenIdentity.set(identity, row)

    const claim = (id: string, by: MatchBy) => {
      claimed.add(id)
      decisions.push({ kind: 'update', row, id, by })
      if (by === 'paksa') forced++
      updated++
    }

    // (1) Nama + nomor HP: identitas terkuat.
    if (pk && byNamePhone.has(`${nk}|${pk}`)) {
      const id = byNamePhone.get(`${nk}|${pk}`)!
      if (!claimed.has(id)) {
        claim(id, 'nama+hp')
        continue
      }
    }

    // (2) Nama yang menunjuk tepat satu peserta yang belum dipakai baris lain.
    const candidates = (byName.get(nk) ?? []).filter((id) => !claimed.has(id))
    if (candidates.length === 1) {
      claim(candidates[0], 'nama')
      continue
    }

    const occupiedId = byOrder.get(row.order)
    const occupied = occupiedId ? byId.get(occupiedId) : undefined

    if (candidates.length > 1) {
      // Nama dobel di sistem. Kalau occupant di nomor itu namanya juga sama,
      // itu masih orang yang sama; selain itu jangan ditebak.
      if (occupied && candidates.includes(occupied.id) && normalizeNameKey(occupied.name) === nk) {
        claim(occupied.id, 'nomor')
        continue
      }
      conflicts.push({
        order: row.order,
        name: row.name,
        occupiedBy: occupied?.name ?? null,
        reason: 'ambigu',
        message: conflictMessage(row, occupied?.name ?? null, 'ambigu'),
      })
      decisions.push({ kind: 'conflict', row, occupiedBy: occupied?.name ?? '', occupiedId: occupied?.id ?? '', reason: 'ambigu' })
      continue
    }

    if (occupied) {
      // (3) Nomor sama DAN nama sama: orang yang sama, mungkin cuma kolom lain yang berubah.
      if (normalizeNameKey(occupied.name) === nk) {
        claim(occupied.id, 'nomor')
        continue
      }
      if (forceByOrder) {
        claim(occupied.id, 'paksa')
        continue
      }
      // (5) Nama baru di nomor milik orang lain. Ini kasus "sisip baris di tengah
      // file": identitas lama harus tetap utuh, jadi barisnya ditolak, bukan menimpa.
      conflicts.push({
        order: row.order,
        name: row.name,
        occupiedBy: occupied.name,
        reason: 'slot',
        message: conflictMessage(row, occupied.name, 'slot'),
      })
      decisions.push({ kind: 'conflict', row, occupiedBy: occupied.name, occupiedId: occupied.id, reason: 'slot' })
      continue
    }

    // (4) Peserta baru. Kalau nomor di file sudah terpakai (mis. baris sebelumnya
    // di file yang sama), taruh di nomor kosong berikutnya supaya tidak menimpa.
    let slot = row.order
    let moved = false
    if (slotTaken.has(slot)) {
      while (slotTaken.has(nextSlot)) nextSlot++
      slot = nextSlot++
      moved = true
    }
    slotTaken.add(slot)
    decisions.push({ kind: 'create', row, slot, moved })
    created++
  }

  return { decisions, created, updated, conflicts, duplicates, forced }
}

/** Ringkasan singkat untuk banner peringatan di panel admin. */
export function conflictSummary(conflicts: ImportConflict[], duplicates: number): string[] {
  const out: string[] = []
  if (conflicts.length > 0) {
    out.push(
      `${conflicts.length} baris tidak disimpan karena nomornya sudah dipakai peserta lain. Baris itu dilewati, tidak ada peserta yang ditimpa.`,
    )
  }
  if (duplicates > 0) {
    out.push(`${duplicates} baris duplikat di dalam file (nama + nomor HP sama) diabaikan.`)
  }
  return out
}
