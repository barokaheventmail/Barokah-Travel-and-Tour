'use client'

import { useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { normalizeModernColors } from '@/lib/dom-color-normalize'

/**
 * Unduh halaman yang sedang tampil sebagai PDF, langsung ke folder Download.
 *
 * Isi halaman difoto dengan `html-to-image`, lalu tiap potongan gambar
 * diletakkan di halaman A4. Dipakai untuk Panduan peserta, yang isinya
 * ratusan baris HTML itinerary, tata tertib, doa, dan peta kursi — terlalu
 * banyak untuk digambar ulang manual seperti tiket.
 *
 * Konsekuensi yang perlu diketahui: halaman diraster, jadi teks di PDF tidak
 * bisa disalin dan file cukup besar (butuh connection lokal). Untuk tiket QR
 * ini tidak dipakai — QR-nya bisa kehilangan kontras sampai gagal discan, jadi
 * tiket memakai `pdf-lib` di server.
 */
export function DownloadPagePdf({
  targetId,
  fileName,
  label = 'Unduh Panduan (PDF)',
  hint,
}: {
  targetId: string
  fileName: string
  label?: string
  hint?: string
}) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loaded = useRef(false)

  async function download() {
    const target = document.getElementById(targetId)
    if (!target) {
      setError('Isi halaman tidak ditemukan.')
      return
    }
    // Pastikan target punya ukuran sebelum capture.
    const rect = target.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      setError('Isi halaman belum tampil. Tutup blokir atau muat ulang halaman, lalu coba lagi.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const [htmlToImage, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ])

      // Tunggu font selesai dimuat supaya metrik teks sama dengan tampilan.
      if (!loaded.current) {
        await document.fonts?.ready
        loaded.current = true
      }

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      // Tanpa margin: tiap section mengisi PENUH halaman A4 (210 × 297 mm),
      // sesuai ukuran kotak `.a4-page` di globals.css.
      const margin = 0
      const printW = pageW
      const printH = pageH

      // Tombol unduh & blok ajakan cetak tidak boleh ikut terpotret, jadi
      // disembunyikan sementara lalu dikembalikan setelah selesai.
      const hidden = Array.from(target.querySelectorAll<HTMLElement>('[data-pdf-exclude], .print\\:hidden'))
      const prevDisplay = hidden.map((el) => el.style.display)
      for (const el of hidden) el.style.display = 'none'

      // Sebaliknya, kop dokumen bertanda `data-pdf-only` sengaja disembunyikan
      // di layar (dan ikut tercetak lewat Print), jadi di sini dihidupkan dulu
      // supaya jadi sampul PDF. Inline style mengalahkan utility `hidden`,
      // jadi cukup menulis `display` polos.
      const pdfOnly = Array.from(target.querySelectorAll<HTMLElement>('[data-pdf-only]'))
      const prevPdfOnly = pdfOnly.map((el) => el.style.display)
      for (const el of pdfOnly) el.style.display = 'block'

      // Tailwind v4 menulis warna sebagai `oklab()`/`lab()`/`color-mix()`.
      // Samakan ke rgb sebelum capture agar hasil gambar konsisten, lalu
      // kembalikan setelah selesai supaya layar tidak berkedip.
      const restoreColors = normalizeModernColors(target)

      // Paginasi satu halaman per section: tiap <A4Section> (`data-pdf-page`)
      // dan sampul (`data-pdf-cover`) jadi satu halaman A4 utuh. Elemen
      // `print:hidden` (mis. blok ajakan cetak) & tombol sudah disembunyikan di
      // atas; di sini mereka juga dibuang dari daftar supaya tidak menghasilkan
      // halaman kosong.
      const hiddenSet = new Set(hidden)
      const pageEls = (
        Array.from(target.querySelectorAll<HTMLElement>('[data-pdf-page], [data-pdf-cover]')) as HTMLElement[]
      ).filter((el) => !hiddenSet.has(el) && el.style.display !== 'none')

      // Semua halaman memakai html-to-image (foreignObject), bukan html2canvas.
      // html2canvas menghitung ulang layout sendiri dan menggeser isi halaman
      // (mis. judul Visi/Misi dan tabel itinerary turun ±13 px) serta tidak
      // mendukung `clip-path` pada foto hexagon sampul. html-to-image memakai
      // render browser, jadi posisi, transform scale, grid itinerary, dan
      // clip-path tetap persis seperti tampilan layar.

      try {
        for (let i = 0; i < pageEls.length; i += 1) {
          setProgress(Math.round(((i + 1) / pageEls.length) * 100))
          const el = pageEls[i]
          const canvas = await htmlToImage.toCanvas(el, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true,
          })
          const imgW = canvas.width
          const imgH = canvas.height
          if (imgW === 0 || imgH === 0) continue
          // Isi PENUH satu halaman A4 (210 × 297 mm). Kotak A4 aspeknya sama
          // dengan halaman, jadi gambar identik dengan tampilan layar (tanpa
          // distorsi, tanpa margin tepi).
          if (i > 0) pdf.addPage()
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, printW, printH)
        }
      } finally {
        hidden.forEach((el, i) => {
          el.style.display = prevDisplay[i]
        })
        pdfOnly.forEach((el, i) => {
          el.style.display = prevPdfOnly[i]
        })
        restoreColors()
      }

      pdf.save(fileName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="flex items-center gap-2 rounded-full bg-[#f5b915] px-6 py-3 text-sm font-bold text-[#1d2733] transition-colors duration-200 hover:bg-[#e4aa09] active:scale-95 disabled:opacity-60 print:hidden"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {busy ? (progress !== null ? `Membuat PDF… ${progress}%` : 'Menyiapkan…') : label}
      </button>
      {error && <p className="max-w-md text-center text-xs font-semibold text-[#c81e1e]">{error}</p>}
      <p className="mx-auto max-w-sm text-center text-[11px] leading-relaxed text-[#9aa3af] print:hidden">
        {hint ?? 'Tersimpan langsung ke folder Download · kertas A4 · bisa dibuka offline.'}
      </p>
    </div>
  )
}