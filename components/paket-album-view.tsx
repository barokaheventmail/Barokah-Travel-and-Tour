'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'

type AlbumImage = { id: string; url: string }

export function PaketAlbumView({ images }: { images: AlbumImage[] }) {
  const [active, setActive] = useState<number | null>(null)
  const total = images.length
  const open = active !== null
  const INITIAL = 8
  const hasMore = total > INITIAL

  const close = useCallback(() => setActive(null), [])
  const go = useCallback(
    (dir: number) => setActive((prev) => (prev === null ? prev : (prev + dir + total) % total)),
    [total],
  )

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.classList.add('gallery-lightbox-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
      document.body.classList.remove('gallery-lightbox-open')
    }
  }, [open, close, go])

  if (total === 0) return null

  const lightbox =
    open && active !== null ? (
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 p-4"
        onClick={close}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Tutup"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X size={20} />
        </button>
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                go(-1)
              }}
              aria-label="Sebelumnya"
              className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                go(1)
              }}
              aria-label="Berikutnya"
              className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
        <div
          className="flex h-[80vh] w-[92vw] max-w-5xl items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active].url}
            alt=""
            className="h-full w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
          {active + 1} / {total}
        </span>
      </div>
    ) : null

  return (
    <>
      <div className="rounded-2xl border border-[#dfe4e8] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(27,53,85,0.3)]">
        <h3 className="flex items-center gap-2 text-base font-bold text-[#1b3555]">
          <Images size={17} className="text-[#1b4f9c]" /> Gallery
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {images.map((img, i) => {
            if (i >= INITIAL) return null
            const isLastVisible = hasMore && i === INITIAL - 1
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-[#e6e9ec] bg-[#f4f7fa]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {isLastVisible ? (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/60 text-white transition-colors duration-200 group-hover:bg-black/70">
                    <span className="text-lg font-bold leading-none">+{total - INITIAL}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">Lihat Lainnya</span>
                  </span>
                ) : (
                  <span className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/15" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {typeof document !== 'undefined' && lightbox ? createPortal(lightbox, document.body) : null}
    </>
  )
}
