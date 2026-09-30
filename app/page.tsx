import type { Metadata } from 'next'
import { Phone } from 'lucide-react'
import { BannerSlideshow } from '@/components/banner-slideshow'
import { Footer, Navbar, TrustStrip } from '@/components/site'
import { TicketSearch } from '@/components/ticket-search'
import { EventSearchGrid } from '@/components/event-search-grid'
import { prisma } from '@/lib/db'
import { formatTanggalPendek } from '@/lib/dates'

export const metadata: Metadata = {
  title: 'Barokah Tour and Travel | Event & Perjalanan dari Sukabumi',
  description:
    'Event wisata, study tour, persewaan transportasi wisata, dan tiket. Agen resmi Ancol dan mitra ASITA dari Sukabumi.',
  openGraph: {
    title: 'Barokah Tour and Travel | Jelajahi Indonesia',
    description: 'Rencanakan perjalanan nyaman dan berkesan bersama Barokah Tour and Travel dari Sukabumi.',
    type: 'website',
  },
}

// Halaman di-cache dan di-refresh tiap 60 detik (ISR)
// Jauh lebih ringan dari force-dynamic yang query DB tiap request
export const revalidate = 60

const layanan = [
  'Tour Package Domestik dan Mancanegara',
  'Study Tour, Study Banding, Kunjungan Kerja, KKL, MICE, EO, atau WO',
  'Wisata Nusantara dan Mancanegara',
  'Persewaan Transportasi Wisata',
  'Transport Organizer',
  'Tiket Pesawat / Kereta Api',
  'Agen Resmi PT. Taman Impian Jaya Ancol',
]

export default async function Home() {
  const events = await prisma.event.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { date: 'desc' },
    include: { _count: { select: { buses: true, participants: true } } },
  })

  return (
    <main>
      <section id="beranda" className="relative min-h-[650px] text-white">
        <BannerSlideshow />
        <Navbar />
        <div className="container-wide flex min-h-[650px] items-center pb-12 pt-28">
          <div className="max-w-2xl">
            <p className="animate-fade-up delay-1 eyebrow !text-[#f5b915]">Teman perjalanan keluarga Indonesia</p>
            <h1 className="animate-fade-up delay-2 mt-4 text-5xl font-bold leading-[1.08] md:text-7xl">
              Jelajahi Indonesia, <em className="font-serif italic font-normal text-[#f5b915]">lebih bermakna.</em>
            </h1>
            <p className="animate-fade-up delay-3 mt-5 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              Pilih event di bawah untuk melihat rincian bus &amp; peserta. Pencarian nama untuk melihat tiket &amp; QR ada di
              halaman tiap event.
            </p>
            <div className="animate-fade-up delay-4 relative z-50">
              <TicketSearch />
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section id="event" className="relative overflow-hidden border-t border-[#eae7dd] py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 44% 38% at 6% 0%, rgba(245,185,21,0.16) 0%, rgba(245,185,21,0) 70%), radial-gradient(ellipse 50% 46% at 100% 100%, rgba(27,53,85,0.10) 0%, rgba(27,53,85,0) 72%)',
          }}
        />
        <div className="container-wide relative">
          <EventSearchGrid events={events} />
        </div>
      </section>

      <div className="relative overflow-hidden bg-[#edf5ef]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-96"
          style={{ backgroundImage: 'radial-gradient(ellipse 130% 100% at 50% 0%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(ellipse 55% 50% at 100% 0%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(ellipse 90% 85% at 0% 100%, rgba(44,168,74,0.16) 0%, rgba(44,168,74,0) 72%)' }}
        />
        <section id="tentang" className="relative py-24">
          <div className="container-wide relative grid gap-14 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <div>
              <p className="eyebrow mb-2">Tentang Kami</p>
              <h2 className="text-3xl font-bold leading-tight text-[#1b3555] md:text-4xl">
                Barokah Tour <span className="font-serif italic text-[#2ca84a]">&</span> Travel
              </h2>
            </div>
            <p className="leading-relaxed text-[#657080]">
              Barokah Tour & Travel adalah jasa pariwisata yang berada di bawah naungan PT. Bina Barokah Sejahtera dengan lisensi:
            </p>
            <p className="leading-relaxed text-[#657080]">
              Kami membantu perjalanan wisata, pendidikan, dan perusahaan dengan pelayanan yang amanah dan profesional.
            </p>
            <div className="relative overflow-hidden rounded-2xl border border-[#dce8e1] bg-white/90 p-7 shadow-[0_24px_60px_-32px_rgba(27,53,85,0.4)] backdrop-blur">
<h3 className="text-lg font-bold text-[#1b3555]">Lisensi &amp; Data Resmi</h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                <li className="text-[#44576d]"><span><strong className="font-semibold text-[#1b3555]">Penanggung jawab:</strong> Rizal Bahtiar, S.Psi.</span></li>
                <li className="text-[#44576d]"><span><strong className="font-semibold text-[#1b3555]">Akta Notaris:</strong> AHU-0045694.AH.01.012018</span></li>
                <li className="text-[#44576d]"><span><strong className="font-semibold text-[#1b3555]">SIUP, TDUP, NIB:</strong> 8120004912783</span></li>
                <li className="text-[#44576d]"><span><strong className="font-semibold text-[#1b3555]">ASITA:</strong> 0704/IX/DPP/2018</span></li>
                <li className="text-[#44576d]"><span><strong className="font-semibold text-[#1b3555]">Alamat:</strong> Graha Barokah Jl. Cisaat Sukamanah, Kec. Cisaat, Kab. Sukabumi (43152)</span></li>
                <li className="text-[#44576d]"><span><strong className="font-semibold text-[#1b3555]">No. Telepon:</strong> (0266) 230-408 / 0859 3000 5544</span></li>
                <li className="text-[#44576d]"><span><strong className="font-semibold text-[#1b3555]">E-mail:</strong> admbarokahtour@gmail.com</span></li>
                <li className="text-[#44576d]"><span><strong className="font-semibold text-[#1b3555]">Website:</strong> www.barokahtour.com</span></li>
              </ul>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <p className="eyebrow mb-2">Yang kami tawarkan</p>
              <h2 className="text-3xl font-bold leading-tight text-[#1b3555] md:text-4xl">
                Layanan <span className="font-serif italic text-[#1b4f9c]">Kami</span>
              </h2>
            </div>
            <p className="leading-relaxed text-[#657080]">
              Semua kebutuhan perjalanan Anda, dari wisata, edukasi, hingga transportasi, dapat diandalkan bersama kami.
            </p>
            <ul className="grid max-w-[460px] gap-3.5">
              {layanan.map((item) => (
                <li
                  key={item}
                  className="group rounded-xl border border-[#dce8e1] bg-white/80 px-4 py-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5b915]/70 hover:shadow-[0_16px_40px_-18px_rgba(27,53,85,0.35)]"
                >
                  <p className="text-sm font-semibold leading-relaxed text-[#1b3555]">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </section>

        <section className="container-wide relative py-12">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a4a8a] via-[#163d78] to-[#0e2b55] px-5 py-12 shadow-2xl shadow-[#163d78]/25 sm:px-6 md:px-12 md:py-16">
          <div className="guide-pattern absolute inset-0 opacity-30" aria-hidden />

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#f5b915]/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#2ca84a]/10 blur-3xl" aria-hidden />

          <div className="absolute -bottom-20 -right-16 hidden h-64 w-64 rounded-full border-[22px] border-white/5 md:block" aria-hidden />
          <div className="absolute bottom-10 right-8 hidden h-24 w-24 rounded-full border border-dashed border-white/15 lg:block" aria-hidden />

          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div>
              <p className="eyebrow !text-[#f5b915]">Butuh bantuan?</p>
              <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:whitespace-nowrap md:text-4xl">
                Rencanakan Perjalanan <span className="font-serif italic text-[#f5b915]">Bersama Kami</span>
              </h2>
              <p className="mt-2 text-white/75">Tim Barokah siap membantu menjawab kebutuhan perjalanan Anda.</p>
            </div>
            <a
              href="https://wa.me/6285930005544"
              className="group flex w-full shrink-0 items-center justify-center gap-2.5 rounded-full bg-[#f5b915] px-7 py-3.5 text-sm font-bold text-[#1d2733] shadow-lg shadow-[#f5b915]/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e4aa09] hover:shadow-xl hover:shadow-[#f5b915]/40 active:scale-95 sm:w-auto"
            >
              <Phone size={16} className="transition-transform duration-200 group-hover:-rotate-12" />
              Chat via WhatsApp
            </a>
          </div>
        </div>
        </section>
      </div>

      <Footer />
    </main>
  )
}