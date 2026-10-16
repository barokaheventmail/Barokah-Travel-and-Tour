'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Halaman panduan memakai <main> sebagai kontainer scroll (bukan window), jadi
// posisi scroll dihitung dari elemen yang benar-benar bergulir.
function getScrollTop(): number {
  if (typeof window === 'undefined') return 0
  const main = document.querySelector('main')
  const mainTop = main instanceof HTMLElement ? main.scrollTop : 0
  const docTop = document.scrollingElement?.scrollTop ?? window.scrollY
  return Math.max(mainTop, docTop)
}

function getScroller(): HTMLElement | null {
  if (typeof window === 'undefined') return null
  const main = document.querySelector('main')
  if (main instanceof HTMLElement && getComputedStyle(main).overflowY !== 'visible') return main
  return null
}

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const onScroll = () => setVisible(getScrollTop() > 400)
    onScroll()
    // `scroll` tidak bubble, tapi tetap melewati fase capture sehingga listener
    // di document menangkap scroll dari <main> maupun window.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  const scrollToTop = () => {
    const scroller = getScroller()
    const start = getScrollTop()
    if (start <= 0) return
    const duration = Math.min(1000, 300 + start * 0.4)
    const startTime = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const value = start * (1 - easeInOutCubic(progress))
      if (scroller) {
        scroller.scrollTo({ top: value })
      } else {
        window.scrollTo(0, value)
      }
      if (progress < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }

  return (
    <button
      type="button"
      aria-label="Kembali ke atas"
      onClick={scrollToTop}
      className={`fixed bottom-24 right-5 z-[80] flex h-12 w-12 items-center justify-center rounded-full bg-[#f5b915] text-[#1d2733] shadow-[0_12px_30px_-10px_rgba(245,185,21,0.9)] transition-all duration-200 hover:-translate-y-1 hover:bg-[#e4aa09] active:scale-95 print:hidden ${
        visible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp size={20} />
    </button>
  )
}
