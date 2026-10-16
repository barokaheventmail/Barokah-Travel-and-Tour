export type ItineraryRow = { time: string; agenda: string; day: number; bold: boolean; italic: boolean }

export type ItineraryDay = { day: number; rows: ItineraryRow[]; note: string; sideNote: string }

export type ItineraryNotes = { notes: Record<number, string>; sideNotes: Record<number, string>; footerNote: string }

export function parseItineraryDoc(raw: string | null | undefined): { rows: ItineraryRow[] } & ItineraryNotes {
  const notes: Record<number, string> = {}
  const sideNotes: Record<number, string> = {}
  let footerNote = ''
  const rows: ItineraryRow[] = []
  try {
    const value = raw ? JSON.parse(raw) : []
    if (!Array.isArray(value)) return { rows, notes, sideNotes, footerNote }
    for (const item of value) {
      const rec = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>
      // Entri keterangan tambahan di bawah itinerary: punya `footerNote`.
      if (typeof rec.footerNote === 'string') {
        footerNote = rec.footerNote.trim()
        continue
      }
      const rawDay = Number(rec.day)
      const day = Number.isFinite(rawDay) ? Math.max(1, Math.floor(rawDay)) : 1
      // Entri keterangan hari: punya `note` (bawah) dan/atau `sideNote` (samping), tanpa agenda.
      const note = typeof rec.note === 'string' ? rec.note.trim() : ''
      const sideNote = typeof rec.sideNote === 'string' ? rec.sideNote.trim() : ''
      if (note || sideNote) {
        if (note) notes[day] = note
        if (sideNote) sideNotes[day] = sideNote
        continue
      }
      const row = mapRow(item)
      if (row.time && row.agenda) rows.push(row)
    }
  } catch {
    return { rows, notes, sideNotes, footerNote }
  }
  return { rows, notes, sideNotes, footerNote }
}

function mapRow(item: unknown): ItineraryRow {
  const rec = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>
  const time = typeof rec.time === 'string' ? rec.time.trim() : ''
  // Bentuk lama `{time, desc}` -> agenda.
  const agenda = typeof rec.agenda === 'string' ? rec.agenda.trim() : typeof rec.desc === 'string' ? rec.desc.trim() : ''
  const rawDay = Number(rec.day)
  const day = Number.isFinite(rawDay) ? Math.max(1, Math.floor(rawDay)) : 1
  const bold = rec.bold === true
  const italic = rec.italic === true
  return { time, agenda, day, bold, italic }
}

export function parseItinerary(raw: string | null | undefined): ItineraryRow[] {
  return parseItineraryDoc(raw).rows
}

export function serializeItinerary(
  rows: ItineraryRow[],
  notes: Record<number, string> = {},
  sideNotes: Record<number, string> = {},
  footerNote = '',
): string {
  const days = new Set<number>([...Object.keys(notes), ...Object.keys(sideNotes)].map((d) => Number(d)))
  const noteEntries = [...days]
    .filter((day) => Number.isFinite(day))
    .sort((a, b) => a - b)
    .map((day) => ({
      day: Math.max(1, Math.floor(day || 1)),
      note: (notes[day] ?? '').trim(),
      sideNote: (sideNotes[day] ?? '').trim(),
    }))
    .filter((entry) => entry.note || entry.sideNote)
  const rowEntries = rows
    .map((row) => ({
      day: Math.max(1, Math.floor(Number(row.day) || 1)),
      time: row.time.trim(),
      agenda: row.agenda.trim(),
      ...(row.bold ? { bold: true } : {}),
      ...(row.italic ? { italic: true } : {}),
    }))
    .filter((row) => row.time && row.agenda)
  const footerEntries = footerNote.trim() ? [{ footerNote: footerNote.trim() }] : []
  return JSON.stringify([...noteEntries, ...rowEntries, ...footerEntries])
}

export function maxDay(rows: ItineraryRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.day), 1)
}

export function groupItineraryByDay(rows: ItineraryRow[], notes: Record<number, string> = {}, sideNotes: Record<number, string> = {}): ItineraryDay[] {
  const map = new Map<number, ItineraryRow[]>()
  for (const row of rows) {
    const list = map.get(row.day) ?? []
    list.push(row)
    map.set(row.day, list)
  }
  // Hari yang hanya punya keterangan tetap ditampilkan.
  for (const key of [...Object.keys(notes), ...Object.keys(sideNotes)]) {
    const day = Number(key)
    if (Number.isFinite(day) && !map.has(day)) map.set(day, [])
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, dayRows]) => ({ day, rows: dayRows, note: notes[day] ?? '', sideNote: sideNotes[day] ?? '' }))
}
