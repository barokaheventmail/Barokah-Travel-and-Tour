import type { Metadata } from 'next'
import { Package } from 'lucide-react'
import { Footer, Navbar } from '@/components/site'
import { SlideshowBg } from '@/components/slideshow-bg'
import { PaketList } from '@/components/paket-list'
import { prisma } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Paket Event Wisata | Barokah Tour and Travel',
  description:
    'Jelajahi paket event wisata Barokah Tour and Travel: open trip, study tour, dan perjalanan grup dari Sukabumi. Pilih paket untuk melihat rincian lengkapnya.',
  openGraph: {
    title: 'Paket Event Wisata | Barokah Tour and Travel',
    description: 'Pilih paket event wisata terbaik bersama Barokah Tour and Travel dari Sukabumi.',
    type: 'website',
  },
}

export const revalidate = 60

export default async function PaketPage() {
  const pakets = await prisma.paketEvent.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })

  return (
    <main className="min-h-screen bg-[#f4f7fa]">
      <div className="relative pt-[76px]">
        <SlideshowBg images={[...new Set(pakets.map((p) => p.imageUrl).filter((u): u is string => Boolean(u)))]} />
        <Navbar alwaysSolid homeAnchors={false} />
        <div className="container-wide relative pb-16 pt-14 text-white">
          <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] md:text-5xl">
            Paket <span className="font-serif italic text-[#f5b915]">Event</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75">
            Pilih paket event perjalanan terbaik bersama Barokah Tour &amp; Travel dari Sukabumi.
          </p>
        </div>
      </div>

      <section className="container-wide relative -mt-4 py-14">
        {pakets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e0dccd] bg-white/60 p-14 text-center">
            <Package className="mx-auto text-[#c9c2ab]" size={30} />
            <p className="mx-auto mt-4 max-w-md text-lg font-bold text-[#1b3555]">Belum ada paket event</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#657080]">
              Admin akan segera menambahkan paket event wisata.
            </p>
          </div>
        ) : (
          <PaketList pakets={pakets} />
        )}
      </section>

      <Footer />
    </main>
  )
}