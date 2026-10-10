'use client'

import { useEffect, useState } from 'react'

export function SlideshowBg({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState<boolean[]>(Array(images.length).fill(false))
  const hasImages = images.length > 0

  useEffect(() => {
    if (!hasImages) return
    const img = new Image()
    img.src = images[0]
    img.onload = () => setLoaded((prev) => { const next = [...prev]; next[0] = true; return next })
  }, [hasImages, images])

  useEffect(() => {
    if (!hasImages || images.length < 2) return
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % images.length
        const img = new Image()
        img.src = images[next]
        img.onload = () => setLoaded((prev) => { const n = [...prev]; n[next] = true; return n })
        return next
      })
    }, 10000)
    return () => clearInterval(timer)
  }, [hasImages, images.length])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Warna fallback saat gambar belum load */}
      <div className="absolute inset-0 bg-[#091f44]" />
      {hasImages ? (
        images.map((url, i) => (
          <div
            key={url}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              i === index && loaded[i] ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: loaded[i]
                ? `linear-gradient(90deg, rgba(9,31,68,.82), rgba(9,31,68,.25)), url('${url}')`
                : undefined,
            }}
          />
        ))
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d2850] to-[#163d78]" />
      )}
    </div>
  )
}