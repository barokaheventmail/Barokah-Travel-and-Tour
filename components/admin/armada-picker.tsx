'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Bus, Check, ChevronDown, Search } from 'lucide-react'

export type ArmadaOption = {
  id: string
  name: string
  count: number
  rows: number
  cols: number
  activeSeats: number
}

const optionId = (id: string) => `armada-option-${id}`

/**
 * Single-select unit untuk editor layout kursi. Popup-nya adalah elemen kita,
 * bukan `<option>` native, jadi bentuk, radius, shadow, dan animasinya bisa
 * dibuat lembut — popup `<option>` digambar OS dan selalu datang mendadak.
 *
 * Popup sengaja tidak di-unmount saat menutup, hanya disembunyikan: transisi
 * keluar sempat tampil, dan DOM-nya tetap utuh. Handle keyboard:
 * panah/Home/End untuk geser kursor opsi, Enter untuk pilih, Escape menutup,
 * ketik huruf langsung mencari.
 */
export function ArmadaPicker({
  options,
  value,
  onChange,
  label,
}: {
  options: ArmadaOption[]
  value: string | null
  onChange: (id: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(-1)
  const [everOpened, setEverOpened] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.id === value) ?? null

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus({ preventScroll: true })
      return
    }
    setQ('')
    // Fokus search disembunyikan bareng panelnya; balikkan ke trigger supaya
    // Tab berikutnya keluar dari picker, bukan nyangkut di elemen tak terlihat.
    if (wrapRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true })
  }, [open])

  const needle = q.trim().toLowerCase()
  const filtered = useMemo(
    () => (needle ? options.filter((o) => o.name.toLowerCase().includes(needle)) : options),
    [options, needle],
  )

  // Kursor awal: opsi terpilih kalau masih kelihatan, else baris pertama.
  useEffect(() => {
    if (!open) return
    setEverOpened(true)
    if (filtered.length === 0) {
      setCursor(-1)
      return
    }
    const at = filtered.findIndex((o) => o.id === value)
    setCursor(at >= 0 ? at : 0)
  }, [open, filtered, value])

  // Geser kursor ke area pandang. Scroll ditulis manual (bukan
  // `scrollIntoView`) supaya tidak ikut dianimasikan oleh
  // `html { scroll-behavior: smooth }` — halaman ikut bergeser pelan saat
  // dropdown dibuka terasa lambat, bukan halus.
  useEffect(() => {
    if (!open || cursor < 0) return
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>(`[data-cursor="${cursor}"]`)
    if (!list || !item) return
    const top = item.offsetTop
    const bottom = top + item.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top - 6
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6
  }, [open, cursor])

  const summary = selected
    ? selected.activeSeats > 0
      ? `${selected.count} peserta · ${selected.activeSeats} kursi aktif`
      : `${selected.count} peserta · belum ada layout`
    : `${options.length} unit tersedia`

  function choose(o: ArmadaOption) {
    onChange(o.id)
    setOpen(false)
  }

  function step(from: number, delta: number) {
    if (filtered.length === 0) return -1
    if (from < 0) return delta > 0 ? 0 : filtered.length - 1
    return (from + delta + filtered.length) % filtered.length
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setCursor((c) => step(c, e.key === 'ArrowDown' ? 1 : -1))
      return
    }
    if (!open) {
      // Ketik huruf saat tertutup = buka lalu pakai sebagai kata kunci.
      if (e.key.length === 1 && e.key !== ' ') {
        setOpen(true)
        setQ(e.key)
      }
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      setCursor(filtered.length ? 0 : -1)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCursor(filtered.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[cursor]
      if (target) choose(target)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full sm:w-auto sm:min-w-[17rem]">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label ?? 'Pilih unit'}
        className={`flex w-full items-center gap-2.5 rounded-full border py-2 pl-2 pr-2.5 text-left transition-[background-color,border-color,box-shadow] duration-200 ease-out ${
          open
            ? 'border-[#1b4f9c]/45 bg-white shadow-[0_10px_24px_-16px_rgba(9,32,74,0.6)]'
            : 'border-[#dfe4e8] bg-[#f8fafc] hover:border-[#cdd7e4] hover:bg-white hover:shadow-[0_8px_20px_-16px_rgba(9,32,74,0.5)]'
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b4f9c]/25`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] transition-colors duration-200">
          <Bus size={14} className="text-[#1b4f9c]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-[#1b3555]">
            {selected ? selected.name : 'Pilih Unit'}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#9aa3af]">{summary}</span>
        </span>
        <span
          aria-hidden
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 ease-out ${
            open ? 'rotate-180 bg-[#1b4f9c] text-white' : 'bg-[#eef3fb] text-[#1b4f9c]'
          }`}
        >
          <ChevronDown size={13} />
        </span>
      </button>

      {/* Tanpa `transform`/`filter` pada pembungkus trigger supaya tetap bukan
          blok penampung posisi untuk elemen `fixed` di dalam panel. Panel
          memakai `invisible` (bukan `aria-hidden`) supaya tidak pernah
          membungkus elemen yang sedang fokus, tapi tetap hilang dari tab
          order dan accessibility tree saat tertutup. */}
      <div
        className={`absolute left-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2.5rem))] origin-top rounded-2xl border border-[#ece3cd] bg-white p-2 transition-[opacity,visibility,box-shadow] duration-200 ease-out ${
          open
            ? 'visible opacity-100 shadow-[0_28px_70px_-22px_rgba(9,32,74,0.6)] animate-overlay-in'
            : `pointer-events-none invisible opacity-0 shadow-[0_12px_28px_-20px_rgba(9,32,74,0.35)] ${
                everOpened ? 'animate-overlay-out' : ''
              }`
        }`}
      >
        <div className="mb-1.5 h-px bg-gradient-to-r from-transparent via-[#e8d9ab] to-transparent" />

        <div className="relative mb-2">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]"
          />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => inputRef.current?.select()}
            placeholder="Cari bus…"
            aria-label="Cari unit"
            className="w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] py-2 pl-8 pr-3 text-xs font-semibold text-[#1b3555] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
          />
        </div>

        <div
          ref={listRef}
          role="listbox"
          aria-label={label ?? 'Daftar unit'}
          aria-activedescendant={cursor >= 0 && filtered[cursor] ? optionId(filtered[cursor].id) : undefined}
          className="relative max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain"
        >
          {filtered.map((o, i) => {
            const on = o.id === value
            const onCursor = i === cursor
            return (
              <button
                key={o.id}
                type="button"
                id={optionId(o.id)}
                role="option"
                aria-selected={on}
                data-cursor={onCursor ? 'true' : undefined}
                onMouseMove={() => setCursor(i)}
                onClick={() => choose(o)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors duration-150 active:scale-[.99] ${
                  on ? 'bg-[#eef3fb]' : onCursor ? 'bg-[#f5f7fa]' : 'bg-transparent'
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
                    on ? 'border-[#1b4f9c] bg-[#1b4f9c] text-white' : 'border-[#cbd3dc] bg-white'
                  }`}
                >
                  {on && <Check size={10} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#1b3555]">{o.name}</span>
                <span className="shrink-0 text-[10px] font-bold tabular-nums text-[#657080]">
                  {o.count} peserta
                </span>
                <span className="shrink-0">
                  {o.activeSeats > 0 ? (
                    <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#1b4f9c]">
                      {o.rows}×{o.cols}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#b0b8c2]">belum ada layout</span>
                  )}
                </span>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs font-semibold text-[#9aa3af]">
              {options.length === 0 ? 'Belum ada unit.' : 'Tidak ada bus yang cocok.'}
            </p>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="mt-1 border-t border-[#f1f3f5] px-2.5 pt-1.5 text-[10px] font-semibold tabular-nums text-[#b0b8c2]">
            {filtered.length} dari {options.length} unit · ↑↓ geser, Enter pilih
          </p>
        )}
      </div>
    </div>
  )
}
