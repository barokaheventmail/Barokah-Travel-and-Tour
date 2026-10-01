import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BadgeCheck, BookOpen, Bus, Clock3, DoorOpen, MapPin } from 'lucide-react'
import { prisma } from '@/lib/db'
import { qrDataUrl, encodeToken } from '@/lib/scan'
import { formatTanggalPendek } from '@/lib/dates'
import { AutoRefresh } from '@/components/admin/auto-refresh'
import { DownloadTicketPdf } from '@/components/admin/download-ticket-pdf'

export const metadata: Metadata = { title: 'Tiket Peserta – Barokah Tour and Travel', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const p = await prisma.participant.findUnique({
    where: { token },
    include: {
      bus: { include: { workers: { orderBy: { order: 'asc' }, include: { user: { select: { username: true, name: true, phone: true } } } } } },
      event: true,
      scannedBy: { select: { username: true, name: true } },
    },
  })

  if (!p) notFound()

  const qr = await qrDataUrl(encodeToken(p.token), 420)
  const attended = p.scannedAt !== null
  const noTicket = p.ticketCode

  return (
    <main className="min-h-screen bg-[#f4f7fa] px-4 py-8">
      <AutoRefresh />
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex flex-col items-center gap-3 print:hidden">
          <DownloadTicketPdf token={p.token} name={p.name} />
        </div>
        <div className="print-ticket overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-2xl">
          <div className="bg-[#1b4f9c] px-6 py-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">Barokah Tour &amp; Travel</p>
            <p className="mt-1 text-lg font-bold">Tiket Wisata</p>
          </div>

          <div className="px-6 py-5">
            <div className="rounded-xl bg-[#f8fafc] p-4">
              <p className="text-xs text-[#657080]">Nama Peserta</p>
              <p className="mt-0.5 text-base font-bold text-[#1b3555]">{p.name}</p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[#657080]">No. Tiket</dt>
                <dd className="mt-0.5 font-bold text-[#1b4f9c]">{noTicket}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#657080]">Status Absensi</dt>
                <dd
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    attended ? 'bg-[#e6f4ea] text-[#2ca84a]' : 'bg-[#fff7e0] text-[#b98a12]'
                  }`}
                >
                  {attended ? 'Sudah Hadir' : 'Belum Hadir'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-[#657080]">Event</dt>
                <dd className="mt-0.5 flex items-center gap-1 font-semibold text-[#1b3555]">{p.event.title}</dd>
                <dd className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#657080]">
                  <span className="flex items-center gap-1">
                    <Clock3 size={12} /> {formatTanggalPendek(new Date(p.event.date))}
                  </span>
                  {p.event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {p.event.location}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#657080]">Bus / Unit</dt>
                <dd className="mt-0.5 flex items-center gap-1 font-bold text-[#1b4f9c]">
                  <Bus size={13} /> {p.bus.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#657080]">Kursi</dt>
                <dd className="mt-0.5 flex items-center gap-1 font-semibold text-[#1b3555]">
                  <DoorOpen size={13} /> {p.seat || '—'}
                </dd>
              </div>
              {p.bus.workers.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-xs text-[#657080]">Crew Bertugas</dt>
                  <dd className="mt-0.5 text-xs font-semibold text-[#1b3555]">
                    {p.bus.workers.map((w) => w.user.name ?? w.user.username).join(' · ')}
                  </dd>
                </div>
              )}
              {p.room && (
                <div>
                  <dt className="text-xs text-[#657080]">Kamar</dt>
                  <dd className="mt-0.5 font-semibold text-[#1b3555]">{p.room}</dd>
                </div>
              )}
              {p.vw && (
                <div>
                  <dt className="text-xs text-[#657080]">VW</dt>
                  <dd className="mt-0.5 font-semibold text-[#1b3555]">{p.vw}</dd>
                </div>
              )}
            </dl>

            <div className="mt-5 flex flex-col items-center gap-3 rounded-xl bg-[#f8fafc] p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt={`QR absensi ${p.name}`}
                className="h-44 w-44 rounded-xl bg-white p-2 shadow-sm"
              />
              <p className="text-center text-xs leading-relaxed text-[#657080]">
                Tunjukkan QR di layar ini ke <strong className="text-[#1b3555]">crew</strong> saat absensi keberangkatan.
              </p>
            </div>

            {attended && (
              <div className="animate-fade-up mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#e6f4ea] p-3 text-center">
                <BadgeCheck className="shrink-0 text-[#2ca84a]" size={18} />
                <p className="text-xs font-bold text-[#2ca84a]">
                  Kehadiran Anda sudah tercatat{p.scannedBy?.username ? ` oleh crew ${p.scannedBy.username}` : ''}. Selamat berangkat!
                </p>
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/event/${p.eventId}/panduan?token=${encodeURIComponent(p.token)}`}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#dfe4e8] bg-white px-4 py-3 text-xs font-bold text-[#1b4f9c] transition-colors duration-200 hover:bg-[#eef4fb] active:scale-[0.99] print:hidden"
        >
          <BookOpen size={14} /> Lihat Panduan &amp; Peta Kursi
        </Link>

        <Link
          href={`/event/${p.eventId}`}
          className="mt-4 block text-center text-xs font-bold text-[#657080] transition-colors hover:text-[#1b4f9c] print:hidden"
        >
          ← Kembali ke detail event
        </Link>
      </div>
    </main>
  )
}