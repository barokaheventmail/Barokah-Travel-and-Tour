import { describe, expect, it } from 'vitest'
import {
  defaultFrontLayout,
  emptyFrontLayout,
  parseFrontLayout,
  serializeFrontLayout,
  validateFrontLayout,
} from './front'

describe('defaultFrontLayout', () => {
  it('Driver di pojok kanan, Crew di kolom paling kiri', () => {
    expect(defaultFrontLayout(4)).toEqual({ driver: 3, crew: 0, tl: null })
  })

  it('kalau cuma satu kolom, Crew tidak dipasang', () => {
    expect(defaultFrontLayout(1)).toEqual({ driver: 0, crew: null, tl: null })
  })

  it('tanpa kolom kosong semua', () => {
    expect(defaultFrontLayout(0)).toEqual({ driver: null, crew: null, tl: null })
  })
})

describe('parseFrontLayout', () => {
  it('membaca posisi yang valid', () => {
    expect(parseFrontLayout('{"driver":3,"crew":0}', 4)).toEqual({ driver: 3, crew: 0, tl: null })
  })

  it('membaca posisi TL', () => {
    expect(parseFrontLayout('{"driver":3,"crew":0,"tl":2}', 4)).toEqual({ driver: 3, crew: 0, tl: 2 })
  })

  it('membuang posisi di luar grid', () => {
    expect(parseFrontLayout('{"driver":9,"crew":1}', 4)).toEqual({ driver: null, crew: 1, tl: null })
  })

  it('Driver & Crew tidak boleh satu kolom — Crew yang dibuang', () => {
    expect(parseFrontLayout('{"driver":2,"crew":2}', 4)).toEqual({ driver: 2, crew: null, tl: null })
  })

  it('TL yang bentrok dengan Driver/Crew dibuang (prioritas driver > crew > tl)', () => {
    expect(parseFrontLayout('{"tl":2,"crew":2}', 4)).toEqual({ driver: null, crew: 2, tl: null })
    expect(parseFrontLayout('{"driver":1,"tl":1}', 4)).toEqual({ driver: 1, crew: null, tl: null })
  })

  it('json rusak atau kosong jadi kosong', () => {
    expect(parseFrontLayout('bukan json', 4)).toEqual(emptyFrontLayout())
    expect(parseFrontLayout(null, 4)).toEqual(emptyFrontLayout())
    expect(parseFrontLayout('[1,2]', 4)).toEqual(emptyFrontLayout())
  })
})

describe('serializeFrontLayout', () => {
  it('kosong tersimpan sebagai null', () => {
    expect(serializeFrontLayout(emptyFrontLayout())).toBeNull()
  })

  it('round-trip lewat parse', () => {
    const value = serializeFrontLayout({ driver: 2, crew: 0, tl: null })
    expect(parseFrontLayout(value, 4)).toEqual({ driver: 2, crew: 0, tl: null })
  })

  it('round-trip dengan TL lewat parse', () => {
    const value = serializeFrontLayout({ driver: 3, crew: 0, tl: 2 })
    expect(parseFrontLayout(value, 4)).toEqual({ driver: 3, crew: 0, tl: 2 })
  })
})

describe('validateFrontLayout', () => {
  it('menerima posisi dalam grid', () => {
    const v = validateFrontLayout({ driver: 3, crew: 0, tl: 2 }, 4)
    expect(v.error).toBeUndefined()
    expect(v.front).toEqual({ driver: 3, crew: 0, tl: 2 })
  })

  it('menolak posisi di luar grid', () => {
    expect(validateFrontLayout({ driver: 5 }, 4).error).toBeTruthy()
    expect(validateFrontLayout({ crew: 5 }, 4).error).toBeTruthy()
    expect(validateFrontLayout({ tl: 5 }, 4).error).toBeTruthy()
  })

  it('menolak dua slot di kolom yang sama', () => {
    expect(validateFrontLayout({ driver: 1, crew: 1 }, 4).error).toBeTruthy()
    expect(validateFrontLayout({ crew: 1, tl: 1 }, 4).error).toBeTruthy()
    expect(validateFrontLayout({ driver: 1, tl: 1 }, 4).error).toBeTruthy()
  })

  it('undefined berarti tidak dipasang', () => {
    const v = validateFrontLayout(undefined, 4)
    expect(v.error).toBeUndefined()
    expect(v.front).toEqual(emptyFrontLayout())
  })
})
