import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Dancing_Script } from 'next/font/google'
import { BookOpen, Clock3, Download, MapPin, Phone, QrCode } from 'lucide-react'
import { prisma } from '@/lib/db'
import { parseItineraryDoc, groupItineraryByDay } from '@/lib/itinerary'
import { DEFAULT_PANDUAN_RULES, parsePanduanRules } from '@/lib/panduan-rules'
import { qrDataUrl, encodeToken } from '@/lib/scan'
import { Logo } from '@/components/site'
import { EventNavbar } from '@/components/event-navbar'
import { PublicSeatMap } from '@/components/public-seat-map'
import { PublicRoomMap } from '@/components/public-room-map'
import { PublicVwMap } from '@/components/public-vw-map'
import { PrintButton } from '@/components/admin/print-button'

export const dynamic = 'force-dynamic'

const latinScript = Dancing_Script({
  subsets: ['latin'],
  weight: '700',
  display: 'swap',
})

const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatDate(date: Date): string {
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function PanduanHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="inline-flex text-lg font-bold uppercase tracking-widest text-white">
      <span className="relative inline-flex items-center py-1.5 pl-4 pr-9 drop-shadow-xl">
        <span
          aria-hidden
          className="absolute inset-0 bg-[#00A3E0]"
          style={{ clipPath: 'polygon(0 0, calc(100% - 1rem) 0, 100% 100%, 0 100%)' }}
        />
        <span className="relative">{children}</span>
      </span>
    </h2>
  )
}

function SectionLogos({
  logoLeft,
  logoRight,
  topRight,
  topRight2,
}: {
  logoLeft: string
  logoRight: string
  topRight: string | null
  topRight2: string | null
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoLeft} alt="Logo Barokah" className="h-8 w-auto object-contain" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoRight} alt="Logo Barokah Event" className="h-8 w-auto object-contain" />
      </div>
      <div className="flex items-center gap-3">
        {topRight && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={topRight} alt="Logo" className="h-8 w-auto object-contain" />
        )}
        {topRight2 && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={topRight2} alt="Logo" className="h-8 w-auto object-contain" />
        )}
      </div>
    </div>
  )
}

async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, date: true, location: true, panduanItinerary: true, panduanRules: true, crewName: true, crewPhone: true, crewRole: true, crewPhotoUrl: true, denahKamarCrewName: true, denahKamarCrewRole: true, denahKamarCrewPhotoUrl: true, denahVwCrewName: true, denahVwCrewRole: true, denahVwCrewPhotoUrl: true, panduanLogoLeft: true, panduanLogoRight: true, panduanLogoTopRight: true, panduanLogoTopRight2: true },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const event = await getEvent(id)
  return { title: `Panduan Peserta – ${event?.title ?? 'Event'} | Barokah Tour and Travel`, robots: { index: false } }
}

export default async function EventPanduanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const event = await getEvent(id)
  if (!event) notFound()

  const participantToken = (sp.token ?? '').trim().slice(0, 200)
  const participant = participantToken
    ? await prisma.participant.findUnique({
        where: { token: participantToken },
        select: { id: true, eventId: true, busId: true, seat: true, room: true, vw: true, name: true, token: true, ticketCode: true },
      })
    : null
  const ownBus = participant && participant.eventId === id ? participant : null

  const buses = await prisma.bus.findMany({
    where: { eventId: id },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  })

  const ownBusName = ownBus ? (buses.find((b) => b.id === ownBus.busId)?.name ?? null) : null
  const ownQr = ownBus ? await qrDataUrl(encodeToken(ownBus.token), 320) : null

  const { rows: itinerary, notes: itineraryNotes, sideNotes: itinerarySideNotes, footerNote: itineraryFooterNote } = parseItineraryDoc(event.panduanItinerary)
  const dayGroups = groupItineraryByDay(itinerary, itineraryNotes, itinerarySideNotes)
  const isEmpty = itinerary.length === 0 && Object.keys(itineraryNotes).length === 0 && Object.keys(itinerarySideNotes).length === 0
  const multiDay = dayGroups.length > 1
  const logoLeftUrl = event.panduanLogoLeft ?? '/logo-barokah.png'
  const logoRightUrl = event.panduanLogoRight ?? '/logo-barokah-event.png'

  return (
    <main className="print-guide min-h-screen bg-[#f4f7fa] print:bg-white pb-12">
      <div className="print:hidden">
        <EventNavbar eventId={event.id} variant="panduan" />
      </div>

      {isEmpty ? (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e3e8ee]">
            <BookOpen size={26} className="text-[#657080]" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-[#1b3555]">Panduan Belum Tersedia</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#657080]">
            Panduan untuk {event.title} akan segera hadir. Hubungi panitia bila ada pertanyaan.
          </p>
        </div>
      ) : (
        <>
          <div className="border-b border-[#dfe4e8] px-4 py-10 print:hidden">
            <div className="mx-auto max-w-2xl px-4">
              <p className="eyebrow">Perjalanan Anda</p>
              <h1 className="mt-2 text-3xl font-bold text-[#1b3555]">{event.title}</h1>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#657080]">
                <span className="flex items-center gap-1">
                  <Clock3 size={15} className="text-[#2ca84a]" /> {formatDate(event.date)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={15} className="text-[#2ca84a]" /> {event.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div id="panduan-isi" className="mx-auto max-w-2xl space-y-4 px-4 py-7">
            {/* Kop dokumen. `hidden print:block` = tak terlihat di layar tapi
                ikut tercetak lewat Print; `data-pdf-only` = downloader
                menghidupkannya lagi supaya ikut jadi sampul PDF. */}
            <div className="hidden print:block print:break-after-page" data-pdf-only>
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <div className="print-avoid-break overflow-hidden rounded-xl border border-[#dfe4e8] bg-white">
                <div className="h-1.5 bg-[#f5b915]" />
                <div className="flex flex-wrap items-start justify-between gap-6 p-5">
                  <div className="min-w-0 flex-1">
                    <Logo className="h-10 w-auto" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b08700]">
                      Panduan Peserta
                    </p>
                    <h1 className="mt-1 text-xl font-bold leading-tight text-[#1b3555]">{event.title}</h1>
                    <div className="mt-3 flex flex-col gap-1.5 text-[11px] text-[#657080]">
                      <span className="flex items-center gap-1.5">
                        <Clock3 size={12} className="text-[#2ca84a]" /> {formatDate(event.date)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-[#2ca84a]" /> {event.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {ownBus && (
                    <div className="flex shrink-0 items-start gap-4">
                      <dl className="text-right text-[11px]">
                        <dt className="font-bold uppercase tracking-wide text-[#9aa3af]">Peserta</dt>
                        <dd className="mt-0.5 text-sm font-bold text-[#1b3555]">{ownBus.name}</dd>
                        {ownBus.ticketCode && (
                          <>
                            <dt className="mt-1.5 font-bold uppercase tracking-wide text-[#9aa3af]">No. Tiket</dt>
                            <dd className="font-bold text-[#1b4f9c]">{ownBus.ticketCode}</dd>
                          </>
                        )}
                        <dt className="mt-1.5 font-bold uppercase tracking-wide text-[#9aa3af]">Unit / Kursi</dt>
                        <dd className="font-bold text-[#1b4f9c]">
                          {ownBusName ?? '—'}
                          {ownBus.seat ? ` · No ${ownBus.seat}` : ''}
                        </dd>
                      </dl>
                      {ownQr && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={ownQr} alt={`QR absensi ${ownBus.name}`} className="h-24 w-24" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>


            <section className="pdf-plain print-avoid-break border border-[#dfe4e8] bg-white p-5 print:break-after-page print:min-h-[272mm] print:border-0 print:bg-transparent print:p-0">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <h2 className="text-3xl font-extrabold uppercase tracking-wide text-[#f5b915]">Our Vision and Mission</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="inline-block border-2 border-[#e0b200] bg-[url('/Bg-7-bagian-panduan.png')] bg-cover bg-center px-3 pt-1 pb-5 text-sm font-bold uppercase tracking-wide text-[#1b4f9c] [clip-path:polygon(0_0,100%_0,100%_100%,calc(100%_-_12px)_calc(100%_-_14px),0_calc(100%_-_14px))]">
                    Our Vision
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1b3555]">
                    Menjadi biro perjalanan terkemuka dengan menciptakan produk-produk berkualitas yang berbasis budaya dan pendidikan dalam rangka pengembangan pariwisata.
                  </p>
                </div>

                <div>
                  <h3 className="inline-block border-2 border-[#e0b200] bg-[url('/Bg-7-bagian-panduan.png')] bg-cover bg-center px-3 pt-1 pb-5 text-sm font-bold uppercase tracking-wide text-[#1b4f9c] [clip-path:polygon(0_0,100%_0,100%_100%,calc(100%_-_12px)_calc(100%_-_14px),0_calc(100%_-_14px))]">
                    Our Mission
                  </h3>
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#1b3555]">
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ca84a]" />
                      Ikut menjaga keajegan Pariwisata yang berlandaskan Budaya dengan mengemas paket-paket wisata yang berkualitas dengan penekanan pada pelayanan yang ramah, sopan dan jujur.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ca84a]" />
                      Mendayagunakan seluruh sumber daya yang tersedia bagi upaya pengembangan perusahaan yang berkesinambungan demi tercapainya kepuasan bagi 4 (empat) stake holder penunjang terlaksananya kegiatan usaha yaitu : pelanggan, karyawan, perusahaan dan para partner kerja.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ca84a]" />
                      Mengembangkan pariwisata berbasis kerakyatan dengan memberdayakan kelompok-kelompok masyarakat seperti kelompok petani, nelayan, peternak dan pengerajin yang disinergikan dengan membuat paket-paket wisata yang berhubungan dengan kegiatan kelompok-kelompok masyarakat tersebut.
                    </li>
                  </ul>
                </div>

                <div className="border-t border-[#dfe4e8] pt-4">
                  <h3 className="text-3xl font-extrabold uppercase tracking-wide text-[#f5b915]">Ujung Tombak</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1b3555]">
                    Tantangan terberat yang dihadapi adalah tantangan dalam memberikan pelayanan terbaik kepada setiap customer. Tanggung jawab terberat untuk memberikan pelayanan terbaik itu ada pada ujung tombak yang setiap hari berinteraksi dengan customer. Mereka ini dibekali dengan suatu pemahaman bahwa sebagai ujung tombak bagi perusahaan haruslah memiliki hati yang tulus dan pikiran yang jernih, karena hanya dengan ketulusan dan kejernihan kita dapat melayani dengan baik.
                  </p>
                </div>

                <div className="text-center">
                  <p className={`${latinScript.className} text-3xl leading-tight text-[#f5b915]`}>
                    &ldquo;Your Satisfaction Is Our Pride&rdquo;
                  </p>
                </div>
              </div>
            </section>

            <section className="print-avoid-break space-y-6 rounded-[0.8rem] border border-[#e0b200] bg-[#f5b915] p-5 print:break-after-page print:min-h-[272mm]">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Doa Bepergian Jauh</h2>
              <div>
                <p className="mt-3 text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ ۝ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ
                </p>
                <p className="mt-2 text-sm leading-relaxed text-black">
                  “Mahasuci Allah yang telah menundukkan semua ini bagi kami, padahal kami sebelumnya tidak mampu
                  menguasainya. Dan sesungguhnya kami akan kembali kepada Tuhan kami.”
                </p>
                <p className="mt-4 text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى وَمِنَ الْعَمَلِ مَا تَرْضَى،
                  اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي
                  السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ
                </p>
                <p className="mt-2 text-sm leading-relaxed text-black">
                  “Ya Allah, kami memohon kepada-Mu kebaikan dan ketakwaan dalam perjalanan ini, serta amal yang Engkau
                  ridhai. Ya Allah, mudahkanlah perjalanan kami ini dan dekatkanlah jaraknya. Ya Allah, Engkaulah teman
                  dalam perjalanan dan penjaga keluarga kami.”
                </p>
              </div>

              <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Tata Cara Salat Jamak</h2>
              <div>
                <p className="text-sm leading-relaxed text-black">
                  Salat jamak adalah menggabungkan dua salat fardu dalam satu waktu karena sedang dalam perjalanan
                  (safar). Salat yang boleh dijamak adalah Zuhur dengan Asar, serta Maghrib dengan Isya.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-black">
                  <strong>Jamak takdim</strong> — menggabungkan dua salat pada waktu salat yang pertama (misalnya Zuhur
                  dan Asar dikerjakan di waktu Zuhur). <br />
                  <strong>Jamak takhir</strong> — menggabungkan dua salat pada waktu salat yang kedua (misalnya Zuhur
                  dan Asar dikerjakan di waktu Asar).
                </p>
                <p className="mt-3 text-sm leading-relaxed text-black">
                  Dalam safar, salat juga boleh di<strong>qashar</strong>, yaitu meringkas salat yang berjumlah empat
                  rakaat (Zuhur, Asar, Isya) menjadi dua rakaat.
                </p>
              </div>

              <div>
                <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Tata Cara Salat Jamak Takdim</h2>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Salat Zuhur</h3>
                <p className="mt-1 text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّي فَرْضَ الظُّهْرِ أَرْبَعَ رَكَعَاتٍ مَجْمُوعًا إِلَيْهِ الْعَصْرُ أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm italic leading-relaxed text-black" dir="ltr">
                  Ushalli fardhas-zuhri arba‘a raka‘atin majmu‘an ilaihil-ashru adaa-an lillahi ta‘aala
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat salat fardu Zuhur empat rakaat yang dijamak dengan Asar, karena Allah Ta’ala.”
                </p>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Salat Asar</h3>
                <p className="mt-1 text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّي فَرْضَ الْعَصْرِ أَرْبَعَ رَكَعَاتٍ مَجْمُوعًا إِلَى الظُّهْرِ أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm italic leading-relaxed text-black" dir="ltr">
                  Ushalli fardhal-ashri arba‘a raka‘atin majmu‘an ilaz-zuhri adaa-an lillahi ta‘aala
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat salat fardu Asar empat rakaat yang dijamak dengan Zuhur, karena Allah Ta’ala.”
                </p>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Urutan Mengerjakan</h3>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-black">
                  <li>Berniat salat Zuhur jamak takdim.</li>
                  <li>Kerjakan salat Zuhur empat rakaat lalu salam.</li>
                  <li>Berniat salat Asar jamak takdim.</li>
                  <li>Kerjakan salat Asar empat rakaat lalu salam.</li>
                </ol>
                <p className="mt-2 text-xs italic text-black">Keduanya dikerjakan berurutan pada waktu Zuhur.</p>
              </div>
            </section>

            <section className="print-avoid-break space-y-6 rounded-[0.8rem] border border-[#e0b200] bg-[#f5b915] p-5 print:break-after-page print:min-h-[272mm]">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <div>
                <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Tata Cara Salat Jamak Takdim dengan Qashar</h2>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Salat Zuhur</h3>
                <p className="mt-1 text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّي فَرْضَ الظُّهْرِ رَكْعَتَيْنِ قَصْرًا مَجْمُوعًا إِلَى الْعَصْرِ أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm italic leading-relaxed text-black" dir="ltr">
                  Ushalli fardhas-zuhri rak‘ataini qashran majmu‘an ilal-ashri adaa-an lillahi ta‘aala
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat salat fardu Zuhur dua rakaat qashar yang dijamak dengan Asar, karena Allah Ta’ala.”
                </p>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Salat Asar</h3>
                <p className="mt-1 text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّي فَرْضَ الْعَصْرِ رَكْعَتَيْنِ قَصْرًا مَجْمُوعًا إِلَى الظُّهْرِ أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm italic leading-relaxed text-black" dir="ltr">
                  Ushalli fardhal-ashri rak‘ataini qashran majmu‘an ilaz-zuhri adaa-an lillahi ta‘aala
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat salat fardu Asar dua rakaat qashar yang dijamak dengan Zuhur, karena Allah Ta’ala.”
                </p>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Urutan Mengerjakan</h3>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-black">
                  <li>Berniat salat Zuhur qashar jamak takdim.</li>
                  <li>Kerjakan salat Zuhur dua rakaat lalu salam.</li>
                  <li>Berniat salat Asar qashar jamak takdim.</li>
                  <li>Kerjakan salat Asar dua rakaat lalu salam.</li>
                </ol>
                <p className="mt-2 text-xs italic text-black">
                  Keduanya dikerjakan berurutan pada waktu Zuhur, masing-masing dua rakaat.
                </p>
              </div>

              <div>
                <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Tata Cara Salat Jamak Takhir dengan Qashar</h2>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Salat Zuhur</h3>
                <p className="mt-1 text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّي فَرْضَ الظُّهْرِ رَكْعَتَيْنِ قَصْرًا مَجْمُوعًا مَعَ الْعَصْرِ أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm italic leading-relaxed text-black" dir="ltr">
                  Ushalli fardhas-zuhri rak‘ataini qashran majmu‘an ma‘al-ashri adaa-an lillahi ta‘aala
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat salat fardu Zuhur dua rakaat qashar yang dijamak dengan Asar, karena Allah Ta’ala.”
                </p>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Salat Asar</h3>
                <p className="mt-1 text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّي فَرْضَ الْعَصْرِ رَكْعَتَيْنِ قَصْرًا مَجْمُوعًا إِلَى الظُّهْرِ أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm italic leading-relaxed text-black" dir="ltr">
                  Ushalli fardhal-ashri rak‘ataini qashran majmu‘an ilaz-zuhri adaa-an lillahi ta‘aala
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat salat fardu Asar dua rakaat qashar yang dijamak dengan Zuhur, karena Allah Ta’ala.”
                </p>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Urutan Mengerjakan</h3>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-black">
                  <li>Berniat salat Zuhur qashar jamak takhir.</li>
                  <li>Kerjakan salat Zuhur dua rakaat lalu salam.</li>
                  <li>Berniat salat Asar qashar jamak takhir.</li>
                  <li>Kerjakan salat Asar dua rakaat lalu salam.</li>
                </ol>
                <p className="mt-2 text-xs italic text-black">
                  Keduanya dikerjakan berurutan pada waktu Asar, masing-masing dua rakaat.
                </p>
              </div>
            </section>

            <section className="tt-bg print-avoid-break bg-gradient-to-r from-[#071e3d] via-[#0d2850] to-[#163d78] p-5 print:break-after-page print:min-h-[272mm]">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[#f5b915]">Tata Tertib</h2>
              <ol className="mt-4 space-y-3">
                {(() => {
                  const rules = event.panduanRules ? parsePanduanRules(event.panduanRules) : DEFAULT_PANDUAN_RULES
                  return rules.map((rule, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-[#f5b915]">
                      <span className="shrink-0 text-sm font-bold text-[#f5b915]">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="leading-relaxed">{rule.text}</p>
                        {rule.items && (
                          <ul className="mt-2 space-y-1.5">
                            {rule.items.map((item, j) => (
                              <li key={j} className="flex gap-2">
                                <span className="shrink-0 font-bold text-[#f5b915]">{'-'}</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))
                })()}
              </ol>

              {event.crewName && (
                <div className="mt-8 flex flex-col items-center pt-6 text-center">
                  <h3 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[#f5b915]">Crew on Duty</h3>
                  {event.crewPhotoUrl ? (
                    <div className="relative -mb-2 mt-4 flex h-28 w-28 shrink-0 items-center justify-center">
                      <span aria-hidden className="absolute -inset-4 rounded-full bg-white/70 blur-xl" />
                      <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full">
                        <img src={event.crewPhotoUrl} alt={event.crewName} className="h-full w-full object-cover" />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex h-28 w-28 shrink-0 items-center justify-center text-3xl font-bold text-[#f5b915]">
                      {event.crewName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <strong
                    className="relative z-[1] mt-1 inline-block bg-[#f5b915] px-7 py-1.5 text-base font-extrabold uppercase tracking-wide text-white"
                    style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 14px) 50%, 100% 100%, 0 100%, 14px 50%)' }}
                  >
                    {event.crewName}
                  </strong>
                  <span className="mt-1 text-sm font-bold uppercase tracking-wide text-[#f5b915]">
                    {event.crewRole || 'TOUR LEADER'}
                  </span>
                </div>
              )}
            </section>

            {dayGroups.length > 0 && (
              <section className="itinerary-bg print-avoid-break relative rounded-none border border-[#dfe4e8] bg-white p-5 print:break-after-page print:min-h-[272mm] print:border-0 print:p-0">
                <SectionLogos
                  logoLeft={logoLeftUrl}
                  logoRight={logoRightUrl}
                  topRight={event.panduanLogoTopRight}
                  topRight2={event.panduanLogoTopRight2}
                />
                <h3 className="mb-6 text-center text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">{event.title}</h3>
                <PanduanHeading>Itinerary Perjalanan</PanduanHeading>
                <div className="mt-6 space-y-6">
                  {dayGroups.map((group) => (
                    <div key={group.day}>
                      {(multiDay || group.sideNote) && (
                        <div className="mb-1.5 flex items-start gap-3">
                          <span className="shrink-0 text-xs font-bold uppercase text-[#00A3E0]">Day {group.day}</span>
                          {group.sideNote && <span className="whitespace-pre-wrap text-xs font-bold text-[#00A3E0]">{group.sideNote}</span>}
                        </div>
                      )}
                      {group.note && (
                        <p className="mb-2 whitespace-pre-wrap text-sm font-bold leading-relaxed text-[#00A3E0]">{group.note}</p>
                      )}
                      {group.rows.length > 0 && (
                      <div className="overflow-hidden rounded-none border-2 border-[#dfe4e8]">
                        <div className="grid grid-cols-[7rem_1fr] gap-0 bg-[#00A3E0] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white">
                          <span className="border-r-2 border-white/40 pr-4 text-center">Waktu</span>
                          <span className="pl-4 text-center">Agenda</span>
                        </div>
                        <div className="divide-y-2 divide-[#edf0f3]">
                          {group.rows.map((item, i) => (
                            <div
                              key={`${group.day}-${item.time}-${i}`}
                              className="grid grid-cols-[7rem_1fr] gap-0 px-4 py-3 transition-colors hover:bg-[#f8fafc]"
                            >
                              <span className="whitespace-nowrap border-r-2 border-[#dfe4e8] pr-4 text-xs font-medium tabular-nums text-[#1b4f9c]">{item.time}</span>
                              <span className={`pl-4 text-[#1b3555] ${item.bold ? 'text-[0.85rem] font-bold' : 'text-xs font-normal'} ${item.italic ? 'italic' : ''}`}>{item.agenda}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
                {itineraryFooterNote && (
                  <p className="mt-5 whitespace-pre-wrap text-xs font-bold italic text-black">{itineraryFooterNote}</p>
                )}
              </section>
            )}

            {buses.length > 0 && (
              <section className="border border-[#dfe4e8] bg-white p-5 print:min-h-[272mm]">
                <SectionLogos
                  logoLeft={logoLeftUrl}
                  logoRight={logoRightUrl}
                  topRight={event.panduanLogoTopRight}
                  topRight2={event.panduanLogoTopRight2}
                />
                <h2 className="mb-6 mt-12 text-center text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">Denah Duduk</h2>
                <PublicSeatMap
                  eventId={id}
                  buses={buses}
                  initialBusId={ownBus?.busId ?? null}
                  highlightSeat={ownBus?.seat ?? null}
                />
              </section>
            )}

            {buses.length > 0 && (
              <section className="border border-[#dfe4e8] bg-white p-5 print:min-h-[272mm]">
                <SectionLogos
                  logoLeft={logoLeftUrl}
                  logoRight={logoRightUrl}
                  topRight={event.panduanLogoTopRight}
                  topRight2={event.panduanLogoTopRight2}
                />
                <h2 className="mb-6 mt-12 text-center text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">Denah Kamar</h2>
                <PublicRoomMap eventId={id} highlightRoom={ownBus?.room ?? null} highlightName={ownBus?.name ?? null} />
                {(event.denahKamarCrewName || event.denahKamarCrewPhotoUrl) && (
                  <div className="mt-6 flex flex-col items-end pr-8 pt-4 text-center">
                    {event.denahKamarCrewPhotoUrl ? (
                      <div className="relative flex h-24 w-36 shrink-0 items-center justify-center">
                        <span aria-hidden className="absolute -inset-3 rounded-lg bg-white/70 blur-lg" />
                        <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-lg shadow-black/50">
                          <img src={event.denahKamarCrewPhotoUrl} alt={event.denahKamarCrewName ?? undefined} className="h-full w-full object-cover" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-24 w-36 shrink-0 items-center justify-center rounded-lg text-2xl font-bold text-[#f5b915] shadow-lg shadow-black/50">
                        {event.denahKamarCrewName?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <strong
                      className="relative z-[1] mt-3 block w-36 bg-[#f5b915] px-3 py-1 text-center text-sm font-extrabold uppercase tracking-wide text-white"
                      style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%)' }}
                    >
                      {event.denahKamarCrewName}
                    </strong>
                  </div>
                )}
              </section>
            )}

            {buses.length > 0 && (
              <section className="border border-[#dfe4e8] bg-white p-5 print:min-h-[272mm]">
                <SectionLogos
                  logoLeft={logoLeftUrl}
                  logoRight={logoRightUrl}
                  topRight={event.panduanLogoTopRight}
                  topRight2={event.panduanLogoTopRight2}
                />
                <h2 className="mb-6 mt-12 text-center text-xl font-extrabold uppercase tracking-wide text-[#00A3E0]">Denah VW</h2>
                <PublicVwMap eventId={id} highlightVw={ownBus?.vw ?? null} highlightName={ownBus?.name ?? null} />
                {(event.denahVwCrewName || event.denahVwCrewPhotoUrl) && (
                  <div className="mt-6 flex flex-col items-end pr-8 pt-4 text-center">
                    {event.denahVwCrewPhotoUrl ? (
                      <div className="relative flex h-24 w-36 shrink-0 items-center justify-center">
                        <span aria-hidden className="absolute -inset-3 rounded-lg bg-white/70 blur-lg" />
                        <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-lg shadow-black/50">
                          <img src={event.denahVwCrewPhotoUrl} alt={event.denahVwCrewName ?? undefined} className="h-full w-full object-cover" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-24 w-36 shrink-0 items-center justify-center rounded-lg text-2xl font-bold text-[#f5b915] shadow-lg shadow-black/50">
                        {event.denahVwCrewName?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <strong
                      className="relative z-[1] mt-3 block w-36 bg-[#f5b915] px-3 py-1 text-center text-sm font-extrabold uppercase tracking-wide text-white"
                      style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%)' }}
                    >
                      {event.denahVwCrewName}
                    </strong>
                  </div>
                )}
              </section>
            )}

            <section className="print:hidden">
              <div className="border border-[#dfe4e8] bg-white p-5 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4fb] text-[#1b4f9c]">
                  <Download size={20} />
                </span>
                <h2 className="mt-3 text-xl font-bold text-[#1b3555]">Cetak / Simpan PDF</h2>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#657080]">
                  Simpan seluruh isi panduan peserta — itinerary, tata tertib, doa, tata cara salat jamak
                  {ownBusName ? `, peta kursi & daftar nama ${ownBusName}` : ', peta kursi & daftar nama unit'}
                  , serta fasilitas unit — dalam satu file PDF untuk dibaca kapan saja, bahkan tanpa koneksi.
                </p>
                <div className="mt-4 flex flex-col items-center justify-center gap-3">
                  <PrintButton />
                </div>
                <p className="mx-auto mt-3 max-w-sm text-[11px] leading-relaxed text-[#9aa3af]">
                  Lewat tombol cetak: pilih{' '}
                  <strong className="text-[#657080]">Save as PDF / Simpan sebagai PDF</strong>,
                  kertas <strong className="text-[#657080]">A4</strong> tanpa margin tambahan.{' '}
                  {ownBus ? 'QR absensi di kop halaman juga ikut tercetak.' : ''}
                </p>
                <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#9aa3af]">
                  <span className="flex items-center gap-1">
                    <QrCode size={12} />_format A4_
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} />_lengkap_
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />_gratis & dapat dibuka offline_
                  </span>
                </p>
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  )
}
