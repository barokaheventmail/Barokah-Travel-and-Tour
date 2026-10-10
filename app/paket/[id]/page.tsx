import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check, MapPin, Package } from 'lucide-react'
import { Footer, Logo } from '@/components/site'
import { PaketAlbumView } from '@/components/paket-album-view'
import { prisma } from '@/lib/db'
import { renderRichText } from '@/lib/rich-text'

export const revalidate = 60

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const paket = await prisma.paketEvent.findUnique({ where: { id } })
  return {
    title: paket ? `${paket.title} | Barokah Tour and Travel` : 'Paket Event | Barokah Tour and Travel',
    description:
      paket?.description?.replace(/\*+/g, '').slice(0, 160) || 'Rincian paket event wisata Barokah Tour and Travel.',
  }
}

export default async function PaketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paket = await prisma.paketEvent.findUnique({
    where: { id },
    include: { prices: { orderBy: { order: 'asc' } }, images: { orderBy: { order: 'asc' } } },
  })
  if (!paket) notFound()

  return (
    <main className="min-h-screen bg-[#f4f7fa]">
      <header className="sticky top-0 z-[70] bg-gradient-to-r from-[#071e3d] via-[#0d2850] to-[#163d78] text-white shadow-[0_12px_34px_-20px_rgba(9,32,74,0.95)]">
        <div className="container-wide flex h-[76px] items-center justify-between">
          <Logo light className="h-12 w-auto" />
          <Link
            href="/paket"
            className="group flex shrink-0 items-center gap-2 text-[13px] font-bold text-white transition-colors duration-200 hover:text-[#f5b915]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0d2850] transition-transform duration-300 ease-out group-hover:-translate-x-0.5">
              <ArrowLeft size={15} strokeWidth={2.5} />
            </span>
            <span className="hidden md:inline">Kembali</span>
          </Link>
        </div>
      </header>

      <section className="relative w-full overflow-hidden text-white">
        <div className="absolute inset-0">
          {paket.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={paket.imageUrl} alt={paket.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0d2850] to-[#163d78] text-white/30">
              <Package size={56} />
            </div>
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#091f44]/90 via-[#091f44]/45 to-[#091f44]/10" />
        </div>

        <div className="container-wide relative flex min-h-[440px] items-end px-4 pb-12 pt-24 sm:min-h-[520px] lg:min-h-[600px]">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight tracking-[-0.03em] md:text-5xl">
              {paket.title}
            </h1>
            {paket.location && (
              <p className="mt-3 flex items-center gap-2 text-base font-semibold text-white/85">
                <MapPin size={18} className="shrink-0 text-[#f5b915]" /> {paket.location}
              </p>
            )}
            {paket.description && (
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80">
                {renderRichText(paket.description)}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="container-wide px-4 pt-10 pb-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="max-w-3xl">
          {(paket.subtitle || paket.body) && (
            <div className="mb-8">
              {paket.subtitle && (
                <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#1b3555]">{paket.subtitle}</h2>
              )}
              {paket.body && (
                <div className="mt-3 text-[15px] leading-[1.9] text-[#44576d]">{renderRichText(paket.body)}</div>
              )}
            </div>
          )}

          {paket.prices.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-[#1b3555]">Daftar Harga</h3>
              <div className="mt-4 grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))] sm:gap-4">
                {paket.prices.map((p) => {
                  const facilities = Array.isArray(p.facilities) ? (p.facilities as string[]) : []
                  return (
                    <div
                      key={p.id}
                      className="relative flex h-full min-h-[7rem] flex-col items-start justify-start overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white px-5 py-5 text-left shadow-[0_10px_30px_-22px_rgba(27,53,85,0.3)] transition-all duration-300 ease-out hover:z-10 hover:scale-[1.05] hover:border-[#f5b915]/70 hover:shadow-[0_22px_45px_-20px_rgba(27,53,85,0.45)]"
                    >
                      {p.badge && (
                        <span className="pointer-events-none absolute -right-10 top-4 rotate-45 bg-[#f5b915] px-10 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1d2733] shadow-[0_6px_14px_-6px_rgba(245,185,21,0.9)]">
                          {p.badge}
                        </span>
                      )}
                      <p className="text-lg font-bold leading-snug text-[#1b3555]">{p.label}</p>
                      <p className="mt-1 text-2xl font-extrabold text-[#1b4f9c]">{formatRupiah(p.price)}</p>
                      {facilities.length > 0 && (
                        <ul className="mt-3 w-full space-y-1.5 border-t border-[#eef1f4] pt-3">
                          {facilities.map((facility, fi) => (
                            <li key={fi} className="flex items-start gap-1.5 text-sm leading-snug text-[#4a5568]">
                              <Check size={15} className="mt-0.5 shrink-0 text-[#1b9c5a]" />
                              <span>{facility}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          </div>

          {paket.images.length > 0 && (
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <PaketAlbumView images={paket.images} />
            </aside>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}