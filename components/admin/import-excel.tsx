'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Table2,
  UploadCloud,
} from 'lucide-react'
import { notifyParticipantsChanged } from '@/lib/events'
import type { ColumnMapping, ImportPreview, MatchKind, ParseDiagnostics } from '@/lib/excel'

type Result = {
  created: number
  updated: number
  skipped: number
  buses: { name: string; created: number; updated: number; skipped: number }[]
  warnings?: string[]
}

const ACCEPT = '.xlsx,.xlsm,.xls,.csv,.ods'

const KIND_LABEL: Record<MatchKind, string> = {
  exact: 'cocok persis',
  alias: 'cocok alias',
  contains: 'mengandung kata',
  regex: 'pola teks',
  fuzzy: 'mirip (typo dicek)',
  inferred: 'ditebak dari isi kolom',
  positional: 'urutan template',
}

const KIND_STYLE: Record<MatchKind, string> = {
  exact: 'bg-[#e6f4ea] text-[#2ca84a]',
  alias: 'bg-[#e6f4ea] text-[#2ca84a]',
  contains: 'bg-[#eef3fb] text-[#1b4f9c]',
  regex: 'bg-[#eef3fb] text-[#1b4f9c]',
  fuzzy: 'bg-[#fff7e0] text-[#8a6d1d]',
  inferred: 'bg-[#fff7e0] text-[#8a6d1d]',
  positional: 'bg-[#fff7e0] text-[#8a6d1d]',
}

const FIELD_LABEL: Record<string, string> = {
  order: 'No',
  name: 'Nama',
  birthPlace: 'Tempat Lahir',
  birthDate: 'Tanggal Lahir',
  phone: 'No Telp/Hp',
  seat: 'No Kursi',
  room: 'No Kamar',
  vw: 'No VW',
  bus: 'Unit',
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const body = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function MappingTable({ mappings }: { mappings: ColumnMapping[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#eef0f3]">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-[#f8fafc] text-[#9aa3af]">
          <tr>
            <th className="px-2 py-1.5 font-bold">Kolom</th>
            <th className="px-2 py-1.5 font-bold">Header di file</th>
            <th className="px-2 py-1.5 font-bold">Dibaca sebagai</th>
            <th className="px-2 py-1.5 font-bold">Cara baca</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef0f3]">
          {mappings.map((m, i) => (
            <tr key={`${m.field}-${m.column}-${i}`}>
              <td className="px-2 py-1.5 font-mono text-[#9aa3af]">{m.column + 1}</td>
              <td className="px-2 py-1.5 text-[#1b3555]">
                {m.header || <span className="text-[#9aa3af]">(kosong)</span>}
              </td>
              <td className="px-2 py-1.5 font-bold text-[#1b4f9c]">{FIELD_LABEL[m.field] ?? m.field}</td>
              <td className="px-2 py-1.5">
                <span className={`rounded-full px-2 py-0.5 font-bold ${KIND_STYLE[m.kind]}`}>{KIND_LABEL[m.kind]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SheetBlock({ sheet }: { sheet: ParseDiagnostics['sheets'][number] }) {
  const [open, setOpen] = useState(false)
  const statusLabel =
    sheet.status === 'ok'
      ? `${sheet.participants} peserta`
      : sheet.status === 'empty'
        ? 'tidak berisi peserta'
        : 'tidak terbaca'
  const statusStyle =
    sheet.status === 'ok' ? 'text-[#2ca84a]' : sheet.status === 'empty' ? 'text-[#8a6d1d]' : 'text-red-500'

  return (
    <div className="rounded-xl border border-[#eef0f3] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? (
          <ChevronUp size={13} className="shrink-0 text-[#9aa3af]" />
        ) : (
          <ChevronDown size={13} className="shrink-0 text-[#9aa3af]" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#1b3555]">{sheet.name}</span>
        <span className={`shrink-0 text-[11px] font-bold ${statusStyle}`}>{statusLabel}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-[#f4f6f8] px-3 py-2.5">
          {sheet.headerRow ? (
            <p className="text-[11px] text-[#657080]">Header terdeteksi di baris {sheet.headerRow}.</p>
          ) : (
            <p className="text-[11px] text-[#657080]">Sheet tanpa baris header.</p>
          )}
          {sheet.mappings.length > 0 && <MappingTable mappings={sheet.mappings} />}
          {sheet.notes.length > 0 && (
            <ul className="space-y-0.5">
              {sheet.notes.map((n, i) => (
                <li key={i} className="text-[11px] text-[#8a6d1d]">
                  • {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function PreviewPanel({
  preview,
  fileName,
  overwrite,
  onOverwriteChange,
  onSave,
  onReset,
  saving,
}: {
  preview: ImportPreview
  fileName: string
  overwrite: boolean
  onOverwriteChange: (v: boolean) => void
  onSave: () => void
  onReset: () => void
  saving: boolean
}) {
  const [showDetail, setShowDetail] = useState(false)
  const [showSamples, setShowSamples] = useState(false)
  const [showSheets, setShowSheets] = useState(false)
  const [showSkipped, setShowSkipped] = useState(false)
  const { diagnostics, buses, total, skipped } = preview
  const ignored = diagnostics.sheets.filter((s) => s.status === 'ignored')
  const empty = diagnostics.sheets.filter((s) => s.status === 'empty')
  const okSheets = diagnostics.sheets.filter((s) => s.status === 'ok')

  return (
    <div className="mt-3 space-y-3">
      <div className="animate-fade-up rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-[#1b4f9c]">
          <Table2 size={16} /> Hasil baca file: {fileName}
        </div>
        {/* Ringkasan satu baris supaya tidak kepanjangan. */}
        <p className="mt-1 text-xs font-semibold text-[#657080]">
          {total} peserta · {buses.length} unit
          {skipped > 0 ? ` · ${skipped} baris dilewati` : ''}
          {ignored.length > 0 ? ` · ${ignored.length} sheet tidak terbaca` : ''}
          {empty.length > 0 ? ` · ${empty.length} sheet kosong` : ''}
        </p>

        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[#f8fafc] p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-start gap-2 text-[11px] font-semibold text-[#657080]">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => onOverwriteChange(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Sel kosong menimpa data lama.
              <br />
              <span className="font-normal text-[#9aa3af]">
                Default: tidak. Import file yang lebih sepi tidak menghapus nomor HP/kursi/kamar yang sudah ada.
              </span>
            </span>
          </label>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={saving}
              className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5] disabled:opacity-50"
            >
              Ganti File
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2 text-xs font-bold text-white hover:bg-[#143d79] active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Menyimpan…' : `Simpan ${preview.total} Peserta`}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="mt-3 flex w-full items-center gap-1.5 text-[11px] font-bold text-[#1b4f9c]"
        >
          {showDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showDetail ? 'Sembunyikan detail' : 'Lihat detail baca file'}
          {!showDetail && (
            <span className="font-semibold text-[#9aa3af]">
              ({diagnostics.sheets.length} sheet · {okSheets.length} terbaca)
            </span>
          )}
        </button>
      </div>

      {showDetail && (
        <div className="max-h-[70vh] space-y-3 overflow-y-auto">
          {diagnostics.warnings.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <ul className="space-y-1 rounded-lg bg-[#fff7e0] p-2.5">
                {diagnostics.warnings.map((w, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] font-semibold text-[#8a6d1d]">
                    <AlertTriangle size={12} className="mt-px shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setShowSheets((v) => !v)}
              className="flex w-full items-center gap-1.5 text-xs font-bold text-[#1b3555]"
            >
              {showSheets ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Cara setiap sheet dibaca (
              {diagnostics.sheets.length})
            </button>
            {showSheets && (
              <div className="mt-2 space-y-1.5">
                {diagnostics.sheets.map((s) => (
                  <SheetBlock key={s.name} sheet={s} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setShowSamples((v) => !v)}
              className="flex w-full items-center gap-1.5 text-xs font-bold text-[#1b3555]"
            >
              {showSamples ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Contoh data per unit ({buses.length}
              )<span className="font-semibold text-[#9aa3af]">(20 baris pertama)</span>
            </button>
            {showSamples && (
              <div className="mt-2 space-y-3">
                {buses.map((b) => (
                  <div key={b.name}>
                    <p className="text-[11px] font-bold text-[#1b4f9c]">
                      {b.name} <span className="font-semibold text-[#9aa3af]">({b.count} peserta)</span>
                    </p>
                    <div className="mt-1 overflow-x-auto rounded-lg border border-[#eef0f3]">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#f8fafc] text-[#9aa3af]">
                          <tr>
                            <th className="px-2 py-1.5">No</th>
                            <th className="px-2 py-1.5">Nama</th>
                            <th className="px-2 py-1.5">Asal</th>
                            <th className="px-2 py-1.5">Tgl Lahir</th>
                            <th className="px-2 py-1.5">HP</th>
                            <th className="px-2 py-1.5">Kursi</th>
                            <th className="px-2 py-1.5">Kamar</th>
                            <th className="px-2 py-1.5">VW</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef0f3]">
                          {b.sample.map((p, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1 text-[#9aa3af]">{p.order}</td>
                              <td className="px-2 py-1 font-semibold text-[#1b3555]">{p.name}</td>
                              <td className="px-2 py-1 text-[#657080]">{p.birthPlace ?? '-'}</td>
                              <td className="px-2 py-1 text-[#657080]">{p.birthDate ?? '-'}</td>
                              <td className="px-2 py-1 text-[#657080]">{p.phone ?? '-'}</td>
                              <td className="px-2 py-1 text-[#657080]">{p.seat ?? '-'}</td>
                              <td className="px-2 py-1 text-[#657080]">{p.room ?? '-'}</td>
                              <td className="px-2 py-1 text-[#657080]">{p.vw ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {b.count > b.sample.length && (
                      <p className="mt-1 text-[10px] text-[#9aa3af]">
                        …dan {b.count - b.sample.length} peserta lainnya.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {diagnostics.skippedRows.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowSkipped((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#1b3555]"
                >
                  {showSkipped ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Baris yang dilewati (
                  {diagnostics.skippedTotal})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv('baris-dilewati.csv', [
                      ['Sheet', 'Baris', 'Alasan', 'Isi kolom nama'],
                      ...diagnostics.skippedRows.map((r) => [r.sheet, r.row, r.reason, r.name ?? '']),
                    ])
                  }
                  className="flex shrink-0 items-center gap-1 rounded-full border border-[#dfe4e8] px-3 py-1.5 text-[11px] font-bold text-[#1b4f9c] hover:bg-[#eef3fb]"
                >
                  <Download size={12} /> Unduh daftar
                </button>
              </div>
              {showSkipped && (
                <>
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[#eef0f3]">
                    <table className="w-full text-left text-[11px]">
                      <thead className="sticky top-0 bg-[#f8fafc] text-[#9aa3af]">
                        <tr>
                          <th className="px-2 py-1.5">Sheet</th>
                          <th className="px-2 py-1.5">Baris</th>
                          <th className="px-2 py-1.5">Alasan</th>
                          <th className="px-2 py-1.5">Nama</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef0f3]">
                        {diagnostics.skippedRows.map((r, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1 text-[#657080]">{r.sheet}</td>
                            <td className="px-2 py-1 font-mono text-[#9aa3af]">{r.row}</td>
                            <td className="px-2 py-1 text-[#8a6d1d]">{r.reason}</td>
                            <td className="px-2 py-1 text-[#1b3555]">{r.name ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {diagnostics.skippedTotal > diagnostics.skippedRows.length && (
                    <p className="mt-1 text-[10px] text-[#9aa3af]">
                      Menampilkan {diagnostics.skippedRows.length} dari {diagnostics.skippedTotal} baris. Unduh daftar
                      untuk semuanya.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultPanel({ result, onReset }: { result: Result; onReset: () => void }) {
  const [showDetail, setShowDetail] = useState(false)
  return (
    <div className="animate-fade-up mt-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-[#2ca84a]">
        <CheckCircle2 size={16} /> Import berhasil — {result.created + result.updated} peserta di {result.buses.length}{' '}
        unit
        <span className="text-xs font-semibold text-[#657080]">
          ({result.created} baru · {result.updated} diperbarui
          {result.skipped > 0 ? ` · ${result.skipped} dilewati` : ''})
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-bold text-[#1b4f9c]"
        >
          {showDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showDetail ? 'Sembunyikan rincian' : 'Lihat rincian'}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-[#dfe4e8] px-4 py-1.5 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
        >
          Import file lain
        </button>
      </div>
      {showDetail && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-1 text-xs text-[#657080]">
            {result.buses.map((b) => (
              <li key={b.name}>
                <strong className="text-[#1b4f9c]">{b.name}</strong> — {b.created} baru · {b.updated} diperbarui
              </li>
            ))}
          </ul>
          {result.warnings && result.warnings.length > 0 && (
            <ul className="space-y-0.5 rounded-lg bg-[#fff7e0] p-2.5">
              {result.warnings.map((w, i) => (
                <li key={i} className="flex gap-1.5 text-[11px] font-semibold text-[#8a6d1d]">
                  <Info size={12} className="mt-px shrink-0" /> {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function ImportExcel({ eventId }: { eventId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [loading, setLoading] = useState<false | 'preview' | 'commit'>(false)
  const [error, setError] = useState<string | null>(null)
  const [errorNotes, setErrorNotes] = useState<string[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [overwrite, setOverwrite] = useState(false)

  function reset() {
    setFile(null)
    setPreview(null)
    setError(null)
    setErrorNotes([])
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function post(fd: FormData) {
    const res = await fetch(`/api/admin/events/${eventId}/import`, { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) {
      setErrorNotes(Array.isArray(data.notes) ? data.notes : [])
      throw new Error(data.error ?? 'Import gagal.')
    }
    return data
  }

  async function checkFile() {
    if (!file) return
    setLoading('preview')
    setError(null)
    setErrorNotes([])
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('preview', '1')
      setPreview(await post(fd))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca file.')
    } finally {
      setLoading(false)
    }
  }

  async function commit() {
    if (!file) return
    setLoading('commit')
    setError(null)
    setErrorNotes([])
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (overwrite) fd.append('overwrite', '1')
      setResult(await post(fd))
      setPreview(null)
      notifyParticipantsChanged()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan import.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-[#bfd3c4] bg-[#f4fbf6] p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-[#1b3555]">
        <FileSpreadsheet size={16} className="text-[#2ca84a]" /> Import Peserta dari Excel
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-relaxed text-[#657080]">
        <p className="min-w-0">
          Template tidak harus sama persis. Urutan kolom bebas, kolom boleh tidak lengkap, dan kolom yang tidak dikenali
          otomatis diabaikan. <strong>1 sheet = 1 unit</strong>, atau pakai kolom <strong>Bus/Unit</strong> di dalam
          sheet. Import ulang memperbarui peserta yang sama (No + unit), bukan menggandakan.
        </p>
        <a
          href="/api/admin/template"
          className="inline-flex shrink-0 items-center gap-1 font-bold text-[#1b4f9c] hover:underline"
        >
          <Download size={13} /> Unduh template Excel
        </a>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setPreview(null)
            setResult(null)
            setError(null)
            setErrorNotes([])
          }}
          className="block w-full text-xs text-[#657080] file:mr-3 file:rounded-full file:border-0 file:bg-[#e6f4ea] file:px-4 file:py-2 file:text-xs file:font-bold file:text-[#2ca84a] hover:file:bg-[#d3ebda]"
        />
        <button
          type="button"
          onClick={checkFile}
          disabled={!file || loading !== false}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#2ca84a] px-5 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#219b42] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === 'preview' ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          {loading === 'preview' ? 'Membaca…' : 'Cek File'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-red-600">{error}</p>
          {errorNotes.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {errorNotes.map((n, i) => (
                <li key={i} className="text-[11px] font-semibold text-red-500">
                  • {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {preview && file && (
        <PreviewPanel
          preview={preview}
          fileName={file.name}
          overwrite={overwrite}
          onOverwriteChange={setOverwrite}
          onSave={commit}
          onReset={reset}
          saving={loading === 'commit'}
        />
      )}

      {result && <ResultPanel result={result} onReset={reset} />}
    </div>
  )
}
