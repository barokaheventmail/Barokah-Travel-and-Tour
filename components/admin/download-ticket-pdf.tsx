'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { needsInlinePdfViewer } from '@/lib/download'

/**
 * Unduh tiket peserta sebagai PDF.
 *
 * PDF-nya dibuat server (`/api/admin/ticket-pdf`), bukan dari `window.print()`:
 * peserta tidak perlu memilih "Save as PDF" di dialog cetak, tidak ada
 * jendela yang menghalangi, dan tidak perlu memilih kertas A4 manual.
 *
 * Dua jalur, karena `blob:` + atribut `download` tidak bisa diandalkan di HP
 * (lihat `lib/download.ts`): desktop memaksa unduh ke folder Download, HP
 * membuka viewer PDF-nya di tab baru supaya peserta bisa Save/Share sendiri
 * tanpa kehilangan layar QR-nya.
 */
export function DownloadTicketPdf({ token, name }: { token: string; name?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileName = `tiket-${(name ?? 'peserta').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()}.pdf`

  async function download() {
    const path = `/api/admin/ticket-pdf?token=${encodeURIComponent(token)}`

    // HP: buka viewer PDF, bukan memaksa unduh. Harus langsung di dalam handler
    // klik supaya masih dihitung sebagai gerakan pengguna — kalau ditunda lewat
    // `await`, browser memblokirnya. Tab baru dipakai supaya layar QR tiket
    // tetap ada untuk disodorkan ke crew; kalau popup-nya diblokir, tetap
    // buka di tab yang sama daripada diam-diam tidak terjadi apa-apa.
    if (
      typeof navigator !== 'undefined' &&
      needsInlinePdfViewer({ ua: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints })
    ) {
      if (!window.open(path, '_blank')) window.location.href = path
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${path}&dl=1`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Gagal membuat PDF tiket.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF tiket.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="flex items-center gap-2 rounded-full bg-[#f5b915] px-5 py-2.5 text-sm font-bold text-[#1d2733] transition-colors duration-200 hover:bg-[#e4aa09] active:scale-95 disabled:opacity-60 print:hidden"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {busy ? 'Menyiapkan PDF…' : 'Unduh Tiket (PDF)'}
      </button>
      {error && <p className="max-w-xs text-center text-xs font-semibold text-red-600">{error}</p>}
      <p className="text-center text-[11px] text-[#9aa3af] print:hidden">
        PDF kertas A4 · QR tetap bisa discan · di HP bisa disimpan atau dibagikan.
      </p>
    </div>
  )
}
