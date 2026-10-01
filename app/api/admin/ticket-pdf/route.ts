import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { formatTanggalPendek } from '@/lib/dates'
import { buildTicketPdf, ticketFileName } from '@/lib/ticket-pdf'

export const dynamic = 'force-dynamic'

/**
 * Tiket peserta sebagai file PDF, langsung terunduh ke folder Download.
 *
 * Berbeda dari halaman `/tiket/[token]` yang masih bisa dicetak lewat
 * `window.print()`, route ini merakit PDF-nya di server dengan `pdf-lib`:
 * QR disisipkan sebagai PNG resolusi tinggi (bukan difoto dari DOM, yang
 * bisa membuat QR gagal discan) dan teksnya tetap bisa disalin.
 *
 * Route ini sengaja TIDAK memakai `requireAdminSession()`, walaupun path-nya
 * ada di `/api/admin/*`. Tombol unduhnya ada di `/tiket/[token]` yang publik,
 * jadi kalau route ini dijaga admin, peserta yang membuka tiketnya di HP
 * selalu dapat 403 dan tombolnya jadi tidak berguna. Yang membatasi di sini
 * adalah `token` peserta: UUID-nya yang jadi capability — halaman tiketnya
 * sendiri sudah menampilkan QR dan seluruh isi PDF ini tanpa login, jadi
 * mengizinkan PDF-nya tidak menambah kebocoran apa pun. Path `/api/admin/*`
 * memang tidak dicocokkan `proxy.ts` (hanya `/admin/*`), jadi tidak ada
 * redirect login yang perlu ditangani di sini.
 *
 * `?dl=1` memaksa `Content-Disposition: attachment`. Tanpa itu defaultnya
 * `inline` supaya HP bisa membuka viewer PDF-nya (tombol Save/Share) — iOS
 * Safari mengabaikan atribut `download` pada URL `blob:`, jadi cara unduh
 * lewat anchor tidak jalan di sana.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const forceDownload = url.searchParams.get('dl') === '1'
  const token = (url.searchParams.get('token') ?? '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Token peserta wajib diisi.' }, { status: 400 })
  }

  const p = await prisma.participant.findUnique({
    where: { token },
    include: {
      bus: {
        include: {
          workers: { orderBy: { order: 'asc' }, include: { user: { select: { name: true, username: true } } } },
        },
      },
      event: true,
      scannedBy: { select: { username: true, name: true } },
    },
  })
  if (!p) {
    return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 })
  }

  // Logo dibaca sekali per request. File di public/ lalu dibaca lewat
  // filesystem supaya tidak perlu fetch ke dir sendiri (yang akan menumpuk
  // route ini sebagai request HTTP baru).
  const logoPng = await readFile(join(process.cwd(), 'public', 'logo-barokah-event.png'))

  const bytes = await buildTicketPdf({
    token: p.token,
    name: p.name,
    ticketCode: p.ticketCode,
    eventTitle: p.event.title,
    eventDate: formatTanggalPendek(new Date(p.event.date)),
    eventLocation: p.event.location,
    busName: p.bus.name,
    seat: p.seat,
    room: p.room,
    vw: p.vw,
    crew: p.bus.workers.map((w) => w.user.name ?? w.user.username).join(' · '),
    attended: p.scannedAt !== null,
    scannedBy: p.scannedBy ? (p.scannedBy.name ?? p.scannedBy.username) : null,
    logoPng: Uint8Array.from(logoPng),
  })

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${forceDownload ? 'attachment' : 'inline'}; filename="${ticketFileName(p.name, p.ticketCode)}"`,
      // Isi tiket berubah tiap sesi/status absensi, jadi tidak di-cache lama.
      'Cache-Control': 'private, no-store',
    },
  })
}