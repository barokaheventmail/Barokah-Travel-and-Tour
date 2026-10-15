import { describe, expect, it } from 'vitest'
import { parseBusIds, resolveScope } from './target-scope'

describe('resolveScope', () => {
  it('menjadi "all" saat applyToAll true', () => {
    expect(resolveScope(true, ['b2', 'b3'], 'b1')).toEqual({ targetIds: null, scope: 'all' })
  })

  it('hanya unit aktif saat tanpa id terpilih', () => {
    expect(resolveScope(false, [], 'b1')).toEqual({ targetIds: ['b1'], scope: 'one' })
  })

  it('unit aktif + id terpilih saat beberapa id dikirim', () => {
    expect(resolveScope(false, ['b2', 'b3'], 'b1')).toEqual({ targetIds: ['b2', 'b3', 'b1'], scope: 'selected' })
  })

  it('membuang duplikat dan tetap menyertakan unit aktif', () => {
    expect(resolveScope(false, ['b1', 'b1', 'b2'], 'b1')).toEqual({ targetIds: ['b1', 'b2'], scope: 'selected' })
  })

  it('memperlakukan satu id terpilih yang sama dengan unit aktif sebagai "one"', () => {
    expect(resolveScope(false, ['b1'], 'b1')).toEqual({ targetIds: ['b1'], scope: 'one' })
  })
})

describe('parseBusIds', () => {
  it('mengembalikan array kosong untuk nilai kosong / invalid', () => {
    expect(parseBusIds(null)).toEqual([])
    expect(parseBusIds('')).toEqual([])
    expect(parseBusIds('{bukan json')).toEqual([])
    expect(parseBusIds('{"a":1}')).toEqual([])
  })

  it('hanya menerima string dan menyaring non-string', () => {
    expect(parseBusIds('["b1",2,null,"b2"]')).toEqual(['b1', 'b2'])
  })

  it('membatasi maksimal 2000 id', () => {
    const many = JSON.stringify(Array.from({ length: 2500 }, (_, i) => `b${i}`))
    expect(parseBusIds(many)).toHaveLength(2000)
  })
})
