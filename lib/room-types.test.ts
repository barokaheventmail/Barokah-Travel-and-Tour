import { describe, expect, it } from 'vitest'
import { collectRoomTypeNames } from './room-types'

describe('collectRoomTypeNames', () => {
  it('membuang nilai kosong dan spasi', () => {
    expect(collectRoomTypeNames(['Twin', '  ', null, undefined, ''])).toEqual(['Twin'])
  })

  it('merapikan spasi di ujung', () => {
    expect(collectRoomTypeNames(['  Double  ', 'Triple'])).toEqual(['Double', 'Triple'])
  })

  it('menjaga urutan kemunculan pertama dan membuang duplikat', () => {
    expect(collectRoomTypeNames(['Twin', 'Double', 'Twin', 'Triple', 'Double'])).toEqual([
      'Twin',
      'Double',
      'Triple',
    ])
  })

  it('mengembalikan array kosong kalau tidak ada nilai', () => {
    expect(collectRoomTypeNames([])).toEqual([])
  })
})
