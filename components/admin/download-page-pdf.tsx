'use client'

import { useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { normalizeModernColors } from '@/lib/dom-color-normalize'

/**
 * Unduh halaman yang sedang tampil sebagai PDF, langsung ke folder Download.
 *
 * Isi halaman difoto dengan `html2canvas`, lalu tiap potongan gambar
 * diletakkan di halaman A4. Dipakai untuk Panduan peserta, yang isinya
 * ratusan baris HTML itinerary, tata tertib, doa, dan peta kursi — terlalu
 * banyak untuk digambar ulang manual seperti tiket.
 *
 * Konsekuensi yang perlu diketahui: html2canvas meraster seluruh halaman, jadi
 * teks di PDF tidak bisa disalin dan file cukup besar (butuh connection
 * lokal). Untuk tiket QR ini tidak dipakai — QR-nya bisa kehilangan kontras
 * sampai gagal discan, jadi tiket memakai `pdf-lib` di server.
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
    // Dimensi yang dipakai html2canvas untuk menentukan area tangkap: hanya
    // `getBoundingClientRect`, tanpa margin.
    const rect = target.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      setError('Isi halaman belum tampil. Tutup blokir atau muat ulang halaman, lalu coba lagi.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      // html2canvas memuat ulang tiap <img> sebagai data URL. Logo & aset di
      // public/ perlu CORS yang sama, kalau tidak gambar kosong di PDF.
      if (!loaded.current) {
        await document.fonts?.ready
        loaded.current = true
      }

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      // Sisakan 8mm supaya printer rumah tangga tidak memotong tepi.
      const margin = 8
      const usableH = pageH - margin * 2
      const imgW = pageW - margin * 2

      // Berapa CSS px yang muat di satu halaman A4 pada lebar konten ini.
      const sliceH = Math.max(1, Math.floor((usableH * rect.width) / imgW))
      const pages = Math.max(1, Math.ceil(rect.height / sliceH))

      // Tiap halaman difoto terpisah dengan `{y, height}`, bukan satu canvas untuk
      // seluruh halaman. Panduan peserta bisa puluhan ribu piksel tinggi, dan
      // browser punya batas tinggi & luas canvas: begitu lewat, html2canvas
      // diam-diam hanya mengisi bagian atas sehingga PDF terpotong.
      // `windowWidth`/`windowHeight` dikunci supaya layout tiap potret sama,
      // apa pun posisi scroll pengguna saat menekan tombol.
      const cloneViewport = {
        windowWidth: Math.max(rect.width, window.innerWidth),
        windowHeight: window.innerHeight,
      }

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

      // html2canvas mem-parse computed style dengan parser sendiri yang hanya
      // mengenal rgb/hsl/hex, sedangkan Tailwind v4 menulis warna sebagai
      // `oklab()`/`lab()`/`color-mix()`. Tanpa langkah ini html2canvas melempar
      // "Attempting to parse an unsupported color function". Warnanya ditulis
      // ulang jadi rgb di inline style, lalu dikembalikan setelah foto selesai:
      // html2canvas mem-baca klon yang dibuatnya sendiri, jadi layar tidak
      // berkedip.
      const restoreColors = normalizeModernColors(target)

      try {
        for (let page = 0; page < pages; page += 1) {
          setProgress(Math.round(((page + 1) / pages) * 100))
          const y = page * sliceH
          const canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            ...cloneViewport,
            y,
            height: Math.min(sliceH, rect.height - y),
          })
          if (page > 0) pdf.addPage()
          pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.92),
            'JPEG',
            margin,
            margin,
            imgW,
            (canvas.height * imgW) / canvas.width,
          )
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