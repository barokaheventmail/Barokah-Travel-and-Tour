import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PANDUAN_FONT_SIZES,
  PANDUAN_FONT_FIELDS,
  panduanFontStyleVars,
  parsePanduanFontSizes,
  serializePanduanFontSizes,
} from './panduan-font'

describe('panduan font sizes', () => {
  it('memakai satu ukuran untuk semua judul utama halaman', () => {
    expect(PANDUAN_FONT_FIELDS).toContainEqual({
      key: 'pageTitle',
      label: 'Judul Utama Halaman',
      varName: '--panduan-page-title-delta',
    })
    const keys: string[] = PANDUAN_FONT_FIELDS.map((field) => field.key)
    expect(keys).not.toContain('itineraryTitle')
    expect(keys).not.toContain('denahDudukTitle')

    const sizes = parsePanduanFontSizes(JSON.stringify({ sectionHeading: 4, pageTitle: -3 }))
    expect(sizes.sectionHeading).toBe(4)
    expect(sizes.pageTitle).toBe(-3)

    const vars = panduanFontStyleVars(sizes) as Record<string, string>
    expect(vars['--panduan-section-heading-delta']).toBe('4px')
    expect(vars['--panduan-page-title-delta']).toBe('-3px')
  })

  it('memakai nilai 0 bila data lama belum punya kunci pageTitle', () => {
    const sizes = parsePanduanFontSizes(JSON.stringify({ sectionHeading: 2, itineraryTitle: 9 }))
    expect(sizes.pageTitle).toBe(DEFAULT_PANDUAN_FONT_SIZES.pageTitle)
    expect(sizes.sectionHeading).toBe(2)
    expect(serializePanduanFontSizes(DEFAULT_PANDUAN_FONT_SIZES)).toBeNull()
  })
})
