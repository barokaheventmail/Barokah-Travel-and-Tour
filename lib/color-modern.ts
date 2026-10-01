/**
 * Konversi fungsi warna CSS modern (lab, oklab, lch, oklch, color-mix) ke
 * `rgb()`/`rgba()`.
 *
 * html2canvas — yang dipakai untuk/Unduh Panduan (PDF) — membaca *computed
 * style*, lalu mem-parsing warnanya sendiri. Parser itu hanya mengenal
 * rgb/hsl/hex, jadi begitu menemukan `lab(...)` dia melempar:
 *
 *   Attempting to parse an unsupported color function "lab"
 *
 * Tailwind v4 menulis palet default sebagai `lab()`, jadi utility seperti
 * `bg-emerald-100` atau `text-red-600` menghasilkan computed style yang
 * mustahil dibaca html2canvas. Solusinya: sebelum halaman difoto, semua warna
 * modern di subtree itu diubah jadi rgb di atribut `style` inline.
 *
 * Semua fungsi di sini murni (tanpa DOM), jadi bisa diuji langsung.
 */

/** Pisahkan argumen fungsi pada spasi/koma di level terluar saja. */
function splitTop(input: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of input) {
    if (ch === '(') depth += 1
    else if (ch === ')') depth -= 1
    if ((ch === ' ' || ch === ',') && depth === 0) {
      if (cur.trim()) out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

/** `"96.5%"` -> `0.965`, `"50"` -> `50`. Persen tidak dinormalkan ke 0..1. */
function num(token: string): number {
  const t = token.trim()
  if (t.endsWith('%')) return parseFloat(t) / 100
  return parseFloat(t)
}

/**
 * Nilai komponen warna. CIE Lab/LCH memakai skala 0..100 (dan 0..150 untuk
 * chroma), sedangkan Oklab/OkLch memakai 0..1 — jadi persentase perlu dibagi 100
 * hanya untuk varian "ok". Persentase di color-mix lain arti-nya porsi campur.
 */
function scalar(token: string, scale: 100 | 1): number {
  const t = token.trim()
  const v = parseFloat(t)
  // `scale` menyatakan berapa nilai "100%" itu: 100 untuk Lab (L=100%), 1
  // untuk Oklab (L=1.0). Angka tanpa persen dipakai apa adanya.
  return t.endsWith('%') ? (v * scale) / 100 : v
}

/** Pecah `L a b / alpha` jadi token komponen + alpha. */
function components(args: string): { parts: string[]; alpha: number } {
  const slash = args.indexOf('/')
  const body = slash < 0 ? args : args.slice(0, slash)
  const alpha = slash < 0 ? 1 : num(args.slice(slash + 1))
  return { parts: splitTop(body), alpha }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function encode(channel: number): number {
  const c = channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
  return Math.round(clamp01(c) * 255)
}

function result(r: number, g: number, b: number, alpha: number): string {
  const [ri, gi, bi] = [encode(r), encode(g), encode(b)]
  return alpha >= 1 ? `rgb(${ri}, ${gi}, ${bi})` : `rgba(${ri}, ${gi}, ${bi}, ${Math.round(alpha * 1000) / 1000})`
}

/**
 * Format dari channel 0..255 yang sudah gamma-encoded (space `srgb`). Berbeda
 * dengan `result()` yang masukannya linear dan harus di-encode dulu.
 */
function result255(r: number, g: number, b: number, alpha: number): string {
  const [ri, gi, bi] = [r, g, b].map((v) => Math.round(clamp01(v / 255) * 255))
  return alpha >= 1 ? `rgb(${ri}, ${gi}, ${bi})` : `rgba(${ri}, ${gi}, ${bi}, ${Math.round(alpha * 1000) / 1000})`
}

function decode(channel255: number): number {
  const c = clamp01(channel255 / 255)
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/**
 * CIE Lab -> sRGB linear.
 *
 * Lab didefinisikan terhadap white point D50, sedangkan matriks sRGB <-> XYZ
 * yang biasa ditulis memakai D65. Tanpa adaptasi Bradford di antaranya, warna
 * akan bergeser (putih jadi kuning-ish). Matriks di bawah = (sRGB→XYZ D65)^-1
 * x (Bradford D50→D65)^-1, sudah dihitung once.
 */
const D50_TO_SRGB = [
  [3.1336376338629437, -1.6171286337305675, -0.4905844816259808],
  [-0.9788184157583394, 1.9162985545460152, 0.033443822061889464],
  [0.07197266949672784, -0.2290315687748488, 1.4057232710187666],
]

/** sRGB linear -> XYZ D50, kebalikan dari matriks di atas (Bradford D65→D50). */
const XYZ_D50 = [0.96422, 1, 0.82521]
const LINEAR_SRGB_TO_XYZ_D50 = [
  [0.4361351, 0.3851426, 0.1430441],
  [0.2225287, 0.7168705, 0.0606053],
  [0.0139261, 0.097079, 0.713928],
]

/** sRGB linear (0..1) -> Lab (D50). */
function linearToLab(r: number, g: number, b: number): [number, number, number] {
  const xyz = [0, 1, 2].map(
    (i) =>
      LINEAR_SRGB_TO_XYZ_D50[i][0] * r +
      LINEAR_SRGB_TO_XYZ_D50[i][1] * g +
      LINEAR_SRGB_TO_XYZ_D50[i][2] * b,
  )
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(xyz[0] / XYZ_D50[0])
  const fy = f(xyz[1] / XYZ_D50[1])
  const fz = f(xyz[2] / XYZ_D50[2])
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** sRGB linear (0..1) -> Oklab. Kebalikan dari `oklabToLinear`. */
function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** Interpolasi hue(color-mix) memakai jalur terpendek, bukan jalur linear. */
function mixHue(a: number, b: number, t: number): number {
  const delta = (((b - a) % 360) + 540) % 360 - 180
  return (((a + delta * t) % 360) + 360) % 360
}

/** CIE Lab (D50) -> sRGB linear. */
function labToLinear(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const f = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (116 * t - 16) / 903)
  // White point D50 (0.96422, 1, 0.82521).
  const v = [f(fx) * 0.96422, f(fy), f(fz) * 0.82521]
  return [
    D50_TO_SRGB[0][0] * v[0] + D50_TO_SRGB[0][1] * v[1] + D50_TO_SRGB[0][2] * v[2],
    D50_TO_SRGB[1][0] * v[0] + D50_TO_SRGB[1][1] * v[1] + D50_TO_SRGB[1][2] * v[2],
    D50_TO_SRGB[2][0] * v[0] + D50_TO_SRGB[2][1] * v[1] + D50_TO_SRGB[2][2] * v[2],
  ]
}

/** Oklab (D65) -> sRGB linear, sesuai matriks Björn Ottosson. */
function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  // Oklab tersusun dari LMS non-linier, jadi a/b boleh negatif.
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const HUE = /^([+-]?[\d.]+)(deg|grad|rad|turn)?$/

function hueInDegrees(token: string): number {
  const m = HUE.exec(token.trim())
  const v = m ? parseFloat(m[1]) : 0
  switch (m?.[2]) {
    case 'grad':
      return (v * 360) / 400
    case 'rad':
      return (v * 180) / Math.PI
    case 'turn':
      return v * 360
    default:
      return v
  }
}

/** Warna yang sudah rgb/hsl/hex — biarkan apa adanya, html2canvas bisa baca. */
function isPlainColor(token: string): boolean {
  return /^(#|rgba?\(|hsla?\(|transparent$|currentcolor$|[a-z]+$)/i.test(token.trim())
}

/**
 * Konteks yang dibutuhkan untuk nilai warna yang tidak bisa diselesaikan dari
 * string-nya saja. Satu-satunya kasus nyata di CSS yang dipakai halaman ini:
 * `currentcolor` di dalam `color-mix()` (utilitas `divide-*` Tailwind).
 */
export interface ColorContext {
  currentColor?: () => string | null
}

/**
 * Ubah satu nilai warna modern jadi rgb/rgba. Balik `null` kalau nilainya
 * bukan warna modern (jadi pemanggil tidak perlu mengubah apa pun).
 */
export function toPlainColor(value: string, ctx?: ColorContext): string | null {
  const v = value.trim()
  const open = v.indexOf('(')
  if (open < 0) return null
  const name = v.slice(0, open).trim().toLowerCase()
  const args = v.slice(open + 1, v.lastIndexOf(')'))

  if (name === 'lab' || name === 'oklab') {
    const { parts: p, alpha } = components(args)
    if (p.length < 3) return null
    const scale = name === 'lab' ? 100 : 1
    const [L, a, b] = [scalar(p[0], scale), scalar(p[1], 100), scalar(p[2], 100)]
    if ([L, a, b].some(Number.isNaN)) return null
    const [r, g, bl] = name === 'lab' ? labToLinear(L, a, b) : oklabToLinear(L, a, b)
    return result(r, g, bl, alpha)
  }

  if (name === 'lch' || name === 'oklch') {
    const { parts: p, alpha } = components(args)
    if (p.length < 3) return null
    const scale = name === 'lch' ? 100 : 1
    const L = scalar(p[0], scale)
    const C = scalar(p[1], 100)
    const h = hueInDegrees(p[2])
    if ([L, C, h].some(Number.isNaN)) return null
    const rad = (h * Math.PI) / 180
    const [r, g, bl] =
      name === 'lch'
        ? labToLinear(L, C * Math.cos(rad), C * Math.sin(rad))
        : oklabToLinear(L, C * Math.cos(rad), C * Math.sin(rad))
    return result(r, g, bl, alpha)
  }

  if (name === 'color-mix') {
    const parts = splitTop(args)
    // `in <space>` menentukan ruang interpolasi, bukan warnanya. Karena
    // `splitTop` memecah spasi, kedua kata itu datang sebagai dua token.
    let space = 'srgb'
    if (parts[0]?.toLowerCase() === 'in') {
      space = (parts[1] ?? 'srgb').toLowerCase()
      parts.splice(0, 2)
    }
    const mixes: { color: string; weight: number | null }[] = []
    for (let i = 0; i < parts.length; i += 1) {
      const token = parts[i]
      if (!token) continue
      const next = parts[i + 1]
      const hasWeight = next !== undefined && !isPlainColor(next) && !Number.isNaN(num(next))
      mixes.push({
        color: toPlainColor(token, ctx) ?? token,
        weight: hasWeight ? num(next) : null,
      })
      if (hasWeight) i += 1
    }
    if (mixes.length < 2) return null

    // Porsi yang tidak disebut eksplisit menjadi sisanya: `a 50%, b` berarti
    // 50/50, bukan 1/3 - 2/3. Kalau semuanya tidak disebut, dibagi rata.
    const stated = mixes.filter((m) => m.weight !== null).reduce((sum, m) => sum + m.weight!, 0)
    const open = mixes.filter((m) => m.weight === null)
    const remainder = Math.max(0, 1 - stated)
    const openShare = open.length ? remainder / open.length : 0
    const weights = mixes.map((m) => (m.weight === null ? openShare : m.weight))
    const total = weights.reduce((sum, w) => sum + w, 0) || 1

    const stops: { rgb: [number, number, number, number]; w: number }[] = []
    for (let i = 0; i < mixes.length; i += 1) {
      const rgb = toRgbTriplet(mixes[i].color, ctx)
      if (!rgb) return null
      stops.push({ rgb, w: weights[i] / total })
    }

    /**
     * CSS menginterpolasi dengan alpha yang sudah di-premultiply, supaya warna
     * transparan tidak ikut menarik hasil. `divide-*` Tailwind bergantung pada
     * ini: `color-mix(in oklab, currentcolor 50%, transparent)` harus tetap
     * memakai warna aslinya, hanya alphanya yang jadi 0.5.
     *
     * `read` membaca satu channel yang sudah di-premultiply oleh alpha.
     */
    const premultiply = (read: (rgb: [number, number, number, number]) => number) => {
      let sum = 0
      let alpha = 0
      for (const stop of stops) {
        sum += read(stop.rgb) * stop.w
        alpha += stop.rgb[3] * stop.w
      }
      return { sum, alpha }
    }

    const alpha = premultiply((rgb) => rgb[3]).alpha

    // Tanpa `in`, CSS memakai srgb: rata-rata channel yang sudah gamma-encoded.
    // Mencampur di linear light tanpa encode ulang akan menggeser warna.
    if (space === 'srgb') {
      const mix = (i: number) => {
        const { sum, alpha: a } = premultiply((rgb) => rgb[i] * rgb[3])
        return a > 0 ? sum / a : 0
      }
      return result255(mix(0), mix(1), mix(2), alpha)
    }

    if (space === 'srgb-linear') {
      const mix = (i: number) => {
        const { sum, alpha: a } = premultiply((rgb) => decode(rgb[i] * rgb[3]))
        return a > 0 ? sum / a : 0
      }
      return result(mix(0), mix(1), mix(2), alpha)
    }

    // Ruang perseptual: komponen channel dirata-rata dalam ruang itu sendiri.
    const polar = space === 'lch' || space === 'oklch'
    const toSpace = (rgb: [number, number, number, number]): number[] => {
      const lin: [number, number, number] = [
        decode(rgb[0] * rgb[3]),
        decode(rgb[1] * rgb[3]),
        decode(rgb[2] * rgb[3]),
      ]
      const lab = space.startsWith('ok') ? linearToOklab(...lin) : linearToLab(...lin)
      if (!polar) return lab
      return [lab[0], Math.hypot(lab[1], lab[2]), (Math.atan2(lab[2], lab[1]) * 180) / Math.PI]
    }
    const coords = stops.map((s) => toSpace(s.rgb))

    // Alpha di-premultiply di ruang campur: koordinat dikali alpha-nya, lalu
    // dibagi total alpha di akhir.
    const unpremultiply = (channel: number) => (alpha > 0 ? channel / alpha : 0)
    const component = (at: number) =>
      unpremultiply(coords.reduce((sum, c, i) => sum + c[at] * stops[i].w, 0))

    const L = component(0)
    const a = component(1)

    if (!polar) {
      const b = component(2)
      const lin = space.startsWith('ok') ? oklabToLinear(L, a, b) : labToLinear(L, a, b)
      return result(lin[0], lin[1], lin[2], alpha)
    }

    // Polar: chroma dirata-rata, hue di interpolasi berurutan lewat jalur
    // terpendek. Fold mulai dari warna pertama, lalu setiap warna berikutnya
    // digeser sebesar bobotnya terhadap warna sebelumnya.
    const chroma = component(1)
    let hue = coords[0][2]
    for (let i = 1; i < coords.length; i += 1) {
      hue = mixHue(hue, coords[i][2], stops[i].w)
    }
    const rad = (hue * Math.PI) / 180
    const lin = space === 'oklch'
      ? oklabToLinear(L, chroma * Math.cos(rad), chroma * Math.sin(rad))
      : labToLinear(L, chroma * Math.cos(rad), chroma * Math.sin(rad))
    return result(lin[0], lin[1], lin[2], alpha)
  }

  return null
}

/**
 * `[r, g, b, alpha]` dari `rgb()`, `rgba()`, atau hex. Null kalau formatnya
 * tidak dikenali. Dipakai color-mix untuk mencampur dua warna yang sudah
 * ternormalisasi.
 *
 * `transparent` dan `currentcolor` hanya mungkin muncul sebagai argumen
 * color-mix yang belum dihitung, jadi keduanya ditangani di sini.
 */
function toRgbTriplet(color: string, ctx?: ColorContext): [number, number, number, number] | null {
  const v = color.trim()
  const keyword = v.toLowerCase()
  if (keyword === 'transparent') return [0, 0, 0, 0]
  if (keyword === 'currentcolor') {
    const resolved = ctx?.currentColor?.() ?? null
    if (!resolved) return null
    const plain = toPlainColor(resolved, ctx) ?? resolved
    // Cegah rekursi tak berakhir kalau `currentColor()` mengembalikan dirinya sendiri.
    return plain === resolved ? null : toRgbTriplet(plain, ctx)
  }
  const fn = /^rgba?\(([^)]*)\)$/i.exec(v)
  if (fn) {
    const parts = splitTop(fn[1])
    const [r, g, b] = parts.slice(0, 3).map(num)
    const alpha = parts.length > 3 ? num(parts[3]) : 1
    if ([r, g, b].some(Number.isNaN)) return null
    return [r, g, b, alpha]
  }
  const hex = /^#([\da-f]{3,8})$/i.exec(v)
  if (hex) {
    let h = hex[1]
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    const byte = (at: number) => parseInt(h.slice(at, at + 2), 16)
    return [byte(0), byte(2), byte(4), h.length === 8 ? byte(6) / 255 : 1]
  }
  return null
}

/** Apakah nilai ini mengandung fungsi warna modern? */
export function hasModernColor(value: string): boolean {
  return /\b(?:lab|oklab|lch|oklch|color-mix)\(/i.test(value)
}

const MODERN = ['lab', 'oklab', 'lch', 'oklch', 'color-mix']

/**
 * Ganti *semua* fungsi warna modern di dalam satu nilai. Ini yang dipakai
 * untuk properti majemuk: `box-shadow`, `background-image` (gradient),
 * `border-image` — isinya bisa memuat beberapa warna sekaligus.
 *
 * Fungsi lain (mis. `linear-gradient`) ditelusuri ke dalam, karena warna
 * modern bisa muncul di argumennya. `var()` dikecualikan: isinya custom
 * property mentah yang tidak boleh ditulis ulang.
 */
export function replaceModernColors(value: string, ctx?: ColorContext): string {
  if (!hasModernColor(value)) return value
  let out = ''
  let i = 0
  while (i < value.length) {
    if (!/[a-zA-Z-]/.test(value[i])) {
      out += value[i]
      i += 1
      continue
    }
    let j = i
    while (j < value.length && /[\w-]/.test(value[j])) j += 1
    const name = value.slice(i, j).toLowerCase()
    if (value[j] !== '(') {
      out += value.slice(i, j)
      i = j
      continue
    }
    let depth = 0
    let k = j
    for (; k < value.length; k += 1) {
      if (value[k] === '(') depth += 1
      else if (value[k] === ')') {
        depth -= 1
        if (depth === 0) break
      }
    }
    if (k >= value.length) {
      // Kurung tidak tertutup: sisanya bukan nilai CSS yang valid.
      out += value.slice(i)
      break
    }
    const whole = value.slice(i, k + 1)
    if (name === 'var') out += whole
    else if (MODERN.includes(name)) out += toPlainColor(whole, ctx) ?? whole
    else out += `${name}(${replaceModernColors(value.slice(j + 1, k), ctx)})`
    i = k + 1
  }
  return out
}