'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, BedDouble, Car, Check, ChevronLeft, ChevronRight, ImageUp, Loader2, Search, SearchX, Trash2, X } from 'lucide-react'
import { PARTICIPANTS_CHANGED_EVENT, notifyParticipantsChanged } from '@/lib/events'
import { UNASSIGNED_ROOM } from '@/lib/participant-groups'
import type { RoomTypeOption } from '@/lib/room-types'
import { RoomTypeOptions } from './room-type-options'

type Member = {
  id: string
  name: string
  busName: string
  order: number
  room: string
  roomType: string
  vw: string
}

type ApiGroup = {
  key: string
  room?: string
  roomType?: string | null
  vw?: string
  members: Member[]
}

type Group = {
  key: string
  label: string
  roomType: string | null
  members: Member[]
}

const REFRESH_MS = 10000
const PAGE_SIZE = 25

function InlineEdit({
  eventId,
  participantId,
  field,
  value,
  placeholder,
  center,
}: {
  eventId: string
  participantId: string
  field: 'room' | 'roomType' | 'vw'
  value: string
  placeholder?: string
  center?: boolean
}) {
  const [val, setVal] = useState(value)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setVal(value)
    setFailed(false)
  }, [value])

  async function commit() {
    if (saving) return
    const next = val.trim()
    if (next === value.trim()) {
      setVal(value)
      return
    }
    setSaving(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan.')
      notifyParticipantsChanged()
    } catch {
      setFailed(true)
      setVal(value)
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="relative flex items-center">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          } else if (e.key === 'Escape') {
            setVal(value)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        placeholder={placeholder ?? '—'}
        disabled={saving}
        title={failed ? 'Gagal menyimpan, coba lagi' : undefined}
        className={`w-full rounded-md border bg-transparent px-1.5 py-1 text-[11px] font-bold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#b6bec8] hover:border-[#cdd8e2] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15 disabled:opacity-60 ${
          failed ? 'border-red-300 bg-red-50' : 'border-transparent'
        } ${center ? 'text-center' : 'text-left'}`}
      />
      {saving && <Loader2 size={11} className="absolute right-1 animate-spin text-[#1b4f9c]" />}
    </span>
  )
}

function GroupRoomTypeEdit({
  eventId,
  room,
  roomType,
  options,
}: {
  eventId: string
  room: string
  roomType: string | null
  options: RoomTypeOption[]
}) {
  const [val, setVal] = useState(roomType ?? '')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setVal(roomType ?? '')
    setFailed(false)
  }, [roomType])

  async function commit(next: string) {
    if (saving) return
    setVal(next)
    if (next.trim() === (roomType ?? '').trim()) return
    setSaving(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/rooms`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, roomType: next }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan.')
      notifyParticipantsChanged()
    } catch {
      setFailed(true)
      setVal(roomType ?? '')
    } finally {
      setSaving(false)
    }
  }

  const current = val.trim()
  const isLegacy = current !== '' && !options.some((o) => o.name === current)

  return (
    <span className="relative flex items-center">
      <select
        value={val}
        onChange={(e) => commit(e.target.value)}
        disabled={saving}
        title={failed ? 'Gagal menyimpan, coba lagi' : undefined}
        className={`w-full cursor-pointer rounded-md border px-1.5 py-1 text-center text-[11px] font-bold text-[#1b3555] outline-none transition-colors hover:border-[#cdd8e2] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15 disabled:opacity-60 ${
          failed ? 'border-red-300 bg-red-50' : 'border-transparent'
        }`}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.name}>
            {o.name}
          </option>
        ))}
        {isLegacy && <option value={val}>{val}</option>}
      </select>
      {saving && <Loader2 size={11} className="pointer-events-none absolute right-1 animate-spin text-[#1b4f9c]" />}
    </span>
  )
}

export function ParticipantGroups({ eventId, mode, roomTypes = [] }: { eventId: string; mode: 'room' | 'vw'; roomTypes?: RoomTypeOption[] }) {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [autoTitle, setAutoTitle] = useState('')
  const [vwTitle, setVwTitle] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)
  const [titleFailed, setTitleFailed] = useState(false)
  const [titleSaved, setTitleSaved] = useState(false)
  const [vwDesc, setVwDesc] = useState<string | null>(null)
  const [descDraft, setDescDraft] = useState('')
  const [descSaving, setDescSaving] = useState(false)
  const [descFailed, setDescFailed] = useState(false)
  const [descSaved, setDescSaved] = useState(false)
  const [vwPhoto, setVwPhoto] = useState<string | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [swapSource, setSwapSource] = useState<Member | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [swapFailed, setSwapFailed] = useState(false)

  const endpoint = mode === 'room' ? 'rooms' : 'vw'

  useEffect(() => {
    setPage(0)
  }, [eventId, mode, query])

  useEffect(() => {
    setSwapSource(null)
    setSwapFailed(false)
  }, [eventId, mode])

  useEffect(() => {
    setTitleDraft(vwTitle ?? '')
  }, [vwTitle])

  useEffect(() => {
    setDescDraft(vwDesc ?? '')
  }, [vwDesc])

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    const load = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const res = await fetch(`/api/admin/events/${eventId}/${endpoint}`, { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const payload = (await res.json().catch(() => null)) as {
          groups?: ApiGroup[]
          autoTitle?: string
          vwTitle?: string | null
          denahVwCrewName?: string | null
          denahVwCrewPhotoUrl?: string | null
        } | null
        if (!payload || cancelled) return
        setGroups(
          (payload.groups ?? []).map((g) => ({
            key: g.key,
            label: mode === 'room' ? (g.room ?? g.key) : (g.vw ?? g.key),
            roomType: g.roomType ?? null,
            members: g.members,
          })),
        )
        if (mode === 'vw') {
          setAutoTitle(payload.autoTitle ?? '')
          setVwTitle(payload.vwTitle ?? null)
          setVwDesc(payload.denahVwCrewName ?? null)
          setVwPhoto(payload.denahVwCrewPhotoUrl ?? null)
        }
      } catch {
        // abaikan, refresh berikutnya
      } finally {
        if (!cancelled) {
          inFlight = false
          setLoading(false)
        }
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    const onChanged = () => load()
    window.addEventListener(PARTICIPANTS_CHANGED_EVENT, onChanged)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener(PARTICIPANTS_CHANGED_EVENT, onChanged)
    }
  }, [eventId, endpoint, mode])

  async function commitTitle(value?: string) {
    if (mode !== 'vw' || titleSaving) return
    const next = (value ?? titleDraft).trim()
    const baseline = (vwTitle ?? '').trim()
    if (next === baseline) {
      setTitleDraft(vwTitle ?? '')
      return
    }
    setTitleSaving(true)
    setTitleFailed(false)
    setTitleSaved(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vwTitle: next }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan.')
      setVwTitle(next || null)
      setTitleSaved(true)
      window.setTimeout(() => setTitleSaved(false), 1500)
      notifyParticipantsChanged()
    } catch {
      setTitleFailed(true)
      setTitleDraft(vwTitle ?? '')
    } finally {
      setTitleSaving(false)
    }
  }

  async function commitDesc(value?: string) {
    if (mode !== 'vw' || descSaving) return
    const next = (value ?? descDraft).trim()
    const baseline = (vwDesc ?? '').trim()
    if (next === baseline) {
      setDescDraft(vwDesc ?? '')
      return
    }
    setDescSaving(true)
    setDescFailed(false)
    setDescSaved(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denahVwCrewName: next || null }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan.')
      setVwDesc(next || null)
      setDescSaved(true)
      window.setTimeout(() => setDescSaved(false), 1500)
      notifyParticipantsChanged()
    } catch {
      setDescFailed(true)
      setDescDraft(vwDesc ?? '')
    } finally {
      setDescSaving(false)
    }
  }

  async function resetToDefault() {
    if (mode !== 'vw' || titleSaving || descSaving) return
    setTitleSaving(true)
    setDescSaving(true)
    setTitleFailed(false)
    setDescFailed(false)
    setTitleSaved(false)
    setDescSaved(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vwTitle: null, denahVwCrewName: null }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan.')
      setVwTitle(null)
      setVwDesc(null)
      setTitleDraft('')
      setDescDraft('')
      setTitleSaved(true)
      setDescSaved(true)
      window.setTimeout(() => {
        setTitleSaved(false)
        setDescSaved(false)
      }, 1500)
      notifyParticipantsChanged()
    } catch {
      setTitleFailed(true)
      setDescFailed(true)
      setTitleDraft(vwTitle ?? '')
      setDescDraft(vwDesc ?? '')
    } finally {
      setTitleSaving(false)
      setDescSaving(false)
    }
  }

  async function uploadVwPhoto(file: File) {
    if (mode !== 'vw' || photoSaving) return
    setPhotoSaving(true)
    setPhotoFailed(false)
    try {
      const form = new FormData()
      form.append('slot', 'vw')
      form.append('file', file)
      const res = await fetch(`/api/admin/events/${eventId}/crew-photo`, { method: 'POST', body: form })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal mengunggah gambar.')
      setVwPhoto(data?.url ?? null)
      notifyParticipantsChanged()
    } catch {
      setPhotoFailed(true)
    } finally {
      setPhotoSaving(false)
    }
  }

  async function removeVwPhoto() {
    if (mode !== 'vw' || photoSaving) return
    setPhotoSaving(true)
    setPhotoFailed(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/crew-photo?slot=vw`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus gambar.')
      setVwPhoto(null)
      notifyParticipantsChanged()
    } catch {
      setPhotoFailed(true)
    } finally {
      setPhotoSaving(false)
    }
  }

  async function swapAssignments(source: Member, target: Member) {
    if (swapping) return
    if (source.id === target.id) {
      setSwapSource(null)
      return
    }
    setSwapping(true)
    setSwapFailed(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aId: source.id, bId: target.id, field: mode === 'room' ? 'room' : 'vw' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menukar.')
      setSwapSource(null)
      notifyParticipantsChanged()
    } catch {
      setSwapFailed(true)
    } finally {
      setSwapping(false)
    }
  }

  const groupsSafe = groups ?? []
  const q = query.trim().toLowerCase()
  const filteredGroups = q
    ? groupsSafe
        .map((group) => {
          const groupMatch =
            group.label.toLowerCase().includes(q) || (group.roomType ?? '').toLowerCase().includes(q)
          if (groupMatch) return group
          const members = group.members.filter(
            (m) =>
              m.name.toLowerCase().includes(q) ||
              m.busName.toLowerCase().includes(q) ||
              m.room.toLowerCase().includes(q) ||
              m.vw.toLowerCase().includes(q) ||
              m.roomType.toLowerCase().includes(q),
          )
          return members.length > 0 ? { ...group, members } : null
        })
        .filter((group): group is Group => group !== null)
    : groupsSafe
  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const pageGroups = filteredGroups.slice(start, start + PAGE_SIZE)

  const groupHeadClass =
    'border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] bg-[#f4f7fb] px-2 py-1.5 text-center align-middle text-[11px] font-black text-[#1b4f9c]'

  const swapCell = (member: Member, top: string) => {
    const selected = swapSource?.id === member.id
    return (
      <td className={`border border-[#cdd8e2] px-1 py-1 text-center align-middle${top}`}>
        <button
          type="button"
          disabled={swapping}
          onClick={() => (swapSource ? swapAssignments(swapSource, member) : setSwapSource(member))}
          title={
            selected
              ? 'Batalkan pilihan'
              : swapSource
                ? `Tukar dengan ${member.name}`
                : `Pilih ${member.name} untuk ditukar`
          }
          aria-label={`Tukar ${member.name}`}
          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:opacity-50 ${
            selected
              ? 'bg-[#1b4f9c] text-white'
              : swapSource
                ? 'text-[#1b4f9c] ring-1 ring-[#1b4f9c]/30 hover:bg-[#eef4fb]'
                : 'text-[#9aa3af] hover:bg-[#eef4fb] hover:text-[#1b4f9c]'
          }`}
        >
          <ArrowLeftRight size={13} />
        </button>
      </td>
    )
  }

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white shadow-sm">
      <div className="border-b border-[#dfe4e8] px-5 py-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#1b3555]">
          {mode === 'room' ? (
            <BedDouble size={15} className="text-[#00A3E0]" />
          ) : (
            <Car size={15} className="text-[#00A3E0]" />
          )}
          {mode === 'room' ? 'Pengelompokan Per Kamar' : 'Pengelompokan Per Mobil'}
        </h2>
        <p className="mt-0.5 text-xs text-[#657080]">
          {mode === 'room'
            ? 'Kelompok peserta berdasarkan No Kamar. No Kamar diubah per peserta; Tipe Kamar cukup diedit sekali dan berlaku untuk seluruh kamar. Klik ikon tukar untuk menukar kamar dua peserta.'
            : 'Kelompok peserta berdasarkan No Mobil. Klik No Mobil lalu Enter untuk mengubah. Klik ikon tukar untuk menukar mobil dua peserta.'}{' '}
          Peserta otomatis pindah grup ketika nilainya diubah.
        </p>

        {mode === 'room' && <RoomTypeOptions eventId={eventId} roomTypes={roomTypes} />}

        <label className="mt-3 flex items-center gap-2 rounded-full border border-[#dfe4e8] bg-[#f8fafc] px-3.5 py-2 sm:max-w-xs">
          <Search size={14} className="shrink-0 text-[#9aa3af]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'room' ? 'Cari nama / bus / no kamar / tipe kamar…' : 'Cari nama / bus / no mobil…'}
            aria-label={mode === 'room' ? 'Cari nama, bus, nomor kamar, atau tipe kamar' : 'Cari nama, bus, atau nomor mobil'}
            className="w-full min-w-[8rem] bg-transparent text-xs font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af]"
          />
        </label>

        {mode === 'vw' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#657080]">Tampilan Denah Mobil</span>
              <button
                type="button"
                onClick={resetToDefault}
                disabled={titleSaving || descSaving || (!vwTitle && !vwDesc)}
                title="Kembalikan judul & deskripsi ke otomatis"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-3 py-1 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] disabled:opacity-50"
              >
                {titleSaving || descSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                Default
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block min-h-[20px] text-[11px] font-semibold uppercase tracking-wide text-[#657080]">Judul Denah Mobil</label>
                <div className="relative mt-1">
                  <input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={() => commitTitle()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        ;(e.target as HTMLInputElement).blur()
                      } else if (e.key === 'Escape') {
                        setTitleDraft(vwTitle ?? '')
                        ;(e.target as HTMLInputElement).blur()
                      }
                    }}
                    placeholder={autoTitle || 'Denah Mobil'}
                    disabled={titleSaving}
                    title={titleFailed ? 'Gagal menyimpan, coba lagi' : undefined}
                    className={`w-full rounded-xl border px-3 py-2 pr-9 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:ring-2 focus:ring-[#1b4f9c]/15 disabled:opacity-60 ${
                      titleFailed ? 'border-red-300 bg-red-50' : 'border-[#dfe4e8] bg-[#f8fafc] focus:border-[#1b4f9c] focus:bg-white'
                    }`}
                  />
                  {titleSaving ? (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#1b4f9c]" />
                  ) : titleDraft.trim() !== (vwTitle ?? '').trim() ? (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commitTitle()}
                      title="Simpan (Enter)"
                      aria-label="Simpan judul"
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#2ca84a] transition-colors hover:bg-[#eaf7ee]"
                    >
                      <Check size={15} />
                    </button>
                  ) : titleSaved ? (
                    <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2ca84a]" />
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-[#9aa3af]">
                  {vwTitle ? 'Dikustom. Klik "Default" untuk kembali ke otomatis.' : `Otomatis: ${autoTitle}.`}
                </p>
              </div>

              <div>
                <label className="block min-h-[20px] text-[11px] font-semibold uppercase tracking-wide text-[#657080]">Deskripsi Denah Mobil</label>
                <div className="relative mt-1">
                  <input
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onBlur={() => commitDesc()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        ;(e.target as HTMLInputElement).blur()
                      } else if (e.key === 'Escape') {
                        setDescDraft(vwDesc ?? '')
                        ;(e.target as HTMLInputElement).blur()
                      }
                    }}
                    placeholder={autoTitle || 'Ketik deskripsi'}
                    disabled={descSaving}
                    title={descFailed ? 'Gagal menyimpan, coba lagi' : undefined}
                    className={`w-full rounded-xl border px-3 py-2 pr-9 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:ring-2 focus:ring-[#1b4f9c]/15 disabled:opacity-60 ${
                      descFailed ? 'border-red-300 bg-red-50' : 'border-[#dfe4e8] bg-[#f8fafc] focus:border-[#1b4f9c] focus:bg-white'
                    }`}
                  />
                  {descSaving ? (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#1b4f9c]" />
                  ) : descDraft.trim() !== (vwDesc ?? '').trim() ? (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commitDesc()}
                      title="Simpan (Enter)"
                      aria-label="Simpan deskripsi"
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#2ca84a] transition-colors hover:bg-[#eaf7ee]"
                    >
                      <Check size={15} />
                    </button>
                  ) : descSaved ? (
                    <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2ca84a]" />
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-[#9aa3af]">
                  {vwDesc ? 'Dikustom. Klik "Default" untuk kembali ke otomatis.' : `Otomatis: ${autoTitle}.`}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#e8ecf1] bg-[#fbfcfe] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <label
                  title={vwPhoto ? 'Klik untuk ganti gambar' : 'Klik untuk unggah gambar'}
                  className="group/preview relative flex h-14 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[#dfe4e8] bg-white transition-colors hover:border-[#1b4f9c]"
                >
                  {vwPhoto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={vwPhoto} alt="" className="h-full w-full object-cover transition-opacity group-hover/preview:opacity-50" />
                  ) : (
                    <ImageUp size={20} className="text-[#c3cad2]" />
                  )}
                  <span className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover/preview:flex">
                    <ImageUp size={16} />
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={photoSaving}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadVwPhoto(file)
                      e.target.value = ''
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#657080]">Gambar Denah Mobil</p>
                  <p className="mt-0.5 text-[11px] text-[#9aa3af]">
                    {photoFailed ? 'Gagal memproses gambar. Coba lagi.' : 'Klik gambar atau tombol di samping untuk mengganti. JPG, PNG, atau WebP maks 5 MB.'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb]">
                    {photoSaving && <Loader2 size={11} className="animate-spin" />}
                    {photoSaving ? 'Memproses…' : vwPhoto ? 'Ganti Gambar' : 'Unggah Gambar'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={photoSaving}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadVwPhoto(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {vwPhoto && !photoSaving && (
                    <button
                      type="button"
                      onClick={removeVwPhoto}
                      className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={11} /> Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
            <Loader2 size={15} className="animate-spin" /> Memuat pengelompokan…
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
            <SearchX size={22} className="text-[#c3cad2]" />
            <p className="text-xs font-bold text-[#657080]">
              {q
                ? 'Tidak ada grup yang cocok dengan pencarian.'
                : mode === 'room'
                  ? 'Belum ada data kamar.'
                  : 'Belum ada data mobil.'}
            </p>
          </div>
        ) : (
          <>
            {swapSource && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1b4f9c]/30 bg-[#eef4fb] px-3 py-2 text-[11px] font-semibold text-[#1b4f9c]">
                <span className="flex items-center gap-1.5">
                  {swapping ? <Loader2 size={13} className="animate-spin" /> : <ArrowLeftRight size={13} />}
                  Menukar {mode === 'room' ? 'kamar' : 'mobil'} <b>{swapSource.name}</b> (No{' '}
                  {(mode === 'room' ? swapSource.room : swapSource.vw) || '—'}). Klik peserta tujuan untuk menukar.
                </span>
                <button
                  type="button"
                  onClick={() => setSwapSource(null)}
                  disabled={swapping}
                  className="inline-flex items-center gap-1 rounded-full border border-[#cdd8e2] bg-white px-2.5 py-1 text-[10px] font-bold text-[#657080] transition-colors hover:bg-[#f1f3f5] disabled:opacity-50"
                >
                  <X size={11} /> Batal
                </button>
              </div>
            )}
            {swapFailed && (
              <p className="mb-3 text-[11px] font-semibold text-red-600">Gagal menukar. Coba lagi.</p>
            )}
            <div className="overflow-x-auto rounded-xl border border-[#b9c6d2]">
              <table className="w-full table-fixed border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#00A3E0] text-[10px] font-bold uppercase tracking-wide text-white">
                    <th className="w-10 border border-[#7fc7e8] px-2 py-2">No</th>
                    <th className="border border-[#7fc7e8] px-3 py-2 text-center">Nama</th>
                    <th className="w-20 border border-[#7fc7e8] px-2 py-2">Bus</th>
                    {mode === 'room' ? (
                      <>
                        <th className="w-32 border border-[#7fc7e8] px-2 py-2">No Kamar</th>
                        <th className="w-36 border border-[#7fc7e8] px-2 py-2">Tipe Kamar</th>
                        <th className="w-14 border border-[#7fc7e8] px-1 py-2">Tukar</th>
                      </>
                    ) : (
                      <>
                        <th className="w-32 border border-[#7fc7e8] px-2 py-2">No Mobil</th>
                        <th className="w-14 border border-[#7fc7e8] px-1 py-2">Tukar</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageGroups.map((group, i) => {
                    const groupNo = start + i + 1
                    const base = i % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
                    return (
                      <Fragment key={group.key}>
                        {group.members.map((member, j) => {
                          const top = j === 0 ? ' border-t-2 border-t-[#8a99a8]' : ''
                          return (
                            <tr key={`${group.key}-${member.id}`} className={base}>
                              {j === 0 && (
                                <td rowSpan={group.members.length} className={`${groupHeadClass} tabular-nums`}>
                                  {groupNo}
                                </td>
                              )}
                              <td
                                className={`border border-[#cdd8e2] px-3 py-1.5 text-left align-middle font-normal text-[#1b3555]${top}`}
                              >
                                {member.name}
                              </td>
                              <td
                                className={`border border-[#cdd8e2] px-2 py-1.5 text-center align-middle text-[11px] font-bold text-[#1b3555]${top}`}
                              >
                                {member.busName}
                              </td>
                              {mode === 'room' ? (
                                <>
                                  <td className={`border border-[#cdd8e2] px-1.5 py-1 text-center align-middle${top}`}>
                                    <InlineEdit
                                      eventId={eventId}
                                      participantId={member.id}
                                      field="room"
                                      value={member.room}
                                      placeholder="Tanpa kamar"
                                      center
                                    />
                                  </td>
                                  {j === 0 && (
                                    <td
                                      rowSpan={group.members.length}
                                      className={`border border-[#cdd8e2] px-1.5 py-1 text-center align-middle${top}`}
                                    >
                                      {group.key === UNASSIGNED_ROOM ? (
                                        <span className="text-[11px] font-semibold text-[#b6bec8]">—</span>
                                      ) : (
                                        <GroupRoomTypeEdit eventId={eventId} room={group.label} roomType={group.roomType} options={roomTypes} />
                                      )}
                                    </td>
                                  )}
                                  {swapCell(member, top)}
                                </>
                              ) : (
                                <>
                                  <td className={`border border-[#cdd8e2] px-1.5 py-1 text-center align-middle${top}`}>
                                    <InlineEdit
                                      eventId={eventId}
                                      participantId={member.id}
                                      field="vw"
                                      value={member.vw}
                                      placeholder="Tanpa Mobil"
                                      center
                                    />
                                  </td>
                                  {swapCell(member, top)}
                                </>
                              )}
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  aria-label="Halaman sebelumnya"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] bg-white p-0 text-[#1b4f9c] transition-colors duration-150 hover:bg-[#eef4fb] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="min-w-0 text-center text-xs font-bold text-[#1b3555]">
                  Halaman {safePage + 1} / {pageCount}
                </p>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  aria-label="Halaman berikutnya"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] bg-white p-0 text-[#1b4f9c] transition-colors duration-150 hover:bg-[#eef4fb] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            <p className="mt-3 text-[11px] font-semibold text-[#9aa3af]">
              {filteredGroups.length.toLocaleString('id-ID')} grup
              {q && groupsSafe.length !== filteredGroups.length ? ` dari ${groupsSafe.length.toLocaleString('id-ID')}` : ''} ·
              klik nilai lalu tekan Enter / klik di luar untuk menyimpan.
            </p>
          </>
        )}
      </div>
    </div>
  )
}