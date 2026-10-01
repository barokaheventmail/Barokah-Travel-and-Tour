import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Pagination PDF peserta memakai html2canvas, yang membaca *computed style*.
 * Palet default Tailwind v4 ditulis sebagai `lab(...)` di dalam blok
 * `@supports`, dan parser warna html2canvas hanya mengenal rgb/hsl/hex.
 * Palet yang bocor ke subtree yang diekspor bikin html2canvas melempar
 * "Attempting to parse an unsupported color function \"lab\"".
 *
 * Jadi kelas warna palet (`bg-emerald-100`, `text-red-600`, ...) dilarang di
 * file yang isinya ikut terpotret; pakai hex arbitrer (`bg-[#d1fae5]`) atau
 * token tema (`bg-primary`) yang defined di globals.css sebagai hex.
 */
const PALETTE = new RegExp(
  '\\b(?:text|bg|border|ring|from|to|via|fill|stroke|outline|decoration|accent|caret|divide|shadow)-' +
    '(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|' +
    'violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\\d{2,3}\\b'
)

/** Subtree yang difoto `DownloadPagePdf` (lihat `panduan-isi`). */
const EXPORTED_FILES = [
  'app/event/[id]/panduan/page.tsx',
  'components/public-seat-map.tsx',
  'components/site.tsx',
  'components/event-navbar.tsx',
  'components/admin/print-button.tsx',
]

describe('warna subtree yang diekspor ke PDF', () => {
  for (const file of EXPORTED_FILES) {
    it(`${file} tidak memakai kelas warna palet Tailwind`, () => {
      const source = readFileSync(file, 'utf8')
      const found = source.match(PALETTE)
      expect(found?.[0] ?? null).toBeNull()
    })
  }
})