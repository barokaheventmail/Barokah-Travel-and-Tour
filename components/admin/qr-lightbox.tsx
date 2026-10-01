'use client'

import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, ChevronLeft, ChevronRight, Printer, UserX, X } from 'lucide-react'
import { metaLine } from '@/lib/print'

type QrCardInfo = {
  token: string
  name: string
  bus: string
  order: string
  seat: string
  vw: string
  crew: string
  ticket: string
  attended: boolean
  scannedAt: string
  pos: number
  total: number
}

const CARD_SELECTOR = '[data-qr-card]'

function readCard(el: HTMLElement): QrCardInfo {
  const d = el.dataset
  const list = Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR))
  const at = list.indexOf(el)
  return {
    token: d.qrToken ?? '',
    name: d.qrName ?? '',
    bus: d.qrBus ?? '',
    order: d.qrOrder ?? '',
    seat: d.qrSeat ?? '',
    vw: d.qrVw ?? '',
    crew: d.qrCrew ?? '',
    ticket: d.qrTicket ?? '',
    attended: d.qrAttended === 'yes',
    scannedAt: d.qrScanned ?? '',
    pos: at >= 0 ? at + 1 : 0,
    total: list.length,
  }
}

const formatJam = (value: string) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Pratinjau QR besar: klik salah satu kartu di halaman cetak untuk melihat
 * pesertanya layar penuh dan mencocokkan yang ditempel di kertas.
 *
 * Kartu di halaman cetak dirender server, jadi komponen ini tidak messing
 * dengan markup-nya — hanya memasang satu listener klik di `document` yang
 * membaca atribut `data-qr-*` dari kartu yang diklik (pola yang sama dengan
 * `armada-picker.tsx` dan `bus-crew.tsx`). QR besar diambil dari
 * `/api/admin/qr` saat dibutuhkan, bukan diikutkan sebagai props: halaman
 * dengan ratusan peserta tetap ringan.
 *
 * Sambil terbuka, halaman ini yang jadi bahan cetak: `@page` A5, daftar kartu
 * disembunyikan, dan yang keluar hanya kartu yang sedang dilihat.
 */
export function QrLightbox() {
  const [card, setCard] = useState<QrCardInfo | null>(null)
  const cardRef = useRef<QrCardInfo | null>(null)
  const lastCardRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  cardRef.current = card
  const open = card !== null

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      const el = target?.closest?.(CARD_SELECTOR) as HTMLElement | null
      if (!el) return
      lastCardRef.current = el
      setCard(readCard(el))
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Selama lightbox terbuka, halaman dicetak sebagai satu kartu A5: daftar QR
  // disembunyikan lewat atribut ini, dan `@page` diikutkan lewat <style> di
  // bawah. Dipakai untuk tombol "Cetak QR ini" maupun Ctrl+P biasa.
  useEffect(() => {
    if (!open) return
    document.documentElement.dataset.qrPrint = 'one'
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      delete document.documentElement.dataset.qrPrint
      document.body.style.overflow = prevOverflow
      lastCardRef.current?.focus?.({ preventScroll: true })
    }
  }, [open])

  function step(delta: -1 | 1) {
    const list = Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR))
    if (list.length === 0) return
    const current = cardRef.current
    const at = current ? list.findIndex((el) => el.dataset.qrToken === current.token) : -1
    const base = at < 0 ? (delta > 0 ? -1 : 0) : at
    const next = list[((base + delta + list.length) % list.length)]
    lastCardRef.current = next
    setCard(readCard(next))
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setCard(null)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        step(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        step(1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // `step` membaca state lewat ref, jadi tidak perlu ikut dalam dependensi.
  }, [open])

  if (!open || !card) return null

  const meta = metaLine({ order: Number(card.order) || 0, seat: card.seat, vw: card.vw })
  const jam = formatJam(card.scannedAt)

  return (
    <>
      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 10mm; }
          html[data-qr-print='one'] .print-qr-list { display: none !important; }
          html[data-qr-print='one'] .qr-lightbox {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            background: none !important;
          }
          html[data-qr-print='one'] .qr-lightbox,
          html[data-qr-print='one'] .qr-lightbox * { visibility: visible; }
          html[data-qr-print='one'] .qr-lightbox-panel {
            position: static !important;
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            animation: none !important;
            transform: none !important;
          }
          html[data-qr-print='one'] .qr-lightbox-qr { width: 68mm !important; height: 68mm !important; }
          html[data-qr-print='one'] .qr-lightbox-logo { height: 10mm !important; }
        }
      `}</style>

      <div
        className="qr-lightbox fixed inset-0 z-50 flex items-center justify-center bg-[#09204a]/70 p-4 backdrop-blur-sm"
        onClick={() => setCard(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`QR ${card.name}`}
          onClick={(e) => e.stopPropagation()}
          className="qr-lightbox-panel animate-overlay-in relative w-full max-w-sm rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                {card.bus || 'Unit'}
                {card.pos > 0 ? ` · ${card.pos} dari ${card.total}` : ''}
              </p>
              <h3 className="mt-0.5 truncate text-lg font-black text-[#1b3555]">{card.name}</h3>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setCard(null)}
              aria-label="Tutup pratinjau QR"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1f3f5] text-[#657080] transition-colors duration-200 hover:bg-[#e4e8ec] hover:text-[#1b3555] active:scale-95 print:hidden"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-barokah-event.png"
              alt="Barokah Tour and Travel"
              width={640}
              height={238}
              className="qr-lightbox-logo mx-auto mb-2 h-8 w-auto object-contain"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={card.token}
              src={`/api/admin/qr?token=${encodeURIComponent(card.token)}&size=480`}
              alt={`QR ${card.name}`}
              width={480}
              height={480}
              className="qr-lightbox-qr aspect-square w-[min(17rem,60vw)] rounded-xl border border-[#eef1f4] bg-white"
            />
          </div>

          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fafc] px-3 py-2">
              <dt className="font-semibold text-[#657080]">No. Tiket</dt>
              <dd className="font-bold tabular-nums text-[#1b4f9c]">{card.ticket || '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fafc] px-3 py-2">
              <dt className="font-semibold text-[#657080]">Posisi</dt>
              <dd className="font-bold text-[#1b3555]">{meta}</dd>
            </div>
            {card.crew && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fafc] px-3 py-2">
                <dt className="font-semibold text-[#657080]">Crew</dt>
                <dd className="truncate font-bold text-[#1b3555]">{card.crew}</dd>
              </div>
            )}
          </dl>

          <div
            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
              card.attended ? 'bg-[#e6f4ea] text-[#2ca84a]' : 'bg-[#fff7e0] text-[#b98a12]'
            }`}
          >
            {card.attended ? <BadgeCheck size={14} /> : <UserX size={14} />}
            {card.attended ? `Sudah hadir${jam ? ` · ${jam}` : ''}` : 'Belum absen'}
          </div>

          <div className="mt-4 flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="QR peserta sebelumnya"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] text-[#1b4f9c] transition-colors duration-200 hover:bg-[#eef4fb] active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => requestAnimationFrame(() => window.print())}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95"
            >
              <Printer size={14} /> Cetak QR ini (A5)
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="QR peserta berikutnya"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe4e8] text-[#1b4f9c] transition-colors duration-200 hover:bg-[#eef4fb] active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] font-semibold text-[#b0b8c2] print:hidden">
            Esc menutup · ← → pindah peserta
          </p>
        </div>
      </div>
    </>
  )
}
