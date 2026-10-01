import { hasModernColor, replaceModernColors, type ColorContext } from './color-modern'

/**
 * Menulis ulang warna CSS modern (`lab()`, `oklch()`, `color-mix()`, ...) di
 * subtree yang akan difoto html2canvas.
 *
 * html2canvas membaca *computed style* lalu mem-parse nilainya sendiri dengan
 * parser yang hanya mengenal rgb/hsl/hex. Palet bawaan Tailwind v4 ditulis
 * sebagai `lab()`, jadi begitu foto diambil html2canvas melempar error:
 *
 *   Attempting to parse an unsupported color function "lab"
 *
 * Nilai yang bermasalah dipindah ke inline style versi rgb-nya. html2canvas
 * selalu mem-baca ulang computed style dari klon yang baru dibuat, jadi
 * perubahan inline ini ikut terbawa dan tidak terlihat flicker di layar.
 */

/**
 * Properti yang isinya bisa memuat fungsi warna. `background-image` dan
 * `box-shadow` bukan "warna" murni, tapi keduanya bisa memuat gradient/`lab()`
 * di dalamnya, jadi ikut dicakup.
 */
const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'background-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'text-emphasis-color',
  'caret-color',
  'column-rule-color',
  'fill',
  'stroke',
  'box-shadow',
]

/** Elemen yang isinya tidak perlu dibaca. */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META'])

/**
 * Bersihkan satu kumpulan nilai computed style. Dipisah dari manipulasi DOM
 * supaya bisa diuji tanpa browser.
 */
export function normalizeStyleValues(
  values: Record<string, string>,
  ctx?: ColorContext,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [property, value] of Object.entries(values)) {
    if (!value || !hasModernColor(value)) continue
    const replaced = replaceModernColors(value, ctx)
    // Nilai yang tidak berubah berarti fungsi modern-nya ada di dalam `var()`
    // (atau tidak bisa dikonversi), dan menuliskannya balik hanya merusak var.
    if (replaced !== value) out[property] = replaced
  }
  return out
}

/**
 * Called on a live DOM subtree: returns a callback to undo the changes.
 */
export function normalizeModernColors(root: HTMLElement): () => void {
  const view = root.ownerDocument?.defaultView
  if (!view) return () => {}

  const restore: (() => void)[] = []

  const visit = (node: HTMLElement) => {
    if (SKIP_TAGS.has(node.tagName)) return
    const computed = view.getComputedStyle(node)
    // `currentcolor` hanya bisa diselesaikan lewat DOM: nilainya adalah
    // computed `color` elemen itu sendiri.
    const ctx: ColorContext = {
      currentColor: () => view.getComputedStyle(node).getPropertyValue('color'),
    }
    const changed = normalizeStyleValues(
      Object.fromEntries(
        COLOR_PROPERTIES.map((property) => [property, computed.getPropertyValue(property)]),
      ),
      ctx,
    )
    for (const [property, value] of Object.entries(changed)) {
      if (node.style.getPropertyValue(property) === value) continue
      const previous = node.style.getPropertyValue(property)
      const priority = node.style.getPropertyPriority(property)
      node.style.setProperty(property, value)
      restore.push(() => {
        if (previous) node.style.setProperty(property, previous, priority)
        else node.style.removeProperty(property)
      })
    }
    for (const child of Array.from(node.children)) visit(child as HTMLElement)
  }

  visit(root)
  return () => {
    for (const undo of restore.reverse()) undo()
  }
}