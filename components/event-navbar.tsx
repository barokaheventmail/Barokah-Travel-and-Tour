'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Menu, X } from 'lucide-react'
import { Logo } from '@/components/site'
import { useViewportCompensation } from '@/components/use-viewport-compensation'

export function EventNavbar({ eventId, variant = 'event' }: { eventId: string; variant?: 'event' | 'panduan' }) {
  const [open, setOpen] = useState(false)
  const isPanduan = variant === 'panduan'
  const backHref = isPanduan ? `/event/${eventId}` : '/#event'
  const compensation = useViewportCompensation()

  return (
    <header className="sticky top-0 z-[70] border-b border-[#e3e8ee] bg-white/85 backdrop-blur-md">
      <div
        className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3"
        style={{
          height: `${64 * compensation}px`,
          paddingLeft: `${16 * compensation}px`,
          paddingRight: `${16 * compensation}px`,
        }}
      >
        <div style={{ transform: `scale(${compensation})`, transformOrigin: 'left center' }}>
          <Logo className="h-12 w-auto" />
        </div>

        {!isPanduan && (
          <Link
            href={`/event/${eventId}/panduan`}
            className="hidden shrink-0 rounded-full px-3 py-2 text-[13px] font-bold text-[#1d2733] transition-colors duration-200 hover:text-[#0d2850] sm:inline-block"
          >
            Panduan Peserta
          </Link>
        )}

        <Link
          href={backHref}
          style={{ transform: `scale(${compensation})`, transformOrigin: 'right center' }}
          className={`group shrink-0 items-center gap-2 text-[13px] font-bold text-[#1d2733] transition-colors duration-200 hover:text-[#0d2850] ${
            isPanduan ? 'flex' : 'hidden sm:flex'
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d2850] text-white transition-transform duration-300 ease-out group-hover:-translate-x-0.5">
            <ArrowLeft size={15} strokeWidth={2.5} />
          </span>
          <span className="hidden md:inline">Kembali</span>
        </Link>

        {!isPanduan && (
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center sm:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
          >
            <span className={`absolute transition-all duration-300 ${open ? 'rotate-90 scale-75 opacity-0' : 'opacity-100'}`}>
              <Menu />
            </span>
            <span className={`absolute transition-all duration-300 ${open ? 'opacity-100' : '-rotate-90 opacity-0'}`}>
              <X />
            </span>
          </button>
        )}
      </div>

      {!isPanduan && (
        <nav
          aria-label="Menu event"
          className={`absolute left-0 right-0 top-full z-[60] mx-auto w-[min(720px,calc(100%-2rem))] divide-y divide-[#eef1f4] rounded-2xl border border-[#dfe4e8] bg-white p-2 text-[#1d2733] shadow-2xl transition-all duration-300 sm:hidden ${
            open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
          }`}
        >
          <Link
            href={`/event/${eventId}/panduan`}
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-3 text-sm font-bold transition-colors duration-200 hover:bg-[#f1f3f5]"
          >
            Panduan Peserta
          </Link>
          <Link
            href={backHref}
            onClick={() => setOpen(false)}
            className="group flex items-center gap-2.5 px-4 py-3 text-sm font-bold transition-colors duration-200 hover:bg-[#f1f3f5]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0d2850] text-white transition-transform duration-300 ease-out group-hover:-translate-x-0.5">
              <ArrowLeft size={13} strokeWidth={2.5} />
            </span>
            Kembali
          </Link>
        </nav>
      )}
    </header>
  )
}