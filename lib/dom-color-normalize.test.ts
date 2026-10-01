import { describe, expect, it } from 'vitest'
import { normalizeStyleValues } from './dom-color-normalize'

describe('normalizeStyleValues', () => {
  it('mengubah hanya properti yang memuat fungsi modern', () => {
    // Nilai diambil apa adanya dari CSS hasil build Tailwind v4 repo ini.
    const out = normalizeStyleValues({
      color: 'oklch(57.7% .245 27.325)',
      'background-color': 'oklab(64.4329% -.143844 .0923359/.1)',
      'border-top-color': 'rgb(0, 0, 0)',
    })
    expect(out).toEqual({
      color: 'rgb(231, 0, 11)',
      'background-color': 'rgba(44, 168, 74, 0.1)',
    })
  })

  it('menyentuh gradient dan shadow, bukan hanya warna solid', () => {
    const out = normalizeStyleValues({
      'background-image': 'linear-gradient(to right, oklch(95% .052 163.051), oklch(0% 0 0))',
      'box-shadow': '0 1px 2px color-mix(in srgb, #000 25%, #fff)',
    })
    expect(out['background-image']).not.toMatch(/oklch\(/)
    expect(out['background-image']).toContain('linear-gradient(to right, ')
    expect(out['box-shadow']).not.toMatch(/color-mix\(/)
  })

  it('mempertahankan nilai kosong dan non-warna', () => {
    expect(normalizeStyleValues({ color: '', 'background-color': 'transparent' })).toEqual({})
    expect(normalizeStyleValues({ width: '100px' })).toEqual({})
  })

  it('custom property tidak ditulis ulang', () => {
    // `var()` masih menyimpan raw value; menyentuhnya justru merusak var().
    const out = normalizeStyleValues({ color: 'var(--x, oklch(0% 0 0))' })
    expect(out).toEqual({})
  })
})