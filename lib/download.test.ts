import { describe, it, expect } from 'vitest'
import { needsInlinePdfViewer } from './download'

describe('needsInlinePdfViewer', () => {
  it('HP dan tablet Android pakai viewer PDF, bukan anchor download', () => {
    const android =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'
    expect(needsInlinePdfViewer({ ua: android, maxTouchPoints: 5 })).toBe(true)
  })

  it('iPhone pakai viewer PDF walau titik sentuh belum dilaporkan', () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    expect(needsInlinePdfViewer({ ua: iphone, maxTouchPoints: 0 })).toBe(true)
  })

  it('iPadOS yang menyamar jadi Macintosh tetap pakai viewer PDF', () => {
    const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    expect(needsInlinePdfViewer({ ua: ipad, maxTouchPoints: 5 })).toBe(true)
  })

  it('Mac sentuh satu titik tetap pakai anchor download', () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    expect(needsInlinePdfViewer({ ua: mac, maxTouchPoints: 1 })).toBe(false)
  })

  it('desktop pada umumnya pakai anchor download', () => {
    expect(
      needsInlinePdfViewer({
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        maxTouchPoints: 10,
      }),
    ).toBe(false)
  })
})
