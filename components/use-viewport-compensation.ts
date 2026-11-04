'use client'

import { useEffect, useState } from 'react'

/**
 * Faktor kompensasi untuk halaman yang memakai viewport lebih lebar dari layar
 * (mis. panduan peserta dengan `width=834`). Saat browser mengecilkan seluruh
 * halaman agar pas di HP, tombol mengambang (WA & kembali ke atas) ikut
 * mengecil. Faktor ini membesarkannya kembali supaya ukurannya tetap normal
 * seperti di halaman lain.
 */
export function useViewportCompensation(): number {
  const [factor, setFactor] = useState(1)

  useEffect(() => {
    const update = () => {
      const scale = window.visualViewport?.scale ?? 1
      setFactor(scale > 0 && scale < 1 ? Math.min(1 / scale, 4) : 1)
    }

    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return factor
}
