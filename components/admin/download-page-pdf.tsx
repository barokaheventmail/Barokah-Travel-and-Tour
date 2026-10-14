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
      // Tanpa margin: tiap section mengisi PENUH halaman A4 (210 × 297 mm),
      // sesuai ukuran section yang diatur `pdf-page-mode` di globals.css.
      const margin = 0
      const printW = pageW
      const printH = pageH

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

      // Daftar Nama denah duduk: di web semua peserta tampil, tapi di PDF cukup
      // 18 baris pertama (lihat aturan `.roster-rows.pdf-capture` di
      // globals.css) supaya section tidak memanjang. Kelasnya dilepas lagi
      // setelah pemotretan selesai.
      const rosterRows = Array.from(target.querySelectorAll<HTMLElement>('.roster-rows'))
      for (const el of rosterRows) el.classList.add('pdf-capture')

      // html2canvas mem-parse computed style dengan parser sendiri yang hanya
      // mengenal rgb/hsl/hex, sedangkan Tailwind v4 menulis warna sebagai
      // `oklab()`/`lab()`/`color-mix()`. Tanpa langkah ini html2canvas melempar
      // "Attempting to parse an unsupported color function". Warnanya ditulis
      // ulang jadi rgb di inline style, lalu dikembalikan setelah foto selesai:
      // html2canvas mem-baca klon yang dibuatnya sendiri, jadi layar tidak
      // berkedip.
      const restoreColors = normalizeModernColors(target)

      // Paginasi satu halaman per section: tiap <A4Section> (`data-pdf-page`)
      // dan kop sampul (`data-pdf-only`) jadi satu halaman A4 utuh. Elemen
      // `print:hidden` (mis. blok ajakan cetak) & tombol sudah disembunyikan di
      // atas; di sini mereka juga dibuang dari daftar supaya tidak menghasilkan
      // halaman kosong.
      const hiddenSet = new Set(hidden)
      const pageEls = (Array.from(target.children) as HTMLElement[]).filter(
        (el) =>
          (el.tagName === 'SECTION' ||
            el.hasAttribute('data-pdf-only') ||
            el.hasAttribute('data-pdf-page')) &&
          !hiddenSet.has(el) &&
          el.style.display !== 'none',
      )

      // WYSIWYG: setiap <A4Section> adalah kotak kertas A4 (210 × 297 mm) yang
      // sudah menata isinya persis seperti tampilan layar (isi yang kepanjangan
      // dikecilkan dengan `transform: scale`). Kotak itu difoto APA ADANYA —
      // termasuk transform-nya, yang didukung html2canvas 1.4 (section denah
      // sudah memakai cara ini) — lalu ditempel penuh ke satu halaman A4.
      // Karena kotak sudah seukuran A4, hasilnya sama dengan yang dilihat di web.

      try {
        for (let i = 0; i < pageEls.length; i += 1) {
          setProgress(Math.round(((i + 1) / pageEls.length) * 100))
          const el = pageEls[i]
          // html2canvas default memotret sebatas viewport bila tidak diberi
          // width/height eksplisit. Kotak A4 (`data-pdf-page`) difoto sebatas
          // area yang terlihat (clientWidth/Height = 210 × 297 mm) — persis
          // seperti di layar — sehingga isi yang sudah dikecilkan tidak melar.
          // Elemen lain (mis. kop sampul) difoto seukuran isinya.
          const isA4Page = el.hasAttribute('data-pdf-page')
          const elW = isA4Page ? el.clientWidth : el.scrollWidth
          const elH = isA4Page ? el.clientHeight : el.scrollHeight
          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: elW,
            height: elH,
            ...cloneViewport,
            windowWidth: Math.max(elW, cloneViewport.windowWidth),
            windowHeight: Math.max(elH, cloneViewport.windowHeight),
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
        for (const el of rosterRows) el.classList.remove('pdf-capture')
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