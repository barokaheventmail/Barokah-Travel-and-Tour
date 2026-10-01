import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/db'
import { qrDataUrl, encodeToken } from '@/lib/scan'
import { formatTanggalPendek } from '@/lib/dates'
import { chunkPairs, metaLine } from '@/lib/print'
import { PrintButton } from '@/components/admin/print-button'
import { QrBusFilter } from '@/components/admin/qr-bus-filter'
import { QrLayoutToggle, type QrLayout } from '@/components/admin/qr-layout-toggle'
import { QrLightbox } from '@/components/admin/qr-lightbox'

export const metadata: Metadata = { title: 'Cetak QR Peserta – Panel Admin', robots: { index: false } }

export const dynamic = 'force-dynamic'

/**
 * `@page` hanya berlaku di dalam CSS dan tidak bisa di-scope ke selektor, jadi
 * ukuran kertas A5 ikut dikirim dari server. Ini penting: kalau aturannya baru
 * muncul setelah hidrasi, Ctrl+P yang ditekan begitu halaman terbuka akan
 * tetap memakai kertas bawaan browser. Aturan lain untuk mode ini ada di
 * `app/globals.css` (blok `@media print`).
 */
const A5_PRINT_STYLE = `@media print { @page { size: A5 portrait; margin: 8mm; } }`

type ParticipantRow = Awaited<ReturnType<typeof loadEvent>>['participants'][number]
type BusRow = Awaited<ReturnType<typeof loadEvent>>['buses'][number]

async function loadEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      buses: {
        orderBy: { order: 'asc' },
        include: { workers: { orderBy: { order: 'asc' }, include: { user: { select: { username: true, name: true } } } } },
      },
      participants: {
        orderBy: [{ busId: 'asc' }, { order: 'asc' }],
        include: { bus: { select: { id: true, name: true } } },
      },
    },
  })
  if (!event) notFound()
  return event
}

function crewNames(bus: BusRow): string {
  return bus.workers.map((w) => w.user.name ?? w.user.username).join(', ')
}

/**
 * Satu kartu QR. Berisi atribut `data-qr-*` yang dibaca listener klik di
 * `qr-lightbox.tsx` untuk membuka pratinjau besar — isinya diambil dari DOM,
 * bukan dari props client, supaya gambar QR (data URL) tidak ikut terduplikasi
 * ke payload client di halaman yang memuat ratusan peserta.
 */
function QrCard({
  p,
  qr,
  bus,
  variant,
}: {
  p: ParticipantRow
  qr: string
  bus: BusRow
  variant: QrLayout
}) {
  const single = variant === 'single'
  return (
    <button
      type="button"
      data-qr-card=""
      data-qr-token={p.token}
      data-qr-name={p.name}
      data-qr-bus={bus.name}
      data-qr-order={p.order}
      data-qr-seat={p.seat ?? ''}
      data-qr-vw={p.vw ?? ''}
      data-qr-crew={crewNames(bus)}
      data-qr-ticket={p.ticketCode}
      data-qr-attended={p.scannedAt ? 'yes' : 'no'}
      data-qr-scanned={p.scannedAt ? new Date(p.scannedAt).toISOString() : ''}
      title="Klik untuk melihat QR besar"
      className={`block w-full break-inside-avoid rounded-lg border border-[#dfe4e8] text-center transition-colors duration-200 ${
        single ? 'p-2.5 hover:border-[#1b4f9c]/50 hover:bg-[#f8fafc]' : 'p-2 hover:border-[#1b4f9c]/40 hover:bg-[#f8fafc]'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-barokah-event.png"
        alt="Barokah Tour and Travel"
        width={640}
        height={238}
        className={`mx-auto object-contain ${single ? 'mb-1.5 h-4 w-auto' : 'mb-1 h-3 w-auto'}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt={`QR ${p.name}`}
        className={`mx-auto aspect-square w-full ${single ? 'max-w-[52mm]' : 'max-w-[132px]'}`}
      />
      {single && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#1b4f9c]">{bus.name}</p>
      )}
      <p className={`mt-1.5 truncate font-bold text-[#1b3555] ${single ? 'text-sm' : 'text-[11px]'}`}>{p.name}</p>
      <p className={`font-semibold text-[#657080] ${single ? 'text-[11px]' : 'text-[10px]'}`}>
        {metaLine({ order: p.order, seat: p.seat, vw: p.vw })}
      </p>
      {bus.workers.length > 0 && (
        <p className="mt-0.5 truncate text-[10px] font-bold text-[#1b4f9c]">Crew: {crewNames(bus)}</p>
      )}
    </button>
  )
}

export default async function EventQR({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ bus?: string; layout?: string }>
}) {
  const { id } = await params
  const event = await loadEvent(id)

  const sp = await searchParams
  const rawBus = (sp.bus ?? '').trim()
  let selectedIds: string[] | null = null
  if (rawBus === 'none') selectedIds = []
  else if (rawBus) selectedIds = rawBus.split(',').filter(Boolean)

  const hasSelection = selectedIds !== null && selectedIds.length > 0
  const layout: QrLayout = sp.layout === 'single' ? 'single' : 'grid'

  const grouped = event.buses
    .map((bus) => ({
      bus,
      participants: event.participants
        .filter((p) => p.busId === bus.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((g) => g.participants.length > 0)
    .filter((g) => !hasSelection || selectedIds!.includes(g.bus.id))

  type Card = { p: ParticipantRow; qr: string }
  type Section = { bus: BusRow; cards: Card[] }
  let sections: Section[] = []
  if (hasSelection) {
    sections = await Promise.all(
      grouped.map(async (group) => {
        const cards = await Promise.all(
          group.participants.map(async (p) => {
            // Mode satuan dicetak jauh lebih besar, jadi QR-nya dibuat lebih
            // besar supaya tetap tajam di kertas.
            const qr = await qrDataUrl(encodeToken(p.token), layout === 'single' ? 320 : 256)
            return { p, qr }
          }),
        )
        return { bus: group.bus, cards }
      }),
    )
  }

  // Mode "1 per halaman" tidak mengelompokkan per bus lagi: dua kartu
  // berpasangan jadi satu halaman, dan nama bus ikut tercetak di tiap kartu
  // supaya tetap jelas setelah dipotong.
  const flatCards = sections.flatMap((s) => s.cards.map((c) => ({ ...c, bus: s.bus })))
  const sheets = layout === 'single' ? chunkPairs(flatCards) : []
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/admin/events/${event.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#657080] hover:text-[#1b4f9c]"
        >
          <ArrowLeft size={13} /> Kembali ke detail
        </Link>
        <PrintButton label={layout === 'single' ? 'Cetak / Simpan PDF (A5)' : 'Cetak / Simpan PDF'} />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 print:mt-0">
        <h1 className="text-xl font-bold text-[#1b3555]">{event.title}</h1>
        <span className="text-sm text-[#657080]">{formatTanggalPendek(new Date(event.date))}</span>
      </div>

      <QrBusFilter
        eventId={event.id}
        buses={event.buses.map((b) => ({ id: b.id, name: b.name }))}
        initial={selectedIds ?? []}
      />

      {hasSelection && <QrLayoutToggle eventId={event.id} bus={rawBus} layout={layout} />}

      {layout === 'single' && <style>{A5_PRINT_STYLE}</style>}

      {selectedIds === null ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#bfd3c4] bg-white p-10 text-center print:hidden">
          <p className="text-sm font-bold text-[#1b3555]">Pilih bus untuk mencetak QR</p>
          <p className="mt-1 text-xs text-[#657080]">
            Pilih bus di atas lalu tekan Cetak. Ini mencegah halaman memuat ribuan QR sekaligus dan menjaga browser tetap
            ringan.
          </p>
        </div>
      ) : selectedIds.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#bfd3c4] bg-white p-10 text-center print:hidden">
          <p className="text-sm font-bold text-[#1b3555]">Tidak ada bus yang dipilih</p>
          <p className="mt-1 text-xs text-[#657080]">Pilih minimal satu bus untuk dicetak.</p>
        </div>
      ) : layout === 'single' ? (
        <>
          <p className="mt-4 text-xs font-semibold text-[#657080] print:hidden">
            {flatCards.length} QR · 2 per halaman A5 · klik QR untuk melihat yang besar.
          </p>
          {/* `gap` (bukan margin) supaya jarak antar halaman tidak menambah
              halaman kosong saat dicetak; aturan print menimpanya jadi 4mm. */}
          <div className="qr-single print-ticket print-qr-list mt-4 flex flex-col gap-4">
            {sheets.map((sheet, i) => (
              <div key={i} className="qr-sheet">
                {sheet.map(({ p, qr, bus }) => (
                  <div key={p.id} className="qr-sheet-card">
                    <QrCard p={p} qr={qr} bus={bus} variant="single" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="print-ticket print-qr-list mt-4 space-y-8">
          {sections.map(({ bus, cards }) => (
            <div key={bus.id}>
              <h2 className="mb-3 border-b-2 border-[#1b4f9c] pb-1 text-left text-base font-black uppercase text-[#1b4f9c]">
                {bus.name} · {cards.length} peserta
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {cards.map(({ p, qr }) => (
                  <QrCard key={p.id} p={p} qr={qr} bus={bus} variant="grid" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <QrLightbox />
    </div>
  )
}
