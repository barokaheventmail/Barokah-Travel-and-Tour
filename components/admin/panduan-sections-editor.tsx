'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, ListChecks, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import {
  BUILTIN_SECTION_KEYS,
  BUILTIN_SECTION_LABELS,
  MAX_CUSTOM_SECTIONS,
  MAX_SECTION_ITEMS,
  MAX_SECTION_NOTE,
  MAX_SECTION_TITLE,
  defaultPanduanSections,
  newSectionId,
  type BuiltinSectionKey,
  type PanduanSectionItem,
} from '@/lib/panduan-sections'

const addBtnCls =
  'flex items-center gap-1 rounded-full bg-[#eef4fb] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] transition-colors hover:bg-[#e2ecf8] disabled:cursor-not-allowed disabled:opacity-50'
const inputCls =
  'w-full min-w-0 rounded-lg border border-[#dfe4e8] bg-white px-3 py-2 text-xs font-medium text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15'
const iconBtnCls =
  'rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-[#eef4fb] hover:text-[#1b4f9c] disabled:opacity-30'

export function PanduanSectionsEditor({
  sections,
  onChange,
  disabled = false,
}: {
  sections: PanduanSectionItem[]
  onChange: (next: PanduanSectionItem[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const customCount = sections.filter((s) => s.type === 'custom').length
  const presentBuiltins = new Set(
    sections.filter((s): s is Extract<PanduanSectionItem, { type: 'builtin' }> => s.type === 'builtin').map((s) => s.builtin),
  )
  const hiddenBuiltins = BUILTIN_SECTION_KEYS.filter((k) => !presentBuiltins.has(k))

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function removeAt(index: number) {
    onChange(sections.filter((_, i) => i !== index))
  }

  function addCustom() {
    if (customCount >= MAX_CUSTOM_SECTIONS) return
    const id = newSectionId()
    setExpanded((prev) => ({ ...prev, [id]: true }))
    onChange([...sections, { id, type: 'custom', title: '', items: [''], note: '' }])
  }

  function addBuiltin(key: BuiltinSectionKey) {
    onChange([...sections, { id: key, type: 'builtin', builtin: key }])
  }

  function resetOrder() {
    const customs = sections.filter((s) => s.type === 'custom')
    onChange([...defaultPanduanSections(), ...customs])
  }

  function patchCustom(index: number, patch: Partial<Extract<PanduanSectionItem, { type: 'custom' }>>) {
    onChange(sections.map((s, i) => (i === index && s.type === 'custom' ? { ...s, ...patch } : s)))
  }

  function setItem(index: number, itemIndex: number, value: string) {
    const section = sections[index]
    if (section.type !== 'custom') return
    patchCustom(index, { items: section.items.map((item, i) => (i === itemIndex ? value : item)) })
  }

  function addItem(index: number) {
    const section = sections[index]
    if (section.type !== 'custom' || section.items.length >= MAX_SECTION_ITEMS) return
    patchCustom(index, { items: [...section.items, ''] })
  }

  function removeItem(index: number, itemIndex: number) {
    const section = sections[index]
    if (section.type !== 'custom') return
    patchCustom(index, { items: section.items.filter((_, i) => i !== itemIndex) })
  }

  return (
    <div className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="panduan-sections-body"
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#1b3555]">Halaman &amp; Urutan Panduan</h2>
          <p className="mt-0.5 text-xs text-[#657080]">
            Urutkan halaman bawaan dan tambah halaman/section baru dengan judul bebas. Tiap halaman jadi satu lembar A4
            saat dicetak.
          </p>
        </div>
        <span className="mt-0.5 shrink-0 rounded-lg p-1 text-[#657080]">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div id="panduan-sections-body" className="mt-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={resetOrder} disabled={disabled} className={addBtnCls}>
              <RotateCcw size={12} /> Urutan Bawaan
            </button>
            <button
              type="button"
              onClick={addCustom}
              disabled={disabled || customCount >= MAX_CUSTOM_SECTIONS}
              className={addBtnCls}
            >
              <Plus size={12} /> Tambah Halaman
            </button>
          </div>

          {sections.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-[#dfe4e8] px-4 py-3 text-xs text-[#9aa3af]">
              Belum ada halaman. Tambah halaman baru atau kembalikan urutan bawaan.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {sections.map((section, index) => {
                const isCustom = section.type === 'custom'
                const isOpen = expanded[section.id] ?? false
                return (
                  <div key={section.id} className="rounded-xl border border-[#e8ecf1] bg-[#fbfcfe] p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef4fb] text-[11px] font-bold text-[#1b4f9c]">
                        {index + 1}
                      </span>
                      {isCustom ? (
                        <ListChecks size={14} className="shrink-0 text-[#1b4f9c]" />
                      ) : (
                        <FileText size={14} className="shrink-0 text-[#657080]" />
                      )}
                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [section.id]: !isOpen }))}
                          className="min-w-0 flex-1 truncate text-left text-xs font-bold text-[#1b3555]"
                        >
                          {section.title.trim() || 'Halaman baru (belum diberi judul)'}
                          <span className="ml-1 font-normal text-[#9aa3af]">· {section.items.filter(Boolean).length} item</span>
                        </button>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#1b3555]">
                          {BUILTIN_SECTION_LABELS[section.builtin]}
                        </span>
                      )}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [section.id]: !isOpen }))}
                          aria-label={isOpen ? 'Tutup' : 'Buka'}
                          className={iconBtnCls}
                        >
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={disabled || index === 0}
                          aria-label="Naikkan halaman"
                          className={iconBtnCls}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={disabled || index === sections.length - 1}
                          aria-label="Turunkan halaman"
                          className={iconBtnCls}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAt(index)}
                          disabled={disabled}
                          aria-label={isCustom ? 'Hapus halaman' : 'Sembunyikan halaman'}
                          title={isCustom ? 'Hapus halaman' : 'Sembunyikan halaman'}
                          className="rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {isCustom && isOpen && (
                      <div className="mt-3 space-y-3 border-t border-[#eef1f4] pt-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#657080]">Judul halaman</label>
                          <input
                            value={section.title}
                            onChange={(e) => patchCustom(index, { title: e.target.value.slice(0, MAX_SECTION_TITLE) })}
                            placeholder="Contoh: Perlengkapan yang harus dibawa"
                            maxLength={MAX_SECTION_TITLE}
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">
                              Daftar item
                            </label>
                            <span className="text-[11px] text-[#9aa3af]">
                              {section.items.filter(Boolean).length}/{MAX_SECTION_ITEMS} · &gt;20 item otomatis dua kolom
                            </span>
                          </div>
                          <div className="space-y-2">
                            {section.items.map((item, j) => (
                              <div key={j} className="flex items-center gap-2">
                                <span className="w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-[#9aa3af]">
                                  {j + 1}.
                                </span>
                                <input
                                  value={item}
                                  onChange={(e) => setItem(index, j, e.target.value)}
                                  placeholder="Tulis item…"
                                  maxLength={200}
                                  className={inputCls}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeItem(index, j)}
                                  disabled={disabled}
                                  aria-label="Hapus item"
                                  className="shrink-0 rounded-lg p-1.5 text-[#657080] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => addItem(index)}
                            disabled={disabled || section.items.length >= MAX_SECTION_ITEMS}
                            className={`${addBtnCls} mt-2`}
                          >
                            <Plus size={12} /> Tambah Item
                          </button>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#657080]">
                            Keterangan di bawah daftar (opsional)
                          </label>
                          <textarea
                            value={section.note}
                            onChange={(e) => patchCustom(index, { note: e.target.value.slice(0, MAX_SECTION_NOTE) })}
                            placeholder="Contoh: Tanda (*) bersifat opsional/tidak wajib"
                            rows={2}
                            maxLength={MAX_SECTION_NOTE}
                            className={`${inputCls} resize-y`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {hiddenBuiltins.length > 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-[#dfe4e8] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Halaman bawaan disembunyikan</p>
              <p className="mt-0.5 text-[11px] text-[#9aa3af]">Klik untuk menampilkannya kembali di akhir urutan.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {hiddenBuiltins.map((key) => (
                  <button key={key} type="button" onClick={() => addBuiltin(key)} disabled={disabled} className={addBtnCls}>
                    <Plus size={12} /> {BUILTIN_SECTION_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
