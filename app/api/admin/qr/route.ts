import { NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { encodeToken, qrDataUrl } from '@/lib/scan'

const MIN_SIZE = 128
const MAX_SIZE = 512
const DEFAULT_SIZE = 480

/**
 * QR peserta dalam resolusi besar, dibuat saat dibutuhkan.
 *
 * Halaman cetak QR sudah menyertakan QR kecil di markup-nya, jadi file ini
 * hanya untuk pratinjau besar (klik kartu untuk memperbesar) — itu sebabnya
 * gambar tidak dikirim ke client sampai benar-benar diminta, halaman daftar
 * QR yang panjang tidak ikut memberat.
 *
 * `proxy.ts` hanya mencocokkan `/admin/*`, bukan `/api/admin/*`, jadi route
 * ini wajib cek session sendiri seperti route admin lain.
 */
export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const token = (url.searchParams.get('token') ?? '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Token peserta wajib diisi.' }, { status: 400 })
  }

  const requested = Number(url.searchParams.get('size'))
  const size = Number.isFinite(requested)
    ? Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(requested)))
    : DEFAULT_SIZE

  const dataUrl = await qrDataUrl(encodeToken(token), size)
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)

  return new NextResponse(Buffer.from(base64, 'base64'), {
    headers: {
      'Content-Type': 'image/png',
      // Token peserta tidak pernah berubah, jadi aman di-cache lama.
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
