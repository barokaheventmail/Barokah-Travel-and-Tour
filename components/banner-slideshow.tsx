'use client'

import { useEffect, useMemo, useState } from 'react'

// Gambar bawaan saat admin belum mengunggah banner khusus.
// Dioptimasi: ukuran lebih kecil (1200px), kualitas 70, format WebP otomatis via Next.js.
const DEFAULT_BANNERS = [
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1566559532224-6d65e9fc0f37?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1587651687979-77cf05d1b841?auto=format&fit=crop&w=1200&q=70',
]

function loadImage(url: string, onLoad: () => void) {
  const img = new Image()
  img.src = url
  img.onload = onLoad
}

export function BannerSlideshow({ images = [] }: { images?: string[] }) {
  const banners = useMemo(() => (images.length > 0 ? images : DEFAULT_BANNERS), [images])
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState<boolean[]>(() => banners.map(() => false))

  useEffect(() => {
    setIndex(0)
    setLoaded(banners.map(() => false))
    loadImage(banners[0], () =>
      setLoaded((prev) => {
        const next = [...prev]
        next[0] = true
        return next
      }),
    )
  }, [banners])

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % banners.length
        loadImage(banners[next], () =>
          setLoaded((prev) => {
            const n = [...prev]
            n[next] = true
            return n
          }),
        )
        return next
      })
    }, 10000)
    return () => clearInterval(timer)
  }, [banners])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[#091f44]" />
      {banners.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            i === index && loaded[i] ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: loaded[i]
              ? `linear-gradient(90deg, rgba(9,31,68,.82), rgba(9,31,68,.25)), url('${url}')`
              : undefined,
          }}
        />
      ))}
    </div>
  )
}
