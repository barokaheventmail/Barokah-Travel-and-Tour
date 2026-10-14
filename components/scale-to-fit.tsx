'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Menampilkan isi pada tinggi yang tersedia (kotak harus punya tinggi pasti,
 * mis. lewat `flex-1`). Kalau isi lebih tinggi dari kotak, isi dikecilkan
 * otomatis dengan `transform: scale()` supaya muat — tanpa scroll dan tanpa
 * terpotong. Lebar isi dikompensasi (`100% / scale`) agar tetap penuh.
 *
 * Dipakai untuk mengecilkan HANYA tabel denah kamar/VW, sementara judul,
 * logo, dan foto crew di section tetap ukuran normal.
 */
export function ScaleToFit({ children, className }: { children: ReactNode; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = boxRef.current
    const inner = innerRef.current
    if (!box || !inner) return

    let frame = 0

    const apply = () => {
      const available = box.clientHeight
      if (available <= 0) return
      inner.style.transform = 'none'
      inner.style.width = '100%'
      const natural = inner.scrollHeight
      const scale = natural > available && natural > 0 ? available / natural : 1
      if (scale < 1) {
        inner.style.width = `${100 / scale}%`
        inner.style.transformOrigin = 'top left'
        inner.style.transform = `scale(${scale})`
      } else {
        inner.style.width = ''
        inner.style.transform = ''
      }
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(apply)
    }

    apply()

    const ro = new ResizeObserver(schedule)
    ro.observe(box)

    const mo = new MutationObserver(schedule)
    mo.observe(inner, { childList: true, subtree: true, characterData: true })

    const onAsset = () => schedule()
    inner.addEventListener('load', onAsset, true)
    inner.addEventListener('error', onAsset, true)

    window.addEventListener('resize', schedule)
    document.fonts?.ready.then(schedule).catch(() => {})

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      mo.disconnect()
      inner.removeEventListener('load', onAsset, true)
      inner.removeEventListener('error', onAsset, true)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <div ref={boxRef} className={`scale-fit relative overflow-hidden ${className ?? ''}`}>
      <div ref={innerRef} className="absolute inset-x-0 top-0">
        {children}
      </div>
    </div>
  )
}
