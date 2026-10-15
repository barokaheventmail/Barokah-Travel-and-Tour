'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type TargetMode = 'one' | 'some' | 'all'

const BTN_GHOST =
  'inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-3 py-2 text-[11px] font-bold text-[#657080] transition-colors hover:bg-[#eef4fb] active:scale-95 disabled:opacity-50'

const BTN_ACTIVE =
  'inline-flex items-center gap-1.5 rounded-full border border-[#1b4f9c] bg-[#eef4fb] px-3 py-2 text-[11px] font-bold text-[#1b4f9c] transition-colors active:scale-95 disabled:opacity-50'

export function UnitTargetPicker({
  buses,
  currentId,
  mode,
  targets,
  onChange,
  label = 'Simpan ke',
  disabled = false,
}: {
  buses: { id: string; name: string }[]
  currentId: string
  mode: TargetMode
  targets: string[]
  onChange: (ids: string[], mode: TargetMode) => void
  label?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const allIds = buses.map((b) => b.id)
  const count = mode === 'all' ? buses.length : targets.length

  function toggle(id: string) {
    const next = targets.includes(id) ? targets.filter((x) => x !== id) : [...targets, id]
    onChange(next, 'some')
  }

  return (
    <div className="rounded-xl border border-[#e8ecf1] bg-[#fbfcfe] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">{label}</span>
        <button
          type="button"
          onClick={() => onChange([currentId], 'one')}
          disabled={disabled}
          className={mode === 'one' ? BTN_ACTIVE : BTN_GHOST}
        >
          Unit Ini
        </button>
        <button
          type="button"
          onClick={() => onChange(allIds, 'all')}
          disabled={disabled}
          className={mode === 'all' ? BTN_ACTIVE : BTN_GHOST}
        >
          Semua Unit
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            disabled={disabled}
            className={
              mode === 'some'
                ? 'inline-flex items-center gap-1.5 rounded-full border border-[#1b4f9c] bg-[#eef4fb] px-3 py-2 text-[11px] font-bold text-[#1b4f9c] transition-colors disabled:opacity-50'
                : 'inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-2 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4fb] disabled:opacity-50'
            }
          >
            Pilih unit… ({count})
            <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {open && (
            <div className="absolute left-0 z-20 mt-1 max-h-64 w-64 overflow-y-auto rounded-xl border border-[#dfe4e8] bg-white p-2 shadow-lg">
              <div className="mb-1 flex items-center justify-between gap-2 px-1">
                <button type="button" onClick={() => onChange(allIds, 'all')} className="text-[11px] font-bold text-[#1b4f9c]">
                  Pilih semua
                </button>
                <button type="button" onClick={() => onChange([], 'some')} className="text-[11px] font-bold text-[#657080]">
                  Kosongkan
                </button>
              </div>
              {buses.map((b) => (
                <label
                  key={b.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#1b3555] hover:bg-[#f1f5f9]"
                >
                  <input
                    type="checkbox"
                    checked={targets.includes(b.id)}
                    onChange={() => toggle(b.id)}
                    className="h-3.5 w-3.5 accent-[#1b4f9c]"
                  />
                  <span className="min-w-0 truncate">{b.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#9aa3af]">
        {mode === 'some' && targets.length === 0
          ? 'Belum ada unit tujuan dipilih.'
          : mode === 'all'
            ? `Akan disimpan ke semua unit (${buses.length}).`
            : `Akan disimpan ke ${targets.length} unit terpilih.`}
      </p>
    </div>
  )
}
