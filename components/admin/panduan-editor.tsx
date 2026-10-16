'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type KeyboardEventHandler } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronUp, Clock, ExternalLink, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { parseItineraryDoc, serializeItinerary, groupItineraryByDay, type ItineraryRow } from '@/lib/itinerary'
import { DEFAULT_PANDUAN_RULES, parsePanduanRules, serializePanduanRules, type PanduanRule } from '@/lib/panduan-rules'
import { MAX_CREW, parseCrewList, type CrewMember } from '@/lib/crew'
import { parsePanduanSections, serializePanduanSections, type PanduanSectionItem } from '@/lib/panduan-sections'
import { PanduanSectionsEditor } from '@/components/admin/panduan-sections-editor'
import type { PanduanPresetOption } from '@/lib/preset'

type DayRows = Pick<ItineraryRow, 'time' | 'agenda' | 'bold' | 'italic'>[]

type LogoSlot = 'left' | 'left2' | 'center' | 'right2' | 'right'

const pad2 = (v: string) => (v.length === 1 ? `0${v}` : v)
const toDisplay = (value: string) => value.replace(':', '.')
const toDigits = (value: string) => value.replace(/\D/g, '').slice(0, 4)

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTE_OPTS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const timeCls =
  'w-full min-w-0 rounded-lg border border-[#dfe4e8] bg-white py-2 pl-3 pr-7 text-center text-sm font-semibold tabular-nums text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15'

function TimeColumn({
  label,
  options,
  selected,
  onPick,
}: {
  label: string
  options: string[]
  selected: string
  onPick: (value: string) => void
}) {
  return (
    <div className="w-14">
      <p className="border-b border-[#eef1f4] px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#9aa3af]">
        {label}
      </p>
      <div className="max-h-40 overflow-y-auto py-1">
        {options.map((x) => (
          <button
            key={x}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(x)}
            className={`block w-full px-2 py-1 text-center text-sm font-semibold tabular-nums transition-colors ${
              selected === x ? 'bg-[#1b4f9c] text-white' : 'text-[#1b3555] hover:bg-[#eef4fb]'
            }`}
          >
            {x}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimeField({
  value,
  onChange,
  ariaLabel,
  inputRef,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  inputRef?: (el: HTMLInputElement | null) => void
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
}) {
  const [text, setText] = useState(() => toDisplay(value))
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [h = '', m = ''] = value ? value.split(':') : []

  useEffect(() => {
    setText((prev) => (toDigits(prev) === toDigits(value) ? prev : toDisplay(value)))
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function commitText(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    setText(digits.length > 2 ? `${digits.slice(0, 2)}.${digits.slice(2)}` : digits)
    if (!digits) return onChange('')
    const hh = digits.slice(0, 2)
    const mm = digits.slice(2)
    if (digits.length === 4 && Number(hh) <= 23 && Number(mm) <= 59) onChange(`${hh}:${mm}`)
  }

  function commitBlur() {
    const digits = text.replace(/\D/g, '')
    if (!digits) return
    const hh = pad2(digits.slice(0, 2))
    const mm = pad2(digits.slice(2, 4) || '0')
    if (Number(hh) > 23 || Number(mm) > 59) {
      setText(toDisplay(value))
      return
    }
    setText(`${hh}.${mm}`)
    onChange(`${hh}:${mm}`)
  }

  function pick(nh: string, nm: string, close: boolean) {
    const hh = nh || '00'
    const mm = nm || '00'
    setText(`${hh}.${mm}`)
    onChange(`${hh}:${mm}`)
    if (close) setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative w-full min-w-0">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={text}
        placeholder="00.00"
        maxLength={5}
        onChange={(e) => commitText(e.target.value)}
        onBlur={commitBlur}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={timeCls}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${ariaLabel} pilih`}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9aa3af] transition-colors hover:text-[#1b4f9c]"
      >
        <Clock size={13} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 flex overflow-hidden rounded-lg border border-[#dfe4e8] bg-white shadow-lg">
          <TimeColumn label="Jam" options={HOUR_OPTS} selected={h} onPick={(x) => pick(x, m, false)} />
          <div className="w-px bg-[#eef1f4]" />
          <TimeColumn label="Menit" options={MINUTE_OPTS} selected={m} onPick={(x) => pick(h, x, true)} />
        </div>
      )}
    </div>
  )
}

export function PanduanEditor({
  eventId,
  eventTitle,
  presets,
  initialItinerary,
  initialRules,
  initialSections,
  initialCrewName,
  initialCrewPhone,
  initialCrewRole,
  initialCrewPhotoUrl,
  initialCrewList,
  initialDenahCrewName,
  initialDenahCrewRole,
  initialDenahCrewPhotoUrl,
  initialDenahVwCrewName,
  initialDenahVwCrewRole,
  initialDenahVwCrewPhotoUrl,
  initialLogoLeft,
  initialLogoLeft2,
  initialLogoCenter,
  initialLogoRight2,
  initialLogoRight,
}: {
  eventId: string
  eventTitle: string
  presets: PanduanPresetOption[]
  initialItinerary: string
  initialRules: string
  initialSections: string | null
  initialCrewName: string
  initialCrewPhone: string
  initialCrewRole: string
  initialCrewPhotoUrl: string | null
  initialCrewList: string | null
  initialDenahCrewName: string
  initialDenahCrewRole: string
  initialDenahCrewPhotoUrl: string | null
  initialDenahVwCrewName: string
  initialDenahVwCrewRole: string
  initialDenahVwCrewPhotoUrl: string | null
  initialLogoLeft: string | null
  initialLogoLeft2: string | null
  initialLogoCenter: string | null
  initialLogoRight2: string | null
  initialLogoRight: string | null
}) {
  const router = useRouter()
  const initialDayGroups = useMemo(() => {
    const doc = parseItineraryDoc(initialItinerary)
    return groupItineraryByDay(doc.rows, doc.notes, doc.sideNotes)
  }, [initialItinerary])
  const [dayBlocks, setDayBlocks] = useState<DayRows[]>(() =>
    initialDayGroups.map((g) =>
      g.rows.map((r) => ({ time: r.time, agenda: r.agenda, bold: r.bold, italic: r.italic })),
    ),
  )
  const [dayNotes, setDayNotes] = useState<string[]>(() => initialDayGroups.map((g) => g.note))
  const [daySideNotes, setDaySideNotes] = useState<string[]>(() => initialDayGroups.map((g) => g.sideNote))
  const [footerNote, setFooterNote] = useState<string>(() => parseItineraryDoc(initialItinerary).footerNote)
  const [rules, setRules] = useState<PanduanRule[]>(() => (initialRules ? parsePanduanRules(initialRules) : DEFAULT_PANDUAN_RULES))
  const [tataTertibOpen, setTataTertibOpen] = useState(true)
  const [sections, setSections] = useState<PanduanSectionItem[]>(() => parsePanduanSections(initialSections))
  const [crews, setCrews] = useState<CrewMember[]>(() => {
    const parsed = parseCrewList(initialCrewList)
    if (parsed.length > 0) return parsed
    const legacy: CrewMember = { name: initialCrewName, role: initialCrewRole, phone: initialCrewPhone, photoUrl: initialCrewPhotoUrl }
    return legacy.name || legacy.role || legacy.phone || legacy.photoUrl ? [legacy] : []
  })
  const [uploadingCrewIdx, setUploadingCrewIdx] = useState<number | null>(null)
  const [crewBusy, setCrewBusy] = useState(false)
  const [denahCrew, setDenahCrew] = useState({ name: initialDenahCrewName, role: initialDenahCrewRole, photoUrl: initialDenahCrewPhotoUrl })
  const [denahCrewEditing, setDenahCrewEditing] = useState(false)
  const [uploadingDenahPhoto, setUploadingDenahPhoto] = useState(false)
  const [denahCrewBusy, setDenahCrewBusy] = useState(false)
  const [denahVwCrew, setDenahVwCrew] = useState({ name: initialDenahVwCrewName, role: initialDenahVwCrewRole, photoUrl: initialDenahVwCrewPhotoUrl })
  const [denahVwCrewEditing, setDenahVwCrewEditing] = useState(false)
  const [uploadingDenahVwPhoto, setUploadingDenahVwPhoto] = useState(false)
  const [denahVwCrewBusy, setDenahVwCrewBusy] = useState(false)
  const [logoLeft, setLogoLeft] = useState<string | null>(initialLogoLeft)
  const [logoLeft2, setLogoLeft2] = useState<string | null>(initialLogoLeft2)
  const [logoCenter, setLogoCenter] = useState<string | null>(initialLogoCenter)
  const [logoRight2, setLogoRight2] = useState<string | null>(initialLogoRight2)
  const [logoRight, setLogoRight] = useState<string | null>(initialLogoRight)
  const [uploadingLogo, setUploadingLogo] = useState<LogoSlot | null>(null)

  const setLogoBySlot = (slot: LogoSlot) => (url: string | null) => {
    if (slot === 'left') setLogoLeft(url)
    else if (slot === 'left2') setLogoLeft2(url)
    else if (slot === 'center') setLogoCenter(url)
    else if (slot === 'right2') setLogoRight2(url)
    else setLogoRight(url)
  }
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const [presetOpen, setPresetOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetBusy, setPresetBusy] = useState(false)
  const [presetStatus, setPresetStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const rowRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function setDayRow(b: number, r: number, patch: Partial<DayRows[number]>) {
    setDayBlocks((blocks) =>
      blocks.map((rows, i) => (i === b ? rows.map((row, j) => (j === r ? { ...row, ...patch } : row)) : rows)),
    )
  }

  function addDayRow(b: number) {
    setDayBlocks((blocks) =>
      blocks.map((rows, i) => (i === b ? [...rows, { time: '', agenda: '', bold: false, italic: false }] : rows)),
    )
  }

  function removeDayRow(b: number, r: number) {
    setDayBlocks((blocks) => blocks.map((rows, i) => (i === b ? rows.filter((_, j) => j !== r) : rows)))
  }

  function addDay() {
    setDayBlocks((blocks) => [...blocks, []])
    setDayNotes((notes) => [...notes, ''])
    setDaySideNotes((notes) => [...notes, ''])
  }

  function removeDay(b: number) {
    setDayBlocks((blocks) => blocks.filter((_, i) => i !== b))
    setDayNotes((notes) => notes.filter((_, i) => i !== b))
    setDaySideNotes((notes) => notes.filter((_, i) => i !== b))
  }

  function setDayNote(b: number, value: string) {
    setDayNotes((notes) => notes.map((note, i) => (i === b ? value : note)))
  }

  function setDaySideNote(b: number, value: string) {
    setDaySideNotes((notes) => notes.map((note, i) => (i === b ? value : note)))
  }

  function setRuleText(r: number, value: string) {
    setRules((list) => list.map((rule, i) => (i === r ? { ...rule, text: value } : rule)))
  }

  function addRule() {
    setRules((list) => [...list, { text: '', items: [] }])
  }

  function removeRule(r: number) {
    setRules((list) => list.filter((_, i) => i !== r))
  }

  function moveRule(r: number, dir: -1 | 1) {
    setRules((list) => {
      const target = r + dir
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      ;[next[r], next[target]] = [next[target], next[r]]
      return next
    })
  }

  function setRuleItem(r: number, j: number, value: string) {
    setRules((list) =>
      list.map((rule, i) => (i === r ? { ...rule, items: (rule.items ?? []).map((item, k) => (k === j ? value : item)) } : rule)),
    )
  }

  function addRuleItem(r: number) {
    setRules((list) => list.map((rule, i) => (i === r ? { ...rule, items: [...(rule.items ?? []), ''] } : rule)))
  }

  function removeRuleItem(r: number, j: number) {
    setRules((list) =>
      list.map((rule, i) => (i === r ? { ...rule, items: (rule.items ?? []).filter((_, k) => k !== j) } : rule)),
    )
  }

  function dayRowEnter(b: number, r: number, col: number, e: KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const next = rowRefs.current[`${b}:${r}:${col + 1}`]
    if (next) {
      next.focus()
      return
    }
    const rowCount = dayBlocks[b]?.length
    const nextRow = rowRefs.current[`${b}:${r + 1}:0`]
    if (rowCount && r + 1 < rowCount && nextRow) {
      nextRow.focus()
      return
    }
    addDayRow(b)
    requestAnimationFrame(() => rowRefs.current[`${b}:${r + 1}:0`]?.focus())
  }

  function parseWaktu(value: string): { start: string; end: string } {
    const range = /^(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/.exec(value.trim())
    const single = /^(\d{1,2})[.:](\d{2})/.exec(value.trim())
    const toInput = (h: string, m: string) => `${h.padStart(2, '0')}:${m}`
    if (range) return { start: toInput(range[1], range[2]), end: toInput(range[3], range[4]) }
    if (single) return { start: toInput(single[1], single[2]), end: '' }
    return { start: '', end: '' }
  }

  function serializeWaktu(start: string, end: string): string {
    const s = start.replace(':', '.')
    const e = end.replace(':', '.')
    if (s && e) return `${s} - ${e}`
    return s
  }

  async function save() {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panduanItinerary: serializeItinerary(
            dayBlocks.flatMap((rows, b) => rows.map((row) => ({ ...row, day: b + 1 }))),
            Object.fromEntries(dayNotes.map((note, b) => [b + 1, note])),
            Object.fromEntries(daySideNotes.map((note, b) => [b + 1, note])),
            footerNote,
          ),
          panduanRules: serializePanduanRules(rules),
          panduanSections: serializePanduanSections(sections),
          panduanLogoLeft: logoLeft,
          panduanLogoLeft2: logoLeft2,
          panduanLogoCenter: logoCenter,
          panduanLogoRight2: logoRight2,
          panduanLogoRight: logoRight,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan.')
      setStatus({ kind: 'ok', msg: 'Panduan tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan.' })
    } finally {
      setLoading(false)
    }
  }

  function buildItinerary(): string {
    return serializeItinerary(
      dayBlocks.flatMap((rows, b) => rows.map((row) => ({ ...row, day: b + 1 }))),
      Object.fromEntries(dayNotes.map((note, b) => [b + 1, note])),
      Object.fromEntries(daySideNotes.map((note, b) => [b + 1, note])),
      footerNote,
    )
  }

  function applyPreset(id: string) {
    const preset = presets.find((p) => p.id === id)
    if (!preset) return
    const doc = parseItineraryDoc(preset.panduanItinerary)
    const groups = groupItineraryByDay(doc.rows, doc.notes, doc.sideNotes)
    setDayBlocks(
      groups.map((g) =>
      g.rows.map((r) => ({ time: r.time, agenda: r.agenda, bold: r.bold, italic: r.italic })),
      ),
    )
    setDayNotes(groups.map((g) => g.note))
    setDaySideNotes(groups.map((g) => g.sideNote))
    setFooterNote(doc.footerNote)
    setLogoLeft(preset.panduanLogoLeft)
    setLogoRight(preset.panduanLogoRight)
    setLogoLeft2(preset.panduanLogoLeft2)
    setLogoCenter(preset.panduanLogoCenter)
    setLogoRight2(preset.panduanLogoRight2)
    setStatus({ kind: 'ok', msg: `Preset "${preset.name}" dimuat. Tinjau lalu klik Simpan Panduan.` })
  }

  async function savePreset() {
    const name = presetName.trim()
    if (!name) {
      setPresetStatus({ kind: 'err', msg: 'Nama preset wajib diisi.' })
      return
    }
    setPresetBusy(true)
    setPresetStatus(null)
    try {
      const res = await fetch('/api/admin/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          kind: 'PANDUAN',
          data: {
            panduanItinerary: buildItinerary(),
            panduanLogoLeft: logoLeft,
            panduanLogoLeft2: logoLeft2,
            panduanLogoCenter: logoCenter,
            panduanLogoRight2: logoRight2,
            panduanLogoRight: logoRight,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan preset.')
      setPresetStatus({ kind: 'ok', msg: 'Preset panduan tersimpan.' })
      setPresetOpen(false)
      setPresetName('')
      router.refresh()
    } catch (err) {
      setPresetStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan preset.' })
    } finally {
      setPresetBusy(false)
    }
  }

  function updateCrew(index: number, patch: Partial<CrewMember>) {
    setCrews((list) => list.map((member, i) => (i === index ? { ...member, ...patch } : member)))
  }

  function addCrew() {
    setCrews((list) => (list.length >= MAX_CREW ? list : [...list, { name: '', role: '', phone: '', photoUrl: null }]))
  }

  function removeCrew(index: number) {
    const member = crews[index]
    setCrews((list) => list.filter((_, i) => i !== index))
    if (member?.photoUrl) {
      fetch(`/api/admin/events/${eventId}/crew-photo?url=${encodeURIComponent(member.photoUrl)}`, {
        method: 'DELETE',
      }).catch(() => undefined)
    }
  }

  async function removeCrewPhotoAt(index: number) {
    const member = crews[index]
    updateCrew(index, { photoUrl: null })
    if (member?.photoUrl) {
      fetch(`/api/admin/events/${eventId}/crew-photo?url=${encodeURIComponent(member.photoUrl)}`, {
        method: 'DELETE',
      }).catch(() => undefined)
    }
  }

  async function uploadCrewPhotoAt(index: number, file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setStatus({ kind: 'err', msg: 'Hanya mendukung gambar JPG, PNG, atau WebP.' })
      return
    }
    setUploadingCrewIdx(index)
    setStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slot', 'list')
      const res = await fetch(`/api/admin/events/${eventId}/crew-photo`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal mengunggah foto.')
      updateCrew(index, { photoUrl: data.url as string })
      setStatus({ kind: 'ok', msg: 'Foto crew diperbarui. Klik Simpan Crew untuk menyimpan.' })
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal mengunggah foto.' })
    } finally {
      setUploadingCrewIdx(null)
    }
  }

  async function uploadLogo(slot: LogoSlot, file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setStatus({ kind: 'err', msg: 'Hanya mendukung gambar JPG, PNG, atau WebP.' })
      return
    }
    setUploadingLogo(slot)
    setStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slot', slot)
      const res = await fetch(`/api/admin/events/${eventId}/panduan-logo`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal mengunggah logo.')
      setLogoBySlot(slot)(data.url)
      setStatus({ kind: 'ok', msg: 'Logo diperbarui.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal mengunggah logo.' })
    } finally {
      setUploadingLogo(null)
    }
  }

  async function removeLogo(slot: LogoSlot) {
    setUploadingLogo(slot)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/panduan-logo?slot=${slot}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus logo.')
      setLogoBySlot(slot)(null)
      setStatus({ kind: 'ok', msg: 'Logo dihapus.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menghapus logo.' })
    } finally {
      setUploadingLogo(null)
    }
  }

  async function saveCrews() {
    setCrewBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crewList: crews.map((member) => ({
            name: member.name.trim(),
            role: member.role.trim(),
            phone: member.phone.trim(),
            photoUrl: member.photoUrl,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan crew.')
      setStatus({ kind: 'ok', msg: 'Crew on duty tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan crew.' })
    } finally {
      setCrewBusy(false)
    }
  }

  async function uploadDenahCrewPhoto(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setStatus({ kind: 'err', msg: 'Hanya mendukung gambar JPG, PNG, atau WebP.' })
      return
    }
    setUploadingDenahPhoto(true)
    setStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slot', 'denah')
      const res = await fetch(`/api/admin/events/${eventId}/crew-photo`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal mengunggah foto.')
      setDenahCrew((c) => ({ ...c, photoUrl: data.url }))
      setStatus({ kind: 'ok', msg: 'Foto crew denah kamar diperbarui.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal mengunggah foto.' })
    } finally {
      setUploadingDenahPhoto(false)
    }
  }

  async function removeDenahCrewPhoto() {
    setDenahCrewBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/crew-photo?slot=denah`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus foto.')
      setDenahCrew((c) => ({ ...c, photoUrl: null }))
      setStatus({ kind: 'ok', msg: 'Foto crew denah kamar dihapus.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menghapus foto.' })
    } finally {
      setDenahCrewBusy(false)
    }
  }

  async function saveDenahCrew() {
    setDenahCrewBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denahKamarCrewName: denahCrew.name.trim() || null,
          denahKamarCrewRole: denahCrew.role.trim() || null,
          denahKamarCrewPhotoUrl: denahCrew.photoUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan crew.')
      setDenahCrewEditing(false)
      setStatus({ kind: 'ok', msg: 'Crew on duty denah kamar tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan crew.' })
    } finally {
      setDenahCrewBusy(false)
    }
  }

  async function clearDenahCrew() {
    setDenahCrewBusy(true)
    setStatus(null)
    try {
      if (denahCrew.photoUrl) {
        const res = await fetch(`/api/admin/events/${eventId}/crew-photo?slot=denah`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus foto.')
      }
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denahKamarCrewName: null, denahKamarCrewRole: null, denahKamarCrewPhotoUrl: null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus crew.')
      setDenahCrew({ name: '', role: '', photoUrl: null })
      setDenahCrewEditing(false)
      setStatus({ kind: 'ok', msg: 'Crew on duty denah kamar dihapus.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menghapus crew.' })
    } finally {
      setDenahCrewBusy(false)
    }
  }

  async function uploadDenahVwCrewPhoto(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setStatus({ kind: 'err', msg: 'Hanya mendukung gambar JPG, PNG, atau WebP.' })
      return
    }
    setUploadingDenahVwPhoto(true)
    setStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slot', 'vw')
      const res = await fetch(`/api/admin/events/${eventId}/crew-photo`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal mengunggah foto.')
      setDenahVwCrew((c) => ({ ...c, photoUrl: data.url }))
      setStatus({ kind: 'ok', msg: 'Gambar denah kendaraan diperbarui.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal mengunggah foto.' })
    } finally {
      setUploadingDenahVwPhoto(false)
    }
  }

  async function removeDenahVwCrewPhoto() {
    setDenahVwCrewBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/crew-photo?slot=vw`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus foto.')
      setDenahVwCrew((c) => ({ ...c, photoUrl: null }))
      setStatus({ kind: 'ok', msg: 'Gambar denah kendaraan dihapus.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menghapus foto.' })
    } finally {
      setDenahVwCrewBusy(false)
    }
  }

  async function saveDenahVwCrew() {
    setDenahVwCrewBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denahVwCrewName: denahVwCrew.name.trim() || null,
          denahVwCrewRole: denahVwCrew.role.trim() || null,
          denahVwCrewPhotoUrl: denahVwCrew.photoUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan gambar.')
      setDenahVwCrewEditing(false)
      setStatus({ kind: 'ok', msg: 'Gambar denah kendaraan tersimpan.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan gambar.' })
    } finally {
      setDenahVwCrewBusy(false)
    }
  }

  async function clearDenahVwCrew() {
    setDenahVwCrewBusy(true)
    setStatus(null)
    try {
      if (denahVwCrew.photoUrl) {
        const res = await fetch(`/api/admin/events/${eventId}/crew-photo?slot=vw`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus foto.')
      }
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denahVwCrewName: null, denahVwCrewRole: null, denahVwCrewPhotoUrl: null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus gambar.')
      setDenahVwCrew({ name: '', role: '', photoUrl: null })
      setDenahVwCrewEditing(false)
      setStatus({ kind: 'ok', msg: 'Gambar denah kendaraan dihapus.' })
      router.refresh()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Gagal menghapus gambar.' })
    } finally {
      setDenahVwCrewBusy(false)
    }
  }

  const rowCls =
    'rounded-lg border border-[#dfe4e8] bg-white px-3 py-2 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15'
  const descRowCls =
    'rounded-lg border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-medium text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15'
  const ruleRowCls =
    'rounded-lg border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15'
  const addBtnCls =
    'flex items-center gap-1 rounded-full bg-[#eef4fb] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#e2ecf8]'

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#1b3555]">Panduan Peserta</h2>
            <p className="mt-0.5 text-xs text-[#657080]">
              Itinerary khusus event ini, ditampilkan di panduan publik dan untuk crew.
            </p>
          </div>
          <Link
            href={`/event/${eventId}/panduan`}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb]"
          >
            <ExternalLink size={12} /> Lihat Halaman Publik
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#1b3555]">Preset Panduan</h2>
            <p className="mt-0.5 text-xs text-[#657080]">
              Simpan itinerary &amp; logo saat ini sebagai preset, atau muat preset yang sudah ada.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPresetName((n) => n || eventTitle)
              setPresetStatus(null)
              setPresetOpen((o) => !o)
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-[11px] font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95"
          >
            <Save size={12} /> Simpan sebagai Preset
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Terapkan</label>
          <select
            defaultValue=""
            disabled={presets.length === 0}
            onChange={(e) => {
              if (e.target.value) applyPreset(e.target.value)
              e.target.value = ''
            }}
            className="min-w-[200px] rounded-full border border-[#dfe4e8] bg-white py-2 pl-4 pr-8 text-xs font-bold text-[#1b3555] outline-none transition-colors hover:bg-[#eef4fb] disabled:opacity-50"
          >
            <option value="">{presets.length === 0 ? 'Belum ada preset panduan' : 'Pilih preset panduan…'}</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {presets.length > 0 && (
            <span className="text-[11px] text-[#9aa3af]">
              Preset mengisi itinerary &amp; logo di form — belum tersimpan sampai klik Simpan Panduan.
            </span>
          )}
        </div>

        {presetOpen && (
          <div className="mt-3 rounded-xl border border-[#e8ecf1] bg-[#fbfcfe] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value.slice(0, 200))}
                placeholder="Nama preset (mis. Open Trip Dufan)"
                maxLength={200}
                autoFocus
                className={`${rowCls} min-w-[220px] flex-1`}
              />
              <button
                type="button"
                onClick={savePreset}
                disabled={presetBusy}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-[11px] font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
              >
                {presetBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Simpan Preset
              </button>
              <button
                type="button"
                onClick={() => setPresetOpen(false)}
                className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-2 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
              >
                <X size={12} /> Batal
              </button>
            </div>
            {presetStatus && (
              <p className={`mt-2 text-[11px] font-semibold ${presetStatus.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                {presetStatus.msg}
              </p>
            )}
          </div>
        )}
        {presetStatus && !presetOpen && (
          <p className={`mt-2 text-[11px] font-semibold ${presetStatus.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {presetStatus.msg}
          </p>
        )}
      </div>

      <PanduanSectionsEditor sections={sections} onChange={setSections} disabled={loading} />

      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-[#1b3555]">Logo Kepala Halaman</h2>
          <p className="mt-0.5 text-xs text-[#657080]">
            Logo di kepala setiap halaman panduan. Urutan tampil: kiri → kiri 1 → tengah → kanan 1 → kanan. Kosongkan
            (Reset) untuk memakai bawaan / tidak menampilkan.
          </p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              { slot: 'left', label: 'Kiri', fallback: '/Logo%20Asita.png' },
              { slot: 'left2', label: 'Kiri 1', fallback: null },
              { slot: 'center', label: 'Tengah', fallback: null },
              { slot: 'right2', label: 'Kanan 1', fallback: null },
              { slot: 'right', label: 'Kanan', fallback: '/Logo%20siluet%20barokah%20tour.png' },
            ] as const
          ).map(({ slot, label, fallback }) => {
            const url =
              slot === 'left'
                ? logoLeft
                : slot === 'left2'
                  ? logoLeft2
                  : slot === 'center'
                    ? logoCenter
                    : slot === 'right2'
                      ? logoRight2
                      : logoRight
            const preview = url ?? fallback
            const busy = uploadingLogo === slot
            return (
              <div key={slot} className="flex items-center gap-3 rounded-lg border border-[#e8ecf1] bg-white p-3">
                <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#eef1f4]">
                  {preview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={preview} alt={`Logo ${label}`} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-[#9aa3af]">Kosong</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-[#1b3555]">Logo {label}</p>
                  <p className="text-[10px] text-[#9aa3af]">{url ? 'Kustom' : fallback ? 'Bawaan' : 'Kosong'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb]">
                      {busy ? <Loader2 size={11} className="animate-spin" /> : null}
                      {busy ? 'Mengunggah…' : 'Unggah'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadLogo(slot, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {url && (
                      <button
                        type="button"
                        onClick={() => removeLogo(slot)}
                        disabled={busy}
                        className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-60"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setTataTertibOpen((o) => !o)}
          aria-expanded={tataTertibOpen}
          aria-controls="tata-tertib-body"
          className="flex w-full items-start justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#1b3555]">Tata Tertib</h2>
            <p className="mt-0.5 text-xs text-[#657080]">
              Aturan dan crew on duty yang tampil di halaman panduan publik.
            </p>
          </div>
          <span className="mt-0.5 shrink-0 rounded-lg p-1 text-[#657080]">
            {tataTertibOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {tataTertibOpen && (
          <div id="tata-tertib-body" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Aturan</p>
              <button type="button" onClick={addRule} className={addBtnCls}>
                <Plus size={12} /> Tambah Aturan
              </button>
            </div>

            {rules.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-[#dfe4e8] px-4 py-3 text-xs text-[#9aa3af]">
                Belum ada aturan. Tambah aturan baru untuk menyusun tata tertib.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {rules.map((rule, r) => (
                  <div key={r} className="rounded-xl border border-[#e8ecf1] bg-[#fbfcfe] p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef4fb] text-[11px] font-bold text-[#1b4f9c]">
                        {r + 1}
                      </span>
                      <textarea
                        value={rule.text}
                        onChange={(e) => setRuleText(r, e.target.value)}
                        placeholder="Tulis isi aturan…"
                        rows={2}
                        className={`${ruleRowCls} min-w-0 flex-1 resize-y`}
                      />
                      <div className="flex shrink-0 flex-col gap-1">
                        <button type="button" onClick={() => moveRule(r, -1)} disabled={r === 0} aria-label="Naikkan aturan" className="rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-[#eef4fb] hover:text-[#1b4f9c] disabled:opacity-30">
                          <ChevronUp size={14} />
                        </button>
                        <button type="button" onClick={() => moveRule(r, 1)} disabled={r === rules.length - 1} aria-label="Turunkan aturan" className="rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-[#eef4fb] hover:text-[#1b4f9c] disabled:opacity-30">
                          <ChevronDown size={14} />
                        </button>
                        <button type="button" onClick={() => removeRule(r)} aria-label="Hapus aturan" className="rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {(rule.items ?? []).length > 0 && (
                      <div className="mt-2 space-y-2 pl-8">
                        {(rule.items ?? []).map((item, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <span className="shrink-0 font-bold text-[#9aa3af]">-</span>
                            <input
                              value={item}
                              onChange={(e) => setRuleItem(r, j, e.target.value)}
                              placeholder="Poin rincian (opsional)"
                              className={`${ruleRowCls} min-w-0 flex-1`}
                            />
                            <button type="button" onClick={() => removeRuleItem(r, j)} aria-label="Hapus poin" className="shrink-0 rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button type="button" onClick={() => addRuleItem(r)} className={`${addBtnCls} ml-8 mt-2`}>
                      <Plus size={12} /> Tambah Poin Rincian
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-xl border border-[#e8ecf1] bg-[#fbfcfe] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-sm font-bold text-[#1b3555]">Crew on Duty</span>
                  <span className="truncate text-[11px] text-[#9aa3af]">
                    Tampil di bawah Tata Tertib · {crews.length}/{MAX_CREW}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addCrew}
                  disabled={crews.length >= MAX_CREW}
                  className={`${addBtnCls} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Plus size={12} /> Tambah Crew
                </button>
              </div>

              {crews.length === 0 ? (
                <p className="mt-2 text-xs text-[#9aa3af]">Belum ada crew on duty untuk event ini.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {crews.map((member, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e8ecf1] bg-white p-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dcebe0] text-lg font-bold text-[#2ca84a]">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name || `Crew ${i + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          member.name.slice(0, 2).toUpperCase() || 'CR'
                        )}
                      </div>

                      <div className="grid min-w-[220px] flex-1 gap-2 sm:grid-cols-3">
                        <input
                          value={member.name}
                          onChange={(e) => updateCrew(i, { name: e.target.value })}
                          placeholder="Nama crew"
                          maxLength={120}
                          className={descRowCls}
                        />
                        <input
                          value={member.role}
                          onChange={(e) => updateCrew(i, { role: e.target.value })}
                          placeholder="Jabatan / Peran (mis. Tour Leader)"
                          maxLength={120}
                          className={descRowCls}
                        />
                        <input
                          value={member.phone}
                          onChange={(e) => updateCrew(i, { phone: e.target.value })}
                          placeholder="Nomor (No. HP / WhatsApp)"
                          maxLength={40}
                          className={descRowCls}
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb]">
                          {uploadingCrewIdx === i ? <Loader2 size={11} className="animate-spin" /> : null}
                          {uploadingCrewIdx === i ? 'Mengunggah…' : member.photoUrl ? 'Ganti Foto' : 'Unggah Foto'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={uploadingCrewIdx === i || crewBusy}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) uploadCrewPhotoAt(i, file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                        {member.photoUrl && (
                          <button
                            type="button"
                            onClick={() => removeCrewPhotoAt(i)}
                            disabled={uploadingCrewIdx === i || crewBusy}
                            className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-60"
                          >
                            Hapus Foto
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCrew(i)}
                          disabled={crewBusy}
                          aria-label="Hapus crew"
                          className="rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {crews.length > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={saveCrews}
                    disabled={crewBusy}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
                  >
                    {crewBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Simpan Crew
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-[#1b3555]">Itinerary Perjalanan</h2>
          <p className="mt-0.5 text-xs text-[#657080]">
            {dayBlocks.length} hari · {dayBlocks.reduce((n, rows) => n + rows.length, 0)} agenda
          </p>
        </div>

        {dayBlocks.length === 0 ? (
          <p className="mt-2 text-xs text-[#9aa3af]">Belum ada hari. Tambah hari baru untuk menyusun itinerary.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {dayBlocks.map((rows, b) => (
              <div key={b} className="rounded-xl border border-[#e8ecf1] bg-[#fbfcfe] p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-bold text-[#1b4f9c]">
                    <CalendarDays size={13} /> Day {b + 1}
                  </span>
                  <span className="text-[11px] text-[#9aa3af]">{rows.length} agenda</span>
                  <textarea
                    value={daySideNotes[b] ?? ''}
                    onChange={(e) => setDaySideNote(b, e.target.value)}
                    placeholder={`Keterangan di samping Day ${b + 1} (opsional)`}
                    rows={2}
                    className={`${rowCls} min-w-0 flex-1 resize-y`}
                  />
                  <button
                    type="button"
                    onClick={() => removeDay(b)}
                    aria-label={`Hapus hari ${b + 1}`}
                    className="shrink-0 rounded-lg p-2 text-[#657080] transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <textarea
                  value={dayNotes[b] ?? ''}
                  onChange={(e) => setDayNote(b, e.target.value)}
                  placeholder={`Keterangan di bawah Day ${b + 1} (opsional)`}
                  rows={2}
                  className={`${rowCls} mt-3 w-full resize-y`}
                />

                {rows.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-[#dfe4e8] px-4 py-3 text-xs text-[#9aa3af]">
                    Belum ada agenda — susun jadwal hari ini.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#657080] sm:flex">
                      <span className="w-full sm:w-56 sm:shrink-0 sm:pl-1">Waktu</span>
                      <span className="w-full sm:min-w-0 sm:flex-1 sm:pl-1">Agenda</span>
                    </div>
                    <div className="mt-2 space-y-2 sm:mt-3">
                      {rows.map((row, r) => (
                        <div key={r} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                          <div className="flex items-center gap-1.5 sm:w-56 sm:shrink-0">
                            <TimeField
                              ariaLabel="Jam mulai"
                              value={parseWaktu(row.time).start}
                              onChange={(value) => setDayRow(b, r, { time: serializeWaktu(value, parseWaktu(row.time).end) })}
                              inputRef={(el) => {
                                rowRefs.current[`${b}:${r}:0`] = el
                              }}
                              onKeyDown={(e) => dayRowEnter(b, r, 0, e)}
                            />
                            <span className="shrink-0 text-[#9aa3af]">–</span>
                            <TimeField
                              ariaLabel="Jam selesai (opsional)"
                              value={parseWaktu(row.time).end}
                              onChange={(value) => setDayRow(b, r, { time: serializeWaktu(parseWaktu(row.time).start, value) })}
                              inputRef={(el) => {
                                rowRefs.current[`${b}:${r}:1`] = el
                              }}
                              onKeyDown={(e) => dayRowEnter(b, r, 1, e)}
                            />
                          </div>
                          <input
                            ref={(el) => {
                              rowRefs.current[`${b}:${r}:2`] = el
                            }}
                            value={row.agenda}
                            onChange={(e) => setDayRow(b, r, { agenda: e.target.value })}
                            onKeyDown={(e) => dayRowEnter(b, r, 2, e)}
                            placeholder="Agenda kegiatan"
                            className={`${rowCls} w-full sm:min-w-0 sm:flex-1`}
                          />
                          <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setDayRow(b, r, { bold: !row.bold })}
                              aria-label="Tebal"
                              aria-pressed={row.bold}
                              title="Tebal"
                              className={`rounded-lg p-2 text-sm font-extrabold leading-none transition-colors ${row.bold ? 'bg-[#00A3E0] text-white' : 'text-[#657080] hover:bg-[#eef4fb] hover:text-[#00A3E0]'}`}
                            >
                              B
                            </button>
                            <button
                              type="button"
                              onClick={() => setDayRow(b, r, { italic: !row.italic })}
                              aria-label="Miring"
                              aria-pressed={row.italic}
                              title="Miring"
                              className={`rounded-lg p-2 text-sm font-bold italic leading-none transition-colors ${row.italic ? 'bg-[#00A3E0] text-white' : 'text-[#657080] hover:bg-[#eef4fb] hover:text-[#00A3E0]'}`}
                            >
                              I
                            </button>
                            <button type="button" onClick={() => removeDayRow(b, r)} aria-label="Hapus agenda" className="rounded-lg p-2 text-[#657080] transition-colors hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <button type="button" onClick={() => addDayRow(b)} className={`${addBtnCls} mt-3`}>
                  <Plus size={12} /> Tambahkan Agenda
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addDay}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#c6d2df] py-3 text-xs font-bold text-[#1b4f9c] transition-colors hover:border-[#1b4f9c] hover:bg-[#eef4fb]"
        >
          <Plus size={14} /> Tambah Hari Baru
        </button>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold text-[#657080]">Keterangan Tambahan (di bawah itinerary)</label>
          <textarea
            value={footerNote}
            onChange={(e) => setFooterNote(e.target.value)}
            placeholder="Catatan tambahan yang tampil di bawah tabel itinerary (opsional)"
            rows={2}
            className={`${rowCls} w-full resize-y`}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#dfe4e8] bg-white shadow-sm">
        <section className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded-full px-0 py-1 text-sm font-bold text-black">Gambar Hotel</span>
              <span className="truncate text-[11px] text-[#9aa3af]">Tampil di bawah tabel Denah Kamar</span>
            </div>
            {!denahCrew.name && !denahCrewEditing && (
              <button type="button" onClick={() => setDenahCrewEditing(true)} className={addBtnCls}>
                <Plus size={12} /> Tambah Gambar
              </button>
            )}
          </div>

        {denahCrew.name ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dcebe0] text-base font-bold text-[#2ca84a]">
              {denahCrew.photoUrl ? (
                <img src={denahCrew.photoUrl} alt={denahCrew.name} className="h-full w-full object-cover" />
              ) : (
                denahCrew.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <strong className="block text-sm text-[#1b3555]">{denahCrew.name}</strong>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => setDenahCrewEditing(true)} className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb]">
                <Pencil size={11} /> Edit
              </button>
              <button type="button" onClick={clearDenahCrew} disabled={denahCrewBusy} className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60">
                <Trash2 size={11} /> Hapus
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#9aa3af]">Belum ada gambar hotel.</p>
        )}

        {denahCrewEditing && (
          <div className="mt-4 space-y-3 border-t border-[#eef1f4] pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dcebe0] text-xl font-bold text-[#2ca84a]">
                {denahCrew.photoUrl ? (
                  <img src={denahCrew.photoUrl} alt={denahCrew.name || 'Foto crew'} className="h-full w-full object-cover" />
                ) : (
                  denahCrew.name.slice(0, 2).toUpperCase() || 'CR'
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] disabled:opacity-60">
                {uploadingDenahPhoto ? <Loader2 size={11} className="animate-spin" /> : null}
                {uploadingDenahPhoto ? 'Mengunggah…' : 'Unggah Foto'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingDenahPhoto || denahCrewBusy} onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadDenahCrewPhoto(file)
                  e.target.value = ''
                }} />
              </label>
              {denahCrew.photoUrl && (
                <button type="button" onClick={removeDenahCrewPhoto} disabled={uploadingDenahPhoto || denahCrewBusy} className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-60">
                  Hapus Foto
                </button>
              )}
            </div>

            <textarea
              value={denahCrew.name}
              onChange={(e) => {
                setDenahCrew((c) => ({ ...c, name: e.target.value }))
                e.target.style.height = 'auto'
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
              placeholder="Nama Hotel"
              rows={1}
              className={`${descRowCls} w-full resize-none overflow-hidden`}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDenahCrewEditing(false)
                  setDenahCrew({ name: initialDenahCrewName, role: initialDenahCrewRole, photoUrl: initialDenahCrewPhotoUrl })
                }}
                disabled={denahCrewBusy}
                className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#eef1f4] disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveDenahCrew}
                disabled={denahCrewBusy}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
              >
                {denahCrewBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Simpan Gambar
              </button>
            </div>
          </div>
        )}
        </section>
      </div>

      <div className="rounded-2xl border border-[#dfe4e8] bg-white shadow-sm">
        <section className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded-full px-0 py-1 text-sm font-bold text-black">Gambar Mobil</span>
              <span className="truncate text-[11px] text-[#9aa3af]">Tampil di bawah tabel Denah Kendaraan</span>
            </div>
            {!denahVwCrew.name && !denahVwCrewEditing && (
              <button type="button" onClick={() => setDenahVwCrewEditing(true)} className={addBtnCls}>
                <Plus size={12} /> Tambah Gambar
              </button>
            )}
          </div>

        {denahVwCrew.name ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dcebe0] text-base font-bold text-[#2ca84a]">
              {denahVwCrew.photoUrl ? (
                <img src={denahVwCrew.photoUrl} alt={denahVwCrew.name} className="h-full w-full object-cover" />
              ) : (
                denahVwCrew.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <strong className="block text-sm text-[#1b3555]">{denahVwCrew.name}</strong>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => setDenahVwCrewEditing(true)} className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb]">
                <Pencil size={11} /> Edit
              </button>
              <button type="button" onClick={clearDenahVwCrew} disabled={denahVwCrewBusy} className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60">
                <Trash2 size={11} /> Hapus
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#9aa3af]">Belum ada gambar mobil.</p>
        )}

        {denahVwCrewEditing && (
          <div className="mt-4 space-y-3 border-t border-[#eef1f4] pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dcebe0] text-xl font-bold text-[#2ca84a]">
                {denahVwCrew.photoUrl ? (
                  <img src={denahVwCrew.photoUrl} alt={denahVwCrew.name || 'Gambar mobil'} className="h-full w-full object-cover" />
                ) : (
                  denahVwCrew.name.slice(0, 2).toUpperCase() || 'MB'
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] disabled:opacity-60">
                {uploadingDenahVwPhoto ? <Loader2 size={11} className="animate-spin" /> : null}
                {uploadingDenahVwPhoto ? 'Mengunggah…' : 'Unggah Gambar'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingDenahVwPhoto || denahVwCrewBusy} onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadDenahVwCrewPhoto(file)
                  e.target.value = ''
                }} />
              </label>
              {denahVwCrew.photoUrl && (
                <button type="button" onClick={removeDenahVwCrewPhoto} disabled={uploadingDenahVwPhoto || denahVwCrewBusy} className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-60">
                  Hapus Gambar
                </button>
              )}
            </div>

            <textarea
              value={denahVwCrew.name}
              onChange={(e) => {
                setDenahVwCrew((c) => ({ ...c, name: e.target.value }))
                e.target.style.height = 'auto'
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
              placeholder="Keterangan (mis. Nama crew / judul denah kendaraan)"
              rows={1}
              className={`${descRowCls} w-full resize-none overflow-hidden`}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDenahVwCrewEditing(false)
                  setDenahVwCrew({ name: initialDenahVwCrewName, role: initialDenahVwCrewRole, photoUrl: initialDenahVwCrewPhotoUrl })
                }}
                disabled={denahVwCrewBusy}
                className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#eef1f4] disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveDenahVwCrew}
                disabled={denahVwCrewBusy}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
              >
                {denahVwCrewBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Simpan Gambar
              </button>
            </div>
          </div>
        )}
        </section>
      </div>

      {status && (
        <p className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${status.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {status.kind === 'ok' && <Check size={13} className="mr-1 inline" />}
          {status.msg}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-6 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Simpan Panduan
        </button>
      </div>
    </div>
  )
}