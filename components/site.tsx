'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, MapPin, Menu, Phone, Star, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Logo({ light=false, className='h-10 w-auto' }: { light?: boolean; className?: string }) {
  // `light` = dipakai di atas latar gelap (navbar & footer beranda). Logo 1
  // aslinya bertinta navy gelap, jadi mustahil terbaca di sana (~1.2-1.9:1),
  // sementara logo 2 sudah putih + emas sejak desainnya -- cocok untuk navy
  // (putih 10.6-16.3:1). Permukaan terang (/panduan, /event, admin, not-found)
  // memakai logo 1 yang gelap, karena logo 2 putih akan hilang di atas putih.
  return (
    <Link href="/" aria-label="Barokah Tour and Travel" className="flex shrink-0 items-center">
      <img
        src={light ? '/logo-barokah-event-2.png' : '/logo-barokah-event.png'}
        alt="Barokah Tour and Travel"
        width={640}
        height={213}
        className={`${className} object-contain`}
      />
    </Link>
  )
}

// Anchor harus relatif ("#event") saat navbar berada di beranda, karena section
//-nya ada di halaman itu. Di halaman lain (mis. detail event) anchor relatif
// akan jadi "/event/[id]#event" -- hash yang tidak ada elemennya, jadi kliknya
// diam saja. Karena itu href-nya bisa dipaksa absolut lewat homeAnchors={false}.
const NAV_LINKS = [
  { label: 'Beranda', anchor: 'beranda' },
  { label: 'Event', anchor: 'event' },
  { label: 'Tentang Kami', href: '/#tentang' },
  { label: 'Kontak', anchor: 'kontak' },
] as const

function navHref(link: (typeof NAV_LINKS)[number], homeAnchors: boolean) {
  if ('href' in link) return link.href
  return homeAnchors ? `#${link.anchor}` : `/#${link.anchor}`
}

export function Navbar({ alwaysSolid = false, homeAnchors = true }: { alwaysSolid?: boolean; homeAnchors?: boolean }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // alwaysSolid: untuk halaman berlatar terang (mis. detail event) yang tidak
  // punya banner gelap di belakang -- gradasi harus langsung tampil agar teks
  // putih tetap terbaca, bukan menunggu scroll.
  const solid = alwaysSolid || scrolled

  const links = NAV_LINKS.map((l) => [l.label, navHref(l, homeAnchors)] as const)

  return (
    <header className="fixed inset-x-0 top-0 z-[70] text-white">
      {/* Lapisan gradasi mewah: navy tua -> brand blue.
          Dipakai sebagai span terpisah (bukan background pada header) supaya
          gradasi bisa dianimasikan -- background-image tidak bisa dianimasikan
          oleh transition-colors.
          Efek masuk: panel gradasi turun dari atas (-translate-y-full -> 0)
          sambil fade in. Logo & menu sengaja tidak ikut bergerak, hanya
          latarnya yang turun. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-[#071e3d] via-[#0d2850] to-[#163d78] transition-[opacity,transform] duration-700 ease-out ${
          solid
            ? 'translate-y-0 opacity-100 shadow-[0_12px_34px_-20px_rgba(9,32,74,0.95)] backdrop-blur-md'
            : '-translate-y-full opacity-0'
        }`}
      />
      <div className="container-wide relative flex h-[76px] items-center justify-between">
        <Logo light />
        <nav className="desktop-nav flex items-center gap-7 text-sm font-semibold">
          {links.map(([label, href]) => (
            <Link key={label} href={href} onClick={()=>setOpen(false)} className="group relative inline-block whitespace-nowrap text-sm font-semibold transition-colors duration-300 hover:text-[#f5b915]">
              <span aria-hidden className="invisible tracking-widest">{label}</span>
              <span className="absolute inset-0 flex items-center justify-center tracking-normal transition-[letter-spacing] duration-300 ease-out group-hover:tracking-widest">
                {label}
              </span>
              <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-center scale-x-0 rounded-full bg-[#f5b915] transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>
        <a href="https://wa.me/6285930005544" className="group hidden items-center gap-2 rounded-full bg-gradient-to-r from-[#f9dc8c] via-[#f5b915] to-[#d9a40c] px-4 py-2.5 text-[13px] font-bold text-[#1d2733] shadow-[0_8px_20px_-12px_rgba(245,185,21,0.95)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-12px_rgba(245,185,21,1)] hover:brightness-105 sm:flex"><Phone size={14} className="transition-transform duration-300 group-hover:-rotate-12"/> Hubungi Kami</a>
        <button type="button" className="relative z-[70] flex h-10 w-10 items-center justify-center sm:hidden" onClick={()=>setOpen(!open)} aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open}>
          <span className={`absolute transition-all duration-300 ${open ? 'rotate-90 scale-75 opacity-0' : 'opacity-100'}`}><Menu /></span>
          <span className={`absolute transition-all duration-300 ${open ? 'opacity-100' : '-rotate-90 opacity-0'}`}><X /></span>
        </button>
      </div>
      <div className={`fixed inset-0 z-50 bg-[#09204a]/50 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={()=>setOpen(false)} aria-hidden />
      <nav className={`absolute left-0 right-0 top-[76px] z-[60] mx-auto w-[min(1120px,calc(100%-2rem))] rounded-2xl border border-[#dfe4e8] bg-white p-4 text-[#1d2733] shadow-2xl transition-all duration-300 sm:hidden ${open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'}`}>
        <div className="flex flex-col divide-y divide-[#f1f3f5] text-sm font-semibold">
          {links.map(([label, href]) => (
            <Link key={label} href={href} onClick={()=>setOpen(false)} className="-mx-3 rounded-lg px-3 py-3 transition-colors duration-200 hover:bg-[#f1f3f5]">{label}</Link>
          ))}
        </div>
        <a href="https://wa.me/6285930005544" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#f5b915] px-4 py-2.5 text-sm font-bold text-[#1d2733] transition-colors duration-200 hover:bg-[#e4aa09]"><Phone size={15}/> Hubungi Kami</a>
      </nav>
    </header>
  )
}

export function BackLink({ href='/', label='Kembali' }: { href?: string; label?: string }) {
  return <Link href={href} className="group inline-flex w-fit items-center gap-2.5 rounded-full bg-gradient-to-r from-[#071e3d] via-[#0d2850] to-[#163d78] px-5 py-2.5 text-[13px] font-bold tracking-wide text-white shadow-[0_10px_26px_-14px_rgba(13,40,80,0.9)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-14px_rgba(13,40,80,1)]">
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f5b915] text-[#1d2733] transition-transform duration-300 ease-out group-hover:-translate-x-0.5">
      <ArrowLeft size={13} strokeWidth={2.5} />
    </span>
    {label}
  </Link>
}

export function SectionHeading({ label, title, text }: { label:string; title:string; text?:string }) { return <div className="mb-9 max-w-2xl"><p className="eyebrow mb-2">{label}</p><h2 className="text-3xl font-bold text-[#1b3555] md:text-4xl">{title}</h2>{text&&<p className="mt-3 leading-relaxed text-[#657080]">{text}</p>}</div> }

function TrustLogo({ src, fallback }: { src: string; fallback: React.ReactNode }) {
  const [loaded, setLoaded] = useState(true)
  if (!loaded) return <span className="flex h-12 items-center whitespace-nowrap font-bold text-[#1b4f9c]">{fallback}</span>
  return (
    <span className="flex h-12 shrink-0 items-center">
      <img src={src} alt="" className="h-10 w-auto max-w-full object-contain" onError={() => setLoaded(false)} />
    </span>
  )
}

function TrustItems() {
  return (
    <>
      <TrustLogo src="/logo-asita.png" fallback={<>ASITA</>} />
      <TrustLogo src="/logo-wonderful.png" fallback={<span className="text-[#2ca84a]">Wonderful Indonesia</span>} />
      <TrustLogo src="/logo-barokah.png" fallback={<>Barokah Tour & Travel</>} />
    </>
  )
}

const TRUST_COPIES = 5
const ITEMS_PER_GROUP = 4

export function TrustStrip() {
  return (
    <section className="trust-strip border-y border-[#dfe4e8] bg-white py-7" aria-label="Mitra dan izin resmi">
      <div className="trust-marquee">
        <div className="trust-marquee-track">
          {Array.from({ length: TRUST_COPIES }, (_, i) => (
            <div className="trust-marquee-group" key={i} aria-hidden={i !== 0}>
              {Array.from({ length: ITEMS_PER_GROUP }, (_, j) => (
                <TrustItems key={j} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SocialIcon({ name }: { name: 'youtube' | 'tiktok' | 'instagram' }) {
  if (name === 'youtube') return (
    <span className="relative block h-7 w-7">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className="absolute inset-0 h-7 w-7 text-white/70 transition-all duration-300 group-hover:opacity-0 group-hover:scale-110" aria-hidden>
        <rect x="2" y="5.6" width="20" height="12.8" rx="3.6" />
        <path d="m10.2 9.3 4.6 2.7-4.6 2.7z" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-7 w-7 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" aria-hidden>
        <rect x="2" y="5.6" width="20" height="12.8" rx="3.6" fill="#FF0000" />
        <path d="m10.2 9.4 4.8 2.6-4.8 2.6z" fill="#fff" />
      </svg>
    </span>
  )
  if (name === 'tiktok') return (
    <span className="relative block h-7 w-7">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="absolute inset-0 h-7 w-7 text-white/70 transition-all duration-300 group-hover:opacity-0 group-hover:scale-110" aria-hidden>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-7 w-7 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" aria-hidden>
        <defs>
          <linearGradient id="ttGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#25F4EE" />
            <stop offset="100%" stopColor="#FE2C55" />
          </linearGradient>
        </defs>
        <path fill="url(#ttGrad)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    </span>
  )
  return (
    <span className="relative block h-7 w-7">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className="absolute inset-0 h-7 w-7 text-white/70 transition-all duration-300 group-hover:opacity-0 group-hover:scale-110" aria-hidden>
        <rect x="2.2" y="2.2" width="19.6" height="19.6" rx="5.4" />
        <circle cx="12" cy="12" r="4.4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-7 w-7 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" aria-hidden>
        <defs>
          <linearGradient id="igGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="20%" stopColor="#F58529" />
            <stop offset="45%" stopColor="#DD2A7B" />
            <stop offset="75%" stopColor="#8134AF" />
            <stop offset="100%" stopColor="#515BD4" />
          </linearGradient>
        </defs>
        <rect x="2.2" y="2.2" width="19.6" height="19.6" rx="5.4" fill="url(#igGrad)" />
        <circle cx="12" cy="12" r="4.4" fill="none" stroke="#fff" strokeWidth="2.2" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="#fff" />
      </svg>
    </span>
  )
}

const SOCMED = [
  { name: 'instagram' as const, label: 'Instagram', href: '#' },
  { name: 'tiktok' as const, label: 'TikTok', href: '#' },
  { name: 'youtube' as const, label: 'YouTube', href: '#' },
]

export function Footer(){return <footer id="kontak" className="bg-[#163d78] py-12 text-white"><div className="container-wide grid gap-10 md:grid-cols-[1.4fr_1fr_1.2fr]"><div><Logo light/><p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">Mitra perjalanan terpercaya dari Sukabumi untuk menjelajah Indonesia bersama keluarga, sekolah, dan perusahaan.</p><div className="mt-5 flex items-center gap-3">{SOCMED.map((s) => (<a key={s.name} href={s.href} aria-label={s.label} className="group flex h-9 w-9 items-center justify-center transition-transform duration-300 hover:-translate-y-0.5"><SocialIcon name={s.name} /></a>))}</div></div><div><h3 className="mb-4 font-sans text-sm font-bold uppercase tracking-wider">Tautan Cepat</h3><div className="flex flex-col gap-3 text-sm text-white/70"><Link href="/#event">Event Wisata</Link><Link href="/panduan">Panduan Peserta</Link><Link href="/#tentang">Tentang Kami</Link></div></div><div><h3 className="mb-4 font-sans text-sm font-bold uppercase tracking-wider">Hubungi Kami</h3><div className="space-y-2 text-sm text-white/70"><p>Graha Barokah, Jl. Cisaat Sukamanah, Kab. Sukabumi 43152</p><p>0859-3000-5544 / 0857-3122-2878</p><p>adminbarokahtour@gmail.com</p></div></div></div><div className="container-wide mt-10 border-t border-white/15 pt-5 text-xs text-white/50">© {new Date().getFullYear()} PT. Bina Barokah Sejahtera. Semua hak dilindungi.</div></footer>}

export function BookingBar({ price = 'Rp 425.000' }: { price?: string }) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const footer = document.getElementById('kontak')
    if (!footer) return
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])
  return <><div className={`fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-[#dfe4e8] bg-white p-3 shadow-lg transition-transform duration-300 md:hidden ${hidden ? 'translate-y-full' : ''}`}><div><p className="text-[11px] text-[#657080]">Mulai dari</p><strong className="text-[#1b4f9c]">{price}</strong></div><a href="https://wa.me/6285930005544" className="rounded-md bg-[#f5b915] px-4 py-2.5 text-sm font-bold">Pesan via WhatsApp</a></div><div className={`fixed right-8 bottom-8 z-20 hidden transition-opacity duration-300 md:block ${hidden ? 'pointer-events-none opacity-0' : 'opacity-100'}`}><a href="https://wa.me/6285930005544" className="flex items-center gap-2 rounded-md bg-[#f5b915] px-5 py-3 font-bold shadow-lg"><Phone size={17}/> Konsultasi Sekarang</a></div></>
}

export { Check, ChevronDown, Clock3, MapPin, Star, Users, ArrowRight }
