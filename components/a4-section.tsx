'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Membungkus satu section panduan menjadi "lembar kertas" A4 (210 × 297 mm).
 *
 * Mode `fit="content"` (default): seluruh isi section dikecilkan otomatis
 * dengan `transform: scale()` bila melebihi satu halaman — dipakai untuk
 * section teks (visi misi, doa, tata tertib, itinerary). Bila isi section
 * dibungkus `[data-a4-body]`, hanya bagian itu yang dikecilkan; kop/logo di
 * atasnya (di luar wrapper) tetap ukuran asli agar sama besar di tiap section.
 *
 * Mode `fit="none"`: kotak tetap A4, tapi isi TIDAK di-scale di sini. Dipakai
 * section denah kamar/VW, yang hanya mengecilkan tabelnya saja (lewat
 * komponen <ScaleToFit>) sementara judul, logo, dan foto crew tetap normal.
 */
export function A4Section({
  children,
  fit = 'content',
}: {
  children: ReactNode
  fit?: 'content' | 'none'
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fit !== 'content') return
    const box = boxRef.current
    const inner = innerRef.current
    if (!box || !inner) return

    let frame = 0

    const apply = () => {
      const available = box.clientHeight
      if (available <= 0) return

      // Bila section menandai bagian isi dengan `[data-a4-body]`, hanya bagian
      // itu yang dikecilkan — kop/logo di atasnya dibiarkan ukuran aslinya
      // supaya tampil sama besar di semua section. Bila tidak ada, jatuh ke
      // perilaku lama (seluruh isi dikecilkan).
      const body = inner.querySelector<HTMLElement>('[data-a4-body]')
      if (body) {
        body.style.transform = 'none'
        body.style.width = '100%'
        const boxTop = box.getBoundingClientRect().top
        const bodyTop = body.getBoundingClientRect().top - boxTop
        const section = body.parentElement
        const padBottom = section ? parseFloat(getComputedStyle(section).paddingBottom) || 0 : 0
        const room = available - bodyTop - padBottom
        const natural = body.scrollHeight
        const scale = room > 0 && natural > room ? room / natural : 1
        if (scale < 1) {
          body.style.width = `${100 / scale}%`
          body.style.transformOrigin = 'top left'
          body.style.transform = `scale(${scale})`
        } else {
          body.style.width = ''
          body.style.transform = ''
        }
        return
      }

      // Ukur tinggi natural pada lebar penuh dulu.
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

    // Perubahan ukuran kotak (mis. lebar viewport / responsive).
    const ro = new ResizeObserver(schedule)
    ro.observe(box)

    // Perubahan isi (peta kursi/kamar dimuat async, baris bertambah, dsb.).
    const mo = new MutationObserver(schedule)
    mo.observe(inner, { childList: true, subtree: true, characterData: true })

    // Gambar (logo, foto crew) yang selesai dimuat mengubah tinggi isi.
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
  }, [fit])

  return (
    <div
      ref={boxRef}
      className={fit === 'none' ? 'a4-page a4-fit-none' : 'a4-page'}
      data-pdf-page
    >
      <div ref={innerRef} className={fit === 'none' ? 'a4-scale h-full' : 'a4-scale'}>
        {children}
      </div>
      {/* Banner info dekoratif di dasar tiap halaman (spasi-nya direservasi
          lewat `padding-bottom` section di globals.css). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Info%20area%20bawah%20Section.png"
        alt=""
        aria-hidden
        className="a4-footer"
      />
    </div>
  )
}
