'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { BusFront } from '@/components/bus-front'
import { FacilityIconBadge } from '@/components/facility-icon'
import { RenamePreset } from '@/components/admin/rename-preset'
import { DeletePreset } from '@/components/admin/delete-preset'
import { parseItineraryDoc, groupItineraryByDay } from '@/lib/itinerary'
import { seatCount, seatNumberMatrix } from '@/lib/seat'
import { parseKursiPreset, parsePanduanPreset, presetSummary, type PresetKindId } from '@/lib/preset'

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[#dfe4e8] bg-white px-3 py-4 text-center text-xs font-semibold text-[#9aa3af]">
      {children}
    </p>
  )
}

export function PresetCard({
  id,
  name,
  kind,
  data,
}: {
  id: string
  name: string
  kind: PresetKindId
  data: string
}) {
  const [open, setOpen] = useState(false)
  const summary = presetSummary(kind, data)
  const panelId = `preset-panel-${id}`

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-sm transition-all duration-200 hover:shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            size={18}
            className={`shrink-0 text-[#9aa3af] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[#1b3555]">{name}</span>
            <span className="mt-0.5 block text-xs text-[#657080]">
              <span className="font-semibold text-[#1b4f9c]">{summary.primary}</span>
              <span className="mx-1.5 text-[#c6cdd5]">•</span>
              {summary.secondary}
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-[#dfe4e8] px-2.5 py-1 text-[11px] font-bold text-[#1b4f9c] transition-colors group-hover:bg-[#eef3fb]">
            {open ? 'Tutup' : 'Lihat isi'}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <RenamePreset presetId={id} initialName={name} />
          <DeletePreset presetId={id} presetName={name} />
        </div>
      </div>

      {open && (
        <div id={panelId} className="border-t border-[#eef1f4] bg-[#fbfcfd] p-4">
          {kind === 'PANDUAN' ? <PanduanPreview data={data} /> : <KursiPreview data={data} />}
        </div>
      )}
    </div>
  )
}

function PanduanPreview({ data }: { data: string }) {
  const preset = parsePanduanPreset(data)
  if (!preset) return <Empty>Data preset tidak dapat dibaca.</Empty>

  const doc = parseItineraryDoc(preset.panduanItinerary)
  const days = groupItineraryByDay(doc.rows, doc.notes, doc.sideNotes)
  const logos: { label: string; url: string | null }[] = [
    { label: 'Logo kiri', url: preset.panduanLogoLeft },
    { label: 'Logo kanan', url: preset.panduanLogoRight },
    { label: 'Kanan atas 1', url: preset.panduanLogoTopRight },
    { label: 'Kanan atas 2', url: preset.panduanLogoTopRight2 },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Logo panduan</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {logos.map((logo) => (
            <div
              key={logo.label}
              className="flex flex-col items-center gap-1 rounded-xl border border-[#e3e8ee] bg-white p-2 text-center"
            >
              {logo.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logo.url} alt={logo.label} className="h-12 w-full object-contain" />
              ) : (
                <span className="flex h-12 w-full items-center justify-center text-[10px] font-semibold text-[#b6bdc6]">
                  Bawaan
                </span>
              )}
              <span className="text-[10px] font-bold text-[#657080]">{logo.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Itinerary</p>
        {days.length === 0 ? (
          <p className="mt-2 text-xs text-[#9aa3af]">Tanpa agenda.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {days.map((day) => (
              <div key={day.day} className="overflow-hidden rounded-xl border border-[#e3e8ee] bg-white">
                <div className="flex items-center justify-between gap-2 bg-[#eef3fb] px-3 py-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#1b4f9c]">Hari {day.day}</span>
                  {day.rows.length > 0 && (
                    <span className="text-[10px] font-semibold text-[#657080]">{day.rows.length} agenda</span>
                  )}
                </div>
                <div className="divide-y divide-[#f1f3f5]">
                  {day.rows.map((row, i) => (
                    <div key={i} className="flex gap-3 px-3 py-2">
                      <span className="w-24 shrink-0 text-[11px] font-semibold text-[#2ca84a]">{row.time}</span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-xs text-[#1b3555] ${row.bold ? 'font-bold' : ''} ${row.italic ? 'italic' : ''}`}
                        >
                          {row.agenda}
                        </span>
                        {row.keterangan && (
                          <span className="mt-0.5 block text-[11px] text-[#657080]">{row.keterangan}</span>
                        )}
                      </span>
                    </div>
                  ))}
                  {day.rows.length === 0 && (
                    <p className="px-3 py-2 text-[11px] italic text-[#9aa3af]">Hanya keterangan hari.</p>
                  )}
                </div>
                {(day.note || day.sideNote) && (
                  <div className="space-y-1 border-t border-[#f1f3f5] bg-[#fbfcfd] px-3 py-2">
                    {day.sideNote && <p className="text-[11px] italic text-[#657080]">Catatan samping: {day.sideNote}</p>}
                    {day.note && <p className="text-[11px] text-[#657080]">Catatan: {day.note}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {doc.footerNote && (
        <div className="rounded-xl bg-[#eef3fb] px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#1b4f9c]">Keterangan tambahan</p>
          <p className="mt-1 whitespace-pre-line text-xs text-[#1b3555]">{doc.footerNote}</p>
        </div>
      )}
    </div>
  )
}

function KursiPreview({ data }: { data: string }) {
  const preset = parseKursiPreset(data)
  if (!preset) return <Empty>Data preset tidak dapat dibaca.</Empty>

  const { seatRows, seatCols, seatLayout, frontLayout: front } = preset
  const cell = { w: preset.seatCellW, h: preset.seatCellH }
  const numbers = seatNumberMatrix(seatRows, seatCols, seatLayout)
  const active = seatCount(seatLayout)
  const facilities = preset.facilities.filter((f) => f.name.trim() !== '')

  const stats = [
    `${seatRows} baris × ${seatCols} kolom`,
    `${active} kursi`,
    `${facilities.length} fasilitas`,
    front.driver !== null ? 'Ada Driver' : 'Tanpa Driver',
    ...(front.crew !== null ? ['Ada Crew'] : []),
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {stats.map((stat) => (
          <span
            key={stat}
            className="rounded-full bg-[#eef3fb] px-2.5 py-1 text-[11px] font-bold text-[#1b4f9c]"
          >
            {stat}
          </span>
        ))}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Peta kursi</p>
        <div className="mx-auto mt-2 w-full max-w-md overflow-hidden border-2 border-[#0d2850] p-1.5">
          <BusFront cols={seatCols} front={front} bordered={false} />
          <div
            className="mt-1.5 grid w-full gap-[2px] sm:gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${seatCols}, minmax(0, 1fr))` }}
          >
            {numbers.map((row, r) =>
              row.map((n, c) => {
                const isActive = (seatLayout[r]?.[c] ?? 0) > 0
                return (
                  <span
                    key={`${r}-${c}`}
                    style={{ aspectRatio: `${cell.w} / ${cell.h}` }}
                    className={`flex min-w-0 items-center justify-center text-sm font-bold tabular-nums leading-none ${
                      isActive ? 'bg-[#1b4f9c] text-white' : 'bg-[#eef1f4] text-[#9aa3af]'
                    }`}
                  >
                    {n}
                  </span>
                )
              }),
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] font-semibold text-[#657080]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 bg-[#1b4f9c]" /> Kursi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 bg-[#eef1f4]" /> Kosong
          </span>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#657080]">Fasilitas</p>
        {facilities.length === 0 ? (
          <p className="mt-2 text-xs text-[#9aa3af]">Tanpa fasilitas.</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {facilities.map((f, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl border border-[#e3e8ee] bg-white px-3 py-2">
                <span className="mt-0.5 text-[#1b4f9c]">
                  <FacilityIconBadge icon={f.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-[#1b3555]">{f.name}</span>
                  {f.note && <span className="mt-0.5 block text-[11px] text-[#657080]">{f.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
