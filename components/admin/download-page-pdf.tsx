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
      const printW = pageW - margin * 2
      const printH = pageH - margin * 2

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

      // Paginasi satu halaman per section: tiap <section> (plus kop sampul
      // `data-pdf-only`) jadi satu halaman A4 utuh, diskalakan agar pas muat
      // (contain) di tengah halaman — tidak ada section yang terpotong atau
      // bertumpuk. Elemen `print:hidden` & tombol sudah disembunyikan di atas,
      // jadi tidak ikut terhitung.
      const pageEls = (Array.from(target.children) as HTMLElement[]).filter(
        (el) => el.tagName === 'SECTION' || el.hasAttribute('data-pdf-only'),
      )

      // Elegant? No — pemotretan terjadi di media layar, padahal setiap section
      // seharusnya sebesar satu halaman A4 utuh. Class `pdf-page-mode`
      // (globals.css) memberi tahu CSS untuk membesarkan tiap section ke rasio
      // area cetak A4 (194x281mm) SELAMA unduh saja, lalu dikembalikan.
      const hadPageMode = target.classList.contains('pdf-page-mode')
      if (!hadPageMode) target.classList.add('pdf-page-mode')

      try {
        for (let i = 0; i < pageEls.length; i += 1) {
          setProgress(Math.round(((i + 1) / pageEls.length) * 100))
          const el = pageEls[i]
          // Ukur section seutuhnya lebih dulu; html2canvas default memotret
          // sebatas viewport jika tidak diberi width/height eksplisit, sehingga
          // section panjang (mis. itinerary dengan banyak day) bisa terpotong /
          // pecah. Dengan `width`/`height` + `windowHeight` = tinggi penuh
          // elemen, seluruh isi section selalu masuk SATU canvas → ditempel di
          // SATU halaman A4, berapa pun panjangnya (mengecil, tidak terbagi).
          const elW = el.scrollWidth
          const elH = el.scrollHeight
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
          // Selalu isi PENUH satu halaman A4: lebar dibuat selebar area cetak,
          // tinggi menyesuaikan. Dengan `pdf-page-mode` tiap section sudah
          // diukur setinggi/kelebar area cetak, jadi untuk section normal ini
          // = identik (tidak ada margin putih). Kalau content-nya membengkak
          // (mis. itinerary ditambah day sehingga lebih tinggi dari satu
          // halaman), otomatis terkompres mengecil agar tetap satu halaman —
          // lebarnya tetap sama, tidak menyisakan margin kiri/kanan.
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
        if (!hadPageMode) target.classList.remove('pdf-page-mode')
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