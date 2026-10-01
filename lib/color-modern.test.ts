import { describe, expect, it } from 'vitest'
import { hasModernColor, replaceModernColors, toPlainColor } from './color-modern'

/**
 * Nilai acuan diambil dari output Tailwind v4 (`lab(...)`) dan dari palet
 * `oklch(...)` yang sama secara visual. R toleransi ±2/255 karena pdf/html
 * hanya menyimpan 8 bit per kanal.
 */
const near = (actual: string | null, r: number, g: number, b: number, alpha = 1) => {
  expect(actual).not.toBeNull()
  const nums = actual!.match(/[\d.]+/g)!.map(Number)
  expect(nums[0]).toBeCloseTo(r, -0.5)
  expect(nums[1]).toBeCloseTo(g, -0.5)
  expect(nums[2]).toBeCloseTo(b, -0.5)
  if (alpha !== 1) expect(nums[3]).toBeCloseTo(alpha, 1)
}

describe('toPlainColor', () => {
  it('lab() Tailwind v4 -> rgb', () => {
    // --color-red-50: lab(96.5005% 4.18508 1.52328) = #fef2f2
    near(toPlainColor('lab(96.5005% 4.18508 1.52328)'), 254, 242, 242)
    // lab() dihitung terhadap D50; tanpa adaptasi ke D65 hasilnya meleset.
    near(toPlainColor('lab(47.9395% 66.94388 46.91264)'), 216, 37, 40)
  })

  it('titik acuan Lab netral', () => {
    near(toPlainColor('lab(100% 0 0)'), 255, 255, 255)
    near(toPlainColor('lab(0% 0 0)'), 0, 0, 0)
    // L*=50 -> abu-abu tengah.
    near(toPlainColor('lab(50% 0 0)'), 119, 119, 119)
  })

  it('oklab() -> rgb', () => {
    // oklab(63.68% 0.18786 0.08893) = #ef4444 (Tailwind red-500)
    near(toPlainColor('oklab(63.68% 0.18786 0.08893)'), 239, 68, 68)
    near(toPlainColor('oklab(97.05% 0.01236 0.00387)'), 254, 242, 242)
  })

  it('lch() -> rgb', () => {
    // lch(55.7881% 77.28469 31.8736) = #ef4444 (Tailwind red-500)
    near(toPlainColor('lch(55.7881% 77.28469 31.8736)'), 239, 68, 68)
  })

  it('oklch() -> rgb', () => {
    // oklch(63.6834% 0.20785 25.3313) = #ef4444
    near(toPlainColor('oklch(63.6834% 0.20785 25.3313)'), 239, 68, 68)
  })

  it('satuan hue non-derajat ikut dibaca', () => {
    const expected = toPlainColor('oklch(60% 0.2 90deg)')
    expect(toPlainColor('oklch(60% 0.2 0.25turn)')).toBe(expected)
    expect(toPlainColor('oklch(60% 0.2 100grad)')).toBe(expected)
    expect(toPlainColor('oklch(60% 0.2 1.5708rad)')).toBe(expected)
  })

  it('alpha dipertahankan', () => {
    near(toPlainColor('lab(96.5005% 4.18508 1.52328 / 0.5)'), 254, 242, 242, 0.5)
    near(toPlainColor('oklab(63.68% 0.18786 0.08893 / 20%)'), 239, 68, 68, 0.2)
  })

  it('bentuk yang persis ditulis Tailwind v4 untuk warna opacity', () => {
    // `.border-[#1b4f9c]/30` -> border-color:oklab(43.8773% -.026952 -.134465/.3)
    // Perhatikan: negatif tanpa `0`, dan `/` tanpa spasi sebelum alpha.
    near(toPlainColor('oklab(43.8773% -.026952 -.134465/.3)'), 27, 79, 156, 0.3)
    // `.bg-[#2ca84a]/10` -> oklab(64.4329% -.143844 .0923359/.1)
    near(toPlainColor('oklab(64.4329% -.143844 .0923359/.1)'), 44, 168, 74, 0.1)
  })

  it('color-mix dengan transparent dan currentcolor', () => {
    // `divide-*` Tailwind: warna asli tetap, alphanya saja yang jadi 0.5.
    const ctx = { currentColor: () => 'oklch(57.7% .245 27.325)' }
    near(toPlainColor('color-mix(in oklab, currentcolor 50%, transparent)', ctx), 231, 0, 11, 0.5)
    // Tanpa konteks, `currentcolor` tidak bisa diselesaikan: biarkan apa adanya.
    expect(toPlainColor('color-mix(in oklab, currentcolor 50%, transparent)')).toBeNull()
    // Hitungan alpha: 50% full + 50% transparan = 0.5.
    near(toPlainColor('color-mix(in srgb, #ff0000 50%, transparent)'), 255, 0, 0, 0.5)
  })

  it('color-mix dicampur di ruang yang diminta', () => {
    // `in srgb` (default CSS) = rata-rata channel gamma-encoded.
    near(toPlainColor('color-mix(in srgb, rgb(255, 0, 0) 50%, rgb(0, 0, 255))'), 128, 0, 128)
    near(toPlainColor('color-mix(in srgb, #ff0000 25%, #ffffff)'), 255, 191, 191)
    near(toPlainColor('color-mix(in srgb, #000000, #ffffff)'), 128, 128, 128)
    // Porsi yang tidak disebut eksplisit memakai sisanya, bukan bobot 1:
    // `red 25%, white` = 25/75, bukan 25/75 lalu sisa dibagi rata.
    near(toPlainColor('color-mix(in srgb, #ff0000 25%, #000000)'), 64, 0, 0)
    // Porsi eksplisit yang tidak genap 100% dinormalkan proporsional.
    near(toPlainColor('color-mix(in srgb, #000000 25%, #ffffff 25%)'), 128, 128, 128)
    // Tanpa `in`, CSS tetap memakai srgb.
    near(toPlainColor('color-mix(#000000, #ffffff)'), 128, 128, 128)
  })

  it('color-mix di ruang perseptual', () => {
    // Rata-rata di linear light jauh lebih terang daripada rata-rata channel
    // gamma-encoded; kalau keduanya sama, berarti ruang campur diabaikan.
    const linear = toPlainColor('color-mix(in srgb-linear, #000000 50%, #ffffff)')
    const srgb = toPlainColor('color-mix(in srgb, #000000 50%, #ffffff)')
    expect(linear).not.toBe(srgb)
    near(linear!, 188, 188, 188)
    near(srgb!, 128, 128, 128)
    // oklab interpolate Oklab, jadi titik tengahnya bukan abu-abu netral.
    expect(toPlainColor('color-mix(in oklab, #ff0000, #0000ff)')).not.toBeNull()
    expect(toPlainColor('color-mix(in lab, #ff0000, #0000ff)')).not.toBeNull()
  })

  it('warna yang bukan modern dikembalikan null', () => {
    expect(toPlainColor('rgb(1, 2, 3)')).toBeNull()
    expect(toPlainColor('#1b4f9c')).toBeNull()
    expect(toPlainColor('#fff')).toBeNull()
    expect(toPlainColor('transparent')).toBeNull()
  })

  it('input rusak tidak melempar error', () => {
    expect(toPlainColor('lab()')).toBeNull()
    expect(toPlainColor('lab(badan)')).toBeNull()
    expect(toPlainColor('color-mix(in srgb, #fff)')).toBeNull()
    expect(() => toPlainColor('oklab(1% 2% 3% / abc)')).not.toThrow()
  })
})

describe('hasModernColor', () => {
  it('mendeteksi fungsi modern dan mengabaikan yang biasa', () => {
    expect(hasModernColor('lab(1% 2% 3%)')).toBe(true)
    expect(hasModernColor('rgb(0, 0, 0)')).toBe(false)
    expect(hasModernColor('#d1fae5')).toBe(false)
  })
})

describe('replaceModernColors', () => {
  it('mengubah seluruh warna di dalam gradient', () => {
    const out = replaceModernColors('linear-gradient(to right, lab(96.5% 4.18 1.52), lab(48% 40 20))')
    expect(out).not.toMatch(/lab\(/)
    expect(out.startsWith('linear-gradient(to right, rgb(')).toBe(true)
    expect(out).toContain('), rgb(')
  })

  it('box-shadow berlapis tetap utuh strukturnya', () => {
    const out = replaceModernColors('0 1px 2px oklch(0% 0 0 / 0.1), 0 0 0 1px rgb(0, 0, 0)')
    expect(out).not.toMatch(/oklch\(/)
    expect(out.match(/rgba?\(/g)).toHaveLength(2)
    expect(out).toContain('0 1px 2px ')
  })

  it('nilai tanpa warna modern tidak berubah sama sekali', () => {
    const input = 'linear-gradient(to right, #fff, #000)'
    expect(replaceModernColors(input)).toBe(input)
  })

  it('fungsi tak dikenal tidak ikut diubah', () => {
    const input = 'var(--color-red-500, lab(1% 2% 3%))'
    expect(replaceModernColors(input)).toBe(input)
  })
})