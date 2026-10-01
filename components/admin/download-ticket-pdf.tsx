'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

/**
 * Unduh tiket peserta sebagai PDF, langsung ke folder Download.
 *
 * PDF-nya dibuat server (`/api/admin/ticket-pdf`), bukan dari `window.print()`:
 * peserta tidak perlu memilih "Save as PDF" di dialog cetak, tidak ada
 * jendela yang menghalangi, dan tidak perlu memilih kertas A4 manual.
 */
export function DownloadTicketPdf({ token, name }: { token: string; name?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ticket-pdf?token=${encodeURIComponent(token)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Gagal membuat PDF tiket.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tiket-${(name ?? 'peserta').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()}.pdf`
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
        Tersimpan langsung ke folder Download · kertas A4 · QR tetap bisa discan.
      </p>
    </div>
  )
}