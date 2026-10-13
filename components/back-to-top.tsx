'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  const scrollToTop = () => {
    const start = window.scrollY
    if (start <= 0) return
    const duration = Math.min(1000, 300 + start * 0.4)
    const startTime = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      window.scrollTo(0, start * (1 - easeInOutCubic(progress)))
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
