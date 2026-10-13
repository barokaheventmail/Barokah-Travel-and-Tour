'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { BedDouble, Car, ChevronLeft, ChevronRight, Loader2, SearchX } from 'lucide-react'
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
  const [autoTitle, setAutoTitle] = useState('')
  const [vwTitle, setVwTitle] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)
  const [titleFailed, setTitleFailed] = useState(false)
  const [vwDesc, setVwDesc] = useState<string | null>(null)
  const [descDraft, setDescDraft] = useState('')
  const [descSaving, setDescSaving] = useState(false)
  const [descFailed, setDescFailed] = useState(false)

  const endpoint = mode === 'room' ? 'rooms' : 'vw'

  useEffect(() => {
    setPage(0)
  }, [eventId, mode])

  useEffect(() => {
    setTitleDraft(vwTitle ?? autoTitle)
  }, [vwTitle, autoTitle])

  useEffect(() => {
    setDescDraft(vwDesc ?? autoTitle)
  }, [vwDesc, autoTitle])

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
    const baseline = (vwTitle ?? autoTitle).trim()
    if (next === baseline) {
      setTitleDraft(vwTitle ?? autoTitle)
      return
    }
    setTitleSaving(true)
    setTitleFailed(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vwTitle: next }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan.')
      setVwTitle(next || null)
      notifyParticipantsChanged()
    } catch {
      setTitleFailed(true)
      setTitleDraft(vwTitle ?? autoTitle)
    } finally {
      setTitleSaving(false)
    }
  }

  async function commitDesc(value?: string) {
    if (mode !== 'vw' || descSaving) return
    const next = (value ?? descDraft).trim()
    const baseline = (vwDesc ?? autoTitle).trim()
    if (next === baseline) {
      setDescDraft(vwDesc ?? autoTitle)
      return
    }
    setDescSaving(true)
    setDescFailed(false)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denahVwCrewName: next && next !== autoTitle ? next : null }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan.')
      setVwDesc(next && next !== autoTitle ? next : null)
      notifyParticipantsChanged()
    } catch {
      setDescFailed(true)
      setDescDraft(vwDesc ?? autoTitle)
    } finally {
      setDescSaving(false)
    }
  }

  const groupsSafe = groups ?? []
  const pageCount = Math.max(1, Math.ceil(groupsSafe.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const pageGroups = groupsSafe.slice(start, start + PAGE_SIZE)

  const groupHeadClass =
    'border border-[#cdd8e2] border-t-2 border-t-[#8a99a8] bg-[#f4f7fb] px-2 py-1.5 text-center align-middle text-[11px] font-black text-[#1b4f9c]'

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white shadow-sm">
      <div className="border-b border-[#dfe4e8] px-5 py-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#1b3555]">
          {mode === 'room' ? (
            <BedDouble size={15} className="text-[#00A3E0]" />
          ) : (
            <Car size={15} className="text-[#00A3E0]" />
          )}
          {mode === 'room' ? 'Pengelompokan Per Kamar' : 'Pengelompokan Per VW'}
        </h2>
        <p className="mt-0.5 text-xs text-[#657080]">
          {mode === 'room'
            ? 'Kelompok peserta berdasarkan No Kamar. No Kamar diubah per peserta; Tipe Kamar cukup dipilih sekali dan berlaku untuk seluruh kamar.'
            : 'Kelompok peserta berdasarkan No VW. Klik No VW lalu Enter untuk mengubah.'}{' '}
          Peserta otomatis pindah grup ketika nilainya diubah.
        </p>

        {mode === 'room' && <RoomTypeOptions eventId={eventId} roomTypes={roomTypes} />}

        {mode === 'vw' && (
          <div className="mt-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#657080]">Judul Denah VW</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => commitTitle()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  } else if (e.key === 'Escape') {
                    setTitleDraft(vwTitle ?? autoTitle)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                placeholder={autoTitle || 'Denah VW'}
                disabled={titleSaving}
                title={titleFailed ? 'Gagal menyimpan, coba lagi' : undefined}
                className={`w-full max-w-md rounded-xl border px-3 py-2 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:ring-2 focus:ring-[#1b4f9c]/15 disabled:opacity-60 ${
                  titleFailed ? 'border-red-300 bg-red-50' : 'border-[#dfe4e8] bg-[#f8fafc] focus:border-[#1b4f9c] focus:bg-white'
                }`}
              />
              {titleSaving && <Loader2 size={14} className="animate-spin text-[#1b4f9c]" />}
              {vwTitle && !titleSaving && (
                <button
                  type="button"
                  onClick={() => commitTitle('')}
                  className="rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb]"
                >
                  Otomatis
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[#9aa3af]">
              {vwTitle ? `Ditimpa manual. Klik "Otomatis" untuk memakai judul otomatis (${autoTitle}).` : `Otomatis mengikuti kendaraan: ${autoTitle}.`}
            </p>

            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-[#657080]">Deskripsi Denah VW</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={() => commitDesc()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  } else if (e.key === 'Escape') {
                    setDescDraft(vwDesc ?? autoTitle)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                placeholder={autoTitle || 'Ketik deskripsi'}
                disabled={descSaving}
                title={descFailed ? 'Gagal menyimpan, coba lagi' : undefined}
                className={`w-full max-w-md rounded-xl border px-3 py-2 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:font-normal placeholder:text-[#9aa3af] focus:ring-2 focus:ring-[#1b4f9c]/15 disabled:opacity-60 ${
                  descFailed ? 'border-red-300 bg-red-50' : 'border-[#dfe4e8] bg-[#f8fafc] focus:border-[#1b4f9c] focus:bg-white'
                }`}
              />
              {descSaving && <Loader2 size={14} className="animate-spin text-[#1b4f9c]" />}
              {vwDesc && !descSaving && (
                <button
                  type="button"
                  onClick={() => commitDesc('')}
                  className="rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb]"
                >
                  Otomatis
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[#9aa3af]">
              {vwDesc ? `Ditimpa manual. Klik "Otomatis" untuk memakai ${autoTitle}.` : `Otomatis mengikuti kendaraan: ${autoTitle}.`}
            </p>
          </div>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] py-8 text-xs font-semibold text-[#657080]">
            <Loader2 size={15} className="animate-spin" /> Memuat pengelompokan…
          </div>
        ) : groupsSafe.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#dfe4e8] px-4 py-8 text-center">
            <SearchX size={22} className="text-[#c3cad2]" />
            <p className="text-xs font-bold text-[#657080]">
              {mode === 'room' ? 'Belum ada data kamar.' : 'Belum ada data VW.'}
            </p>
          </div>
        ) : (
          <>
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
                      </>
                    ) : (
                      <th className="w-32 border border-[#7fc7e8] px-2 py-2">No VW</th>
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
                                </>
                              ) : (
                                <td className={`border border-[#cdd8e2] px-1.5 py-1 text-center align-middle${top}`}>
                                  <InlineEdit
                                    eventId={eventId}
                                    participantId={member.id}
                                    field="vw"
                                    value={member.vw}
                                    placeholder="Tanpa VW"
                                    center
                                  />
                                </td>
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
              {groupsSafe.length.toLocaleString('id-ID')} grup · klik nilai lalu tekan Enter / klik di luar untuk menyimpan.
            </p>
          </>
        )}
      </div>
    </div>
  )
}