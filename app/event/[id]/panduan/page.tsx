import { notFound } from 'next/navigation'
import type { Metadata, Viewport } from 'next'
import { Fragment, type ReactNode } from 'react'
import { Dancing_Script } from 'next/font/google'
import { BookOpen, Clock3, Download, MapPin, Phone, QrCode } from 'lucide-react'
import { prisma } from '@/lib/db'
import { parseItineraryDoc, groupItineraryByDay } from '@/lib/itinerary'
import { vehicleLabel, vehicleSectionTitle } from '@/lib/participant-groups'
import { DEFAULT_PANDUAN_RULES, parsePanduanRules } from '@/lib/panduan-rules'
import { effectiveCrewList } from '@/lib/crew'
import { parsePanduanSections, splitSectionItems, type CustomSectionItem } from '@/lib/panduan-sections'
import { qrDataUrl, encodeToken } from '@/lib/scan'
import { Logo } from '@/components/site'
import { SectionLogos } from '@/components/section-logos'
import { PublicHeading } from '@/components/public-heading'
import { EventNavbar } from '@/components/event-navbar'
import { PublicSeatMap } from '@/components/public-seat-map'
import { PublicRoomMap } from '@/components/public-room-map'
import { PublicVwMap } from '@/components/public-vw-map'
import { PublicItinerary } from '@/components/public-itinerary'
import { PrintButton } from '@/components/admin/print-button'
import { BackToTop } from '@/components/back-to-top'
import { A4Section } from '@/components/a4-section'

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

function formatDate(date: Date, dateEnd?: Date | null): string {
  const one = (d: Date) => `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  if (!dateEnd || dateEnd.getTime() === date.getTime()) return one(date)
  if (dateEnd.getFullYear() === date.getFullYear()) {
    if (dateEnd.getMonth() === date.getMonth()) {
      return `${days[date.getDay()]}, ${date.getDate()}–${dateEnd.getDate()} ${months[dateEnd.getMonth()]} ${dateEnd.getFullYear()}`
    }
    return `${one(date)} – ${days[dateEnd.getDay()]}, ${dateEnd.getDate()} ${months[dateEnd.getMonth()]} ${dateEnd.getFullYear()}`
  }
  return `${one(date)} – ${one(dateEnd)}`
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

function CustomPanduanSection({
  section,
  logoLeft,
  logoRight,
  logoLeft2,
  logoCenter,
  logoRight2,
  topRight,
  topRight2,
}: {
  section: CustomSectionItem
  logoLeft: string
  logoRight: string
  logoLeft2: string | null
  logoCenter: string | null
  logoRight2: string | null
  topRight: string | null
  topRight2: string | null
}) {
  const { left, right } = splitSectionItems(section.items)
  const twoColumns = right.length > 0
  return (
    <A4Section>
      <section className="print-avoid-break space-y-6 rounded-[0.8rem] border border-[#dfe4e8] bg-white p-5 print:break-after-page print:min-h-[272mm]">
        <SectionLogos logoLeft={logoLeft} logoRight={logoRight} logoLeft2={logoLeft2} logoCenter={logoCenter} logoRight2={logoRight2} topRight={topRight} topRight2={topRight2} />
        <div data-a4-body className="flow-root">
          <PanduanHeading>{section.title || 'Catatan'}</PanduanHeading>
          <div className={twoColumns ? 'mt-6 grid grid-cols-2 gap-x-8 gap-y-2.5' : 'mt-6 space-y-2.5'}>
            <ol className="space-y-2.5">
              {left.map((item, i) => (
                <li key={`l-${i}`} className="flex gap-3 text-sm leading-relaxed text-[#1d2733]">
                  <span className="shrink-0 font-bold tabular-nums text-[#1b3555]">{i + 1}.</span>
                  <span className="min-w-0 whitespace-pre-wrap">{item}</span>
                </li>
              ))}
            </ol>
            {twoColumns && (
              <ol className="space-y-2.5">
                {right.map((item, i) => (
                  <li key={`r-${i}`} className="flex gap-3 text-sm leading-relaxed text-[#1d2733]">
                    <span className="shrink-0 font-bold tabular-nums text-[#1b3555]">{left.length + i + 1}.</span>
                    <span className="min-w-0 whitespace-pre-wrap">{item}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {section.note && (
            <p className="mt-6 whitespace-pre-wrap border-t border-[#eef1f4] pt-3 text-xs italic leading-relaxed text-[#657080]">
              {section.note}
            </p>
          )}
        </div>
      </section>
    </A4Section>
  )
}

async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, date: true, dateEnd: true, location: true, vwName: true, vwTitle: true, itineraryTitle: true, itineraryKeterangan: true, itineraryKeterangan2: true, denahKamarTitle: true, denahKamarKeterangan: true, denahKamarKeterangan2: true, vwKeterangan: true, vwKeterangan2: true, panduanItinerary: true, panduanRules: true, panduanSections: true, crewName: true, crewPhone: true, crewRole: true, crewPhotoUrl: true, crewList: true, denahKamarCrewName: true, denahKamarCrewRole: true, denahKamarCrewPhotoUrl: true, denahVwCrewName: true, denahVwCrewRole: true, denahVwCrewPhotoUrl: true, panduanLogoLeft: true, panduanLogoLeft2: true, panduanLogoCenter: true, panduanLogoRight2: true, panduanLogoRight: true, panduanLogoTopRight: true, panduanLogoTopRight2: true },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const event = await getEvent(id)
  return { title: `Panduan Peserta – ${event?.title ?? 'Event'} | Barokah Tour and Travel`, robots: { index: false } }
}

// Panduan berukuran tetap (tiap section = kertas A4, 210 mm ≈ 794 px). Di HP
// konten ini lebih lebar dari layar sehingga bisa digeser-geser. Kunci viewport
// ke lebar dokumen (plus sedikit margin) supaya browser menampilkan seluruh
// panduan mengecil pas layar — tampilannya sama seperti di desktop, tanpa
// geser horizontal.
export const viewport: Viewport = {
  width: 834,
  initialScale: undefined,
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
        select: { id: true, eventId: true, busId: true, seat: true, room: true, vw: true, jeepParis: true, jeepMerapi: true, jeepBromo: true, name: true, token: true, ticketCode: true },
      })
    : null
  const ownBus = participant && participant.eventId === id ? participant : null

  const buses = await prisma.bus.findMany({
    where: { eventId: id },
    select: { id: true, name: true, denahDudukKeterangan: true, denahDudukKeterangan2: true },
    orderBy: { order: 'asc' },
  })

  const ownBusName = ownBus ? (buses.find((b) => b.id === ownBus.busId)?.name ?? null) : null
  const ownVehicle = ownBus ? vehicleLabel(ownBus) : null

  const [vwCount, jeepParisCount, jeepMerapiCount, jeepBromoCount] = await Promise.all([
    prisma.participant.count({ where: { eventId: id, vw: { not: '' } } }),
    prisma.participant.count({ where: { eventId: id, jeepParis: { not: '' } } }),
    prisma.participant.count({ where: { eventId: id, jeepMerapi: { not: '' } } }),
    prisma.participant.count({ where: { eventId: id, jeepBromo: { not: '' } } }),
  ])
  const vehicleTitle = vehicleSectionTitle(
    { vw: vwCount, jeepParis: jeepParisCount, jeepMerapi: jeepMerapiCount, jeepBromo: jeepBromoCount },
    event.vwName,
    event.vwTitle,
  )
  const hasVehicles = vwCount + jeepParisCount + jeepMerapiCount + jeepBromoCount > 0
  const ownQr = ownBus ? await qrDataUrl(encodeToken(ownBus.token), 320) : null

  const { rows: itinerary, notes: itineraryNotes, sideNotes: itinerarySideNotes, footerNote: itineraryFooterNote } = parseItineraryDoc(event.panduanItinerary)
  const dayGroups = groupItineraryByDay(itinerary, itineraryNotes, itinerarySideNotes)
  const sections = parsePanduanSections(event.panduanSections)
  const hasCustomContent = sections.some(
    (s) => s.type === 'custom' && (s.title.trim() !== '' || s.items.length > 0 || s.note.trim() !== ''),
  )
  const isEmpty =
    itinerary.length === 0 &&
    Object.keys(itineraryNotes).length === 0 &&
    Object.keys(itinerarySideNotes).length === 0 &&
    !hasCustomContent
  const logoLeftUrl = event.panduanLogoLeft ?? '/Logo%20Asita.png'
  const logoRightUrl = event.panduanLogoRight ?? '/Logo%20siluet%20barokah%20tour.png'
  const crews = effectiveCrewList(event)
  const builtinSections: Record<string, ReactNode | null> = {
    'vision': (
<A4Section>
            <section className="print-avoid-break bg-white p-5 print:break-after-page print:min-h-[272mm]">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                logoLeft2={event.panduanLogoLeft2}
                logoCenter={event.panduanLogoCenter}
                logoRight2={event.panduanLogoRight2}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <div data-a4-body className="flow-root">
              <h2 className="text-3xl font-extrabold uppercase tracking-wide text-[#1b3555]">Our Vision and Mission</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <PanduanHeading>Our Vision</PanduanHeading>
                  <p className="mt-2 text-sm leading-relaxed text-[#1d2733]">
                    Menjadi biro perjalanan terkemuka dengan menciptakan produk-produk berkualitas yang berbasis budaya dan pendidikan dalam rangka pengembangan pariwisata.
                  </p>
                </div>

                <div>
                  <PanduanHeading>Our Mission</PanduanHeading>
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#1d2733]">
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
                  <h3 className="text-3xl font-extrabold uppercase tracking-wide text-[#1b3555]">Ujung Tombak</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1d2733]">
                    Tantangan terberat yang dihadapi adalah tantangan dalam memberikan pelayanan terbaik kepada setiap customer. Tanggung jawab terberat untuk memberikan pelayanan terbaik itu ada pada ujung tombak yang setiap hari berinteraksi dengan customer. Mereka ini dibekali dengan suatu pemahaman bahwa sebagai ujung tombak bagi perusahaan haruslah memiliki hati yang tulus dan pikiran yang jernih, karena hanya dengan ketulusan dan kejernihan kita dapat melayani dengan baik.
                  </p>
                </div>

                <div className="text-center">
                  <p className={`${latinScript.className} text-3xl leading-tight text-[#1b3555]`}>
                    &ldquo;Your Satisfaction Is Our Pride&rdquo;
                  </p>
                </div>
              </div>
              </div>
            </section>
            </A4Section>
    ),
    'prayer': (
<A4Section>
            <section className="print-avoid-break space-y-6 rounded-[0.8rem] border border-[#dfe4e8] bg-white p-5 print:break-after-page print:min-h-[272mm]">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                logoLeft2={event.panduanLogoLeft2}
                logoCenter={event.panduanLogoCenter}
                logoRight2={event.panduanLogoRight2}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <div data-a4-body className="space-y-6 flow-root">
              <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Doa Bepergian Jauh</h2>
              <div>
                <p className="mt-3 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أَللّٰهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هٰذَا وَاطْوِعَنَّابُعْدَهُ أَللّٰهُمَّ أَنْتَ الصَّاحِبُ فِى السَّفَرِوَالْخَلِيْفَةُ فِى الْأَهْلِ
                </p>
                <p className="mt-2 text-sm leading-relaxed text-black">
                  “Ya Allah, mudahkanlah kami bepergian ini, dan dekatkanlah kejauhannya. Ya Allah yang menemani dalam
                  bepergian, dan Engkau pula yang melindungi keluarga.”
                </p>
              </div>

              <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Tata Cara Shalat Jamak</h2>
              <div>
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">1. Jamak Taqdim</h3>
                <p className="mt-1 text-sm leading-relaxed text-black">
                  Jamak Taqdim yaitu meringkas atau mengerjakan 2 sholat fardhu sekaligus di waktu sholat yang pertama,
                  yaitu:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-black">
                  <li>Sholat Dzuhur dan Ashar, dikerjakan saat waktu Dzuhur.</li>
                  <li>Sholat Maghrib dan Isya, dikerjakan saat waktu Maghrib.</li>
                </ul>

                <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-black">2. Jamak Takhir</h3>
                <p className="mt-1 text-sm leading-relaxed text-black">
                  Jamak Takhir yaitu meringkas atau mengerjakan 2 sholat fardhu sekaligus di waktu sholat yang terakhir,
                  yaitu:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-black">
                  <li>Sholat Dzuhur dan Ashar, dikerjakan saat waktu Ashar.</li>
                  <li>Sholat Maghrib dan Isya&apos;, dikerjakan saat waktu Isya.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Tata Cara Sholat Jamak Takdim</h2>

                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Sholat Jamak Takdim di Waktu Dzuhur</h3>
                <p className="mt-1 text-sm leading-relaxed text-black">Niat sholat dzuhur dahulu:</p>
                <p className="mt-1 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الظُّهْرِ أَرْبَعَ رَكَعَاتٍ مَجْمُوْعًا مَعَ العَصْرِ أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku niat sholat fardhu dhuhur empat rakaat digabung dengan sholat ashar jamak takdim karena Allah
                  Ta’aala.”
                </p>

                <p className="mt-3 text-sm leading-relaxed text-black">Lalu, niat sholat ashar:</p>
                <p className="mt-1 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ العَصْرِ أَرْبَعَ رَكَعَاتٍ مَجْمُوْعًا مَعَ الظُّهْرِ أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku niat sholat fardhu ashar empat rakaat digabung dengan sholat dhuhur jamak takdim karena Allah
                  Ta’aala.”
                </p>

                <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-black">Niat Sholat Jamak Takdim di Waktu Magrib</h3>
                <p className="mt-1 text-sm leading-relaxed text-black">Niat solat magrib dahulu:</p>
                <p className="mt-1 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الْمَغْرِبِ ثَلَاثَ رَكَعَاتٍ مُسْتَقْبِلَ الْقِبْلَةِ مَجْمُوْعًا بِالْعِشَاءِ جَمْعَ تَقْدِيْمٍ لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku niat sholat fardhu maghrib tiga rakaat digabung dengan sholat isyak jamak takdim karena Allah
                  Ta’aala.”
                </p>

                <p className="mt-3 text-sm leading-relaxed text-black">Lalu niat solat isya:</p>
                <p className="mt-1 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ العِشَاءِ أَرْبَعَ رَكَعَاتٍ مَجْمُوْعًا مع المغرب جمع تقديم أَدَاءً لِلَّهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku sengaja shalat fardhu isya empat rakaat yang dijama&apos; dengan maghrib, dengan jama taqdim,
                  fardu karena Allah Ta’aala.”
                </p>
              </div>
              </div>
            </section>
            </A4Section>
    ),
    'jamak-qashar': (
<A4Section>
            <section className="print-avoid-break space-y-6 rounded-[0.8rem] border border-[#dfe4e8] bg-white p-5 print:break-after-page print:min-h-[272mm]">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                logoLeft2={event.panduanLogoLeft2}
                logoCenter={event.panduanLogoCenter}
                logoRight2={event.panduanLogoRight2}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <div data-a4-body className="space-y-6 flow-root">
              <div>
                <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Tata Cara Sholat Jamak Takdim dengan Qashar</h2>

                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Sholat Dhuhur dan Ashar, dilakukan di waktu dhuhur (Jamak Takdim)</h3>
                <p className="mt-1 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الظُّهْرِ رَكْعَتَيْنِ مُسْتَقْبِلَ الْقِبْلَةِ مَجْمُوْعًا بِالْعَصْرِ جَمْعَ تَقْدِيْمٍ قَصْرًا لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat shalat fardhu dhuhur dua rakaat digabungkan dengan shalat ashar dengan jamak takdim,
                  diringkas karena Allah Ta’ala.”
                </p>
                <p className="mt-3 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الْعَصْرِ رَكْعَتَيْنِ مُسْتَقْبِلَ الْقِبْلَةِ مَجْمُوْعًا بِالظُّهْرِ جَمْعَ تَقْدِيْمٍ قَصْرًا لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat shalat ashar dua rakaat digabungkan dengan shalat dhuhur dengan jamak takdim, diringkas
                  karena Allah Ta’ala.”
                </p>

                <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-black">Niat Sholat Maghrib dan Isya, dilakukan di waktu maghrib (Jamak Takdim)</h3>
                <p className="mt-1 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الْعِشَاءِ رَكْعَتَيْنِ قَصْرًا مَجْمُوْعًا إِلَىالْمَغْرِبِ لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Saya niat sholat fardhu Isya dua rakaat secara qashar dikumpulkan pada sholat Maghrib karena
                  Allah.”
                </p>
                <p className="mt-3 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الْعِشَاءِ رَكْعَتَيْنِ قَصْرًا مَجْمُوْعًا إِلَىالْمَغْرِبِ لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat shalat fardhu isya dua raka’at dikumpulkan dengan magrib dikumpulkan di waktu magrib
                  diringkas karena Allah Ta’ala.”
                </p>
              </div>

              <div>
                <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-black">Tata Cara Sholat Jamak Takhir dengan Qashar</h2>

                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">Niat Sholat Dhuhur dan Ashar, dilakukan di waktu Ashar (Jamak Takhir)</h3>
                <p className="mt-1 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الْعَصْرِ رَكْعَتَيْنِ مَجْمُوْعًا بِالظُّهْرِ جَمْعَ تَأْخِيْرٍ قَصْرً لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat sholat fardhu ashar dua rakaat digabungkan dengan sholat dzuhur dengan jamak takhir,
                  diringkas karena Allah Ta’ala.”
                </p>
                <p className="mt-3 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الظُّهْرِ رَكْعَتَيْنِ مَجْمُوْعًا إِلَى الْعَصْرِ جَمْعَ تَأْخِيْرٍ قَصْرً لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat sholat fardhu dhuhri dua rakaat digabungkan dengan sholat ashar dengan jamak takhir,
                  diringkas karena Allah Ta’ala.”
                </p>

                <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-black">Niat Sholat Maghrib dan Isya, dilakukan di waktu isya (Jamak Takhir)</h3>
                <p className="mt-1 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الْعِشَاءِ رَكْعَتَيْنِ مَجْمُوْعًا بِالْمَغْرِبِ جَمْعَ تَأْخِيْرٍ قَصْرً لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat sholat fardhu isya dua rakaat digabungkan dengan sholat maghrib dengan jamak takhir,
                  diringkas karena Allah Ta’ala.”
                </p>
                <p className="mt-3 font-bold text-right text-lg leading-loose text-black" dir="rtl" lang="ar">
                  أُصَلِّيْ فَرْضَ الْمَغْرِبِ ثَلَاثَ رَكَعَاتٍ مَجْمُوْعًا إِلَى الْعِشَاءِ جَمْعَ تَأْخِيْرٍ لِلّٰهِ تَعَالَى
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-black">
                  “Aku berniat sholat fardhu maghrib tiga rakaat digabungkan dengan sholat isya dengan jamak takhir,
                  karena Allah Ta’ala.”
                </p>
              </div>
              </div>
            </section>
            </A4Section>
    ),
    'rules': (
<A4Section>
            <section className="print-avoid-break bg-white p-5 print:break-after-page print:min-h-[272mm]">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                logoLeft2={event.panduanLogoLeft2}
                logoCenter={event.panduanLogoCenter}
                logoRight2={event.panduanLogoRight2}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <div data-a4-body className="flow-root">
              <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[#1b3555]">Tata Tertib</h2>
              <ol className="mt-4 space-y-3">
                {(() => {
                  const rules = event.panduanRules ? parsePanduanRules(event.panduanRules) : DEFAULT_PANDUAN_RULES
                  return rules.map((rule, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-[#1d2733]">
                      <span className="shrink-0 text-sm font-bold text-[#1d2733]">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="leading-relaxed">{rule.text}</p>
                        {rule.items && (
                          <ul className="mt-2 space-y-1.5">
                            {rule.items.map((item, j) => (
                              <li key={j} className="flex gap-2">
                                <span className="shrink-0 font-bold text-[#1d2733]">{'-'}</span>
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

              {crews.length > 0 && (
                <div className="mt-6 border-t border-[#eef1f4] pt-4">
                  <h3 className="text-center text-xl font-extrabold uppercase tracking-wide text-[#f5b915]">Crew on Duty</h3>
                  <div className="mt-3 flex flex-wrap items-start justify-center gap-x-1 gap-y-3">
                    {crews.map((crew, i) => (
                      <div key={i} className="flex w-[18%] min-w-[92px] flex-col items-center text-center">
                        {crew.photoUrl ? (
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={crew.photoUrl} alt={crew.name || 'Crew'} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5b915]/15 text-lg font-bold text-[#b98a12]">
                            {(crew.name || 'CR').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <strong
                          className="relative z-[1] mt-1.5 inline-block max-w-full break-words bg-[#f5b915] px-3 py-0.5 text-[10px] font-extrabold uppercase leading-tight tracking-wide text-white"
                          style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 7px) 50%, 100% 100%, 0 100%, 7px 50%)' }}
                        >
                          {crew.name || 'CREW'}
                        </strong>
                        {crew.phone && (
                          <span className="mt-1 block max-w-full break-words text-[9px] font-bold tabular-nums leading-tight text-[#657080]">
                            {crew.phone}
                          </span>
                        )}
                        <span className="mt-0.5 block max-w-full break-words text-[9px] font-bold uppercase leading-tight tracking-wide text-[#f5b915]">
                          {crew.role || 'TOUR LEADER'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </section>
            </A4Section>
    ),
    'itinerary': dayGroups.length > 0 ? (
              <PublicItinerary
                dayGroups={dayGroups}
                footerNote={itineraryFooterNote}
                header={
                  <>
                    <SectionLogos
                      logoLeft={logoLeftUrl}
                      logoRight={logoRightUrl}
                      logoLeft2={event.panduanLogoLeft2}
                      logoCenter={event.panduanLogoCenter}
                      logoRight2={event.panduanLogoRight2}
                      topRight={event.panduanLogoTopRight}
                      topRight2={event.panduanLogoTopRight2}
                    />
                    <PublicHeading
                      title={
                        <h3 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[#00A3E0]">
                          {event.itineraryTitle?.trim() || event.title}
                        </h3>
                      }
                      keterangan={event.itineraryKeterangan}
                      keterangan2={event.itineraryKeterangan2}
                      captionClassName="text-base"
                      className="mb-4 justify-center"
                    />
                    <div className="mx-6">
                      <PanduanHeading>Itinerary</PanduanHeading>
                    </div>
                  </>
                }
              />
    ) : null,
    'seat-map': buses.length > 0 ? (
      <>
        {buses.map((bus) => (
          <A4Section key={bus.id}>
            <section className="flex flex-col rounded-none border border-[#dfe4e8] bg-white p-5 print:min-h-[272mm]">
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                logoLeft2={event.panduanLogoLeft2}
                logoCenter={event.panduanLogoCenter}
                logoRight2={event.panduanLogoRight2}
                topRight={event.panduanLogoTopRight}
                topRight2={event.panduanLogoTopRight2}
              />
              <div data-a4-body className="flex flex-1 flex-col">
                <div className="mb-6 mt-6 flex items-center justify-center gap-4">
                  <h2 className="text-center text-4xl font-extrabold uppercase tracking-wide text-[#00A3E0]">Denah Duduk</h2>
                  {(bus.denahDudukKeterangan || bus.denahDudukKeterangan2) && (
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="h-9 w-0.5 shrink-0 bg-[#00A3E0]" />
                      <div className="flex flex-col text-left leading-tight">
                        {bus.denahDudukKeterangan && (
                          <p className="text-2xl font-bold uppercase tracking-wide text-[#e8830c]">{bus.denahDudukKeterangan}</p>
                        )}
                        <p className="text-2xl font-bold uppercase tracking-wide text-[#2ca84a]">{bus.denahDudukKeterangan2 || bus.name}</p>
                      </div>
                    </div>
                  )}
                </div>
                <PublicSeatMap
                  eventId={id}
                  buses={[bus]}
                  initialBusId={bus.id}
                  highlightSeat={ownBus?.busId === bus.id ? ownBus.seat : null}
                />
              </div>
            </section>
          </A4Section>
        ))}
      </>
    ) : null,
    'room-map': buses.length > 0 ? (
      <PublicRoomMap
        eventId={id}
        highlightRoom={ownBus?.room ?? null}
        highlightName={ownBus?.name ?? null}
        logoLeft={logoLeftUrl}
        logoRight={logoRightUrl}
        logoLeft2={event.panduanLogoLeft2}
        logoCenter={event.panduanLogoCenter}
        logoRight2={event.panduanLogoRight2}
        topRight={event.panduanLogoTopRight}
        topRight2={event.panduanLogoTopRight2}
        crewName={event.denahKamarCrewName}
        crewPhotoUrl={event.denahKamarCrewPhotoUrl}
        heading={event.denahKamarTitle}
        keterangan={event.denahKamarKeterangan}
        keterangan2={event.denahKamarKeterangan2}
      />
    ) : null,
    // Denah kendaraan dibuat jadi beberapa lembar A4 (5 kelompok kendaraan
    // per section) — bukan satu section dengan tombol "Halaman 1 / N".
    'vw-map': hasVehicles ? (
      <PublicVwMap
        eventId={id}
        vwName={vehicleTitle}
        keterangan={event.vwKeterangan}
        keterangan2={event.vwKeterangan2}
        header={
          <SectionLogos
            logoLeft={logoLeftUrl}
            logoRight={logoRightUrl}
            logoLeft2={event.panduanLogoLeft2}
            logoCenter={event.panduanLogoCenter}
            logoRight2={event.panduanLogoRight2}
            topRight={event.panduanLogoTopRight}
            topRight2={event.panduanLogoTopRight2}
          />
        }
        footer={
          (event.denahVwCrewName || event.denahVwCrewPhotoUrl) ? (
            <div className="mt-6 flex justify-end pr-8 pt-4">
              <div className="flex flex-col items-center text-center">
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
                className="relative z-[1] mt-3 inline-block min-w-[13rem] max-w-full break-words bg-[#f5b915] px-8 py-2 text-center text-lg font-extrabold uppercase leading-tight tracking-wide text-white"
                style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 16px) 50%, 100% 100%, 0 100%, 16px 50%)' }}
              >
                {event.denahVwCrewName || vehicleTitle}
              </strong>
              </div>
            </div>
          ) : null
        }
        highlightVehicle={ownVehicle}
        highlightName={ownBus?.name ?? null}
      />
    ) : null,
  }


  return (
    <main className="print-guide h-screen min-h-0 overflow-y-scroll bg-[#f4f7fa] print:bg-white pb-12 print:min-h-0 print:pb-0 [scrollbar-width:auto] [-ms-overflow-style:auto] [scrollbar-color:#1b4f9c_#dfe4e8] print:[scrollbar-width:none] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#dfe4e8] [&::-webkit-scrollbar-thumb]:bg-[#1b4f9c] [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:hover:bg-[#143d79] print:[&::-webkit-scrollbar]:hidden">
      <BackToTop />
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
              <h1 className="mt-2 text-3xl font-bold text-[#1b3555]">{event.title}</h1>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#657080]">
                <span className="flex items-center gap-1">
                  <Clock3 size={15} className="text-[#2ca84a]" /> {formatDate(event.date, event.dateEnd)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={15} className="text-[#2ca84a]" /> {event.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div id="panduan-isi" className="mx-auto w-[210mm] space-y-2 py-7">
            {/* Kop dokumen. `hidden print:block` = tak terlihat di layar tapi
                ikut tercetak lewat Print; `data-pdf-only` = downloader
                menghidupkannya lagi supaya ikut jadi sampul PDF. */}
            <div className="hidden print:block print:break-after-page" data-pdf-only>
              <SectionLogos
                logoLeft={logoLeftUrl}
                logoRight={logoRightUrl}
                logoLeft2={event.panduanLogoLeft2}
                logoCenter={event.panduanLogoCenter}
                logoRight2={event.panduanLogoRight2}
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
                        <Clock3 size={12} className="text-[#2ca84a]" /> {formatDate(event.date, event.dateEnd)}
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


            {sections.map((s) =>
              s.type === 'builtin' ? (
                builtinSections[s.builtin] ? <Fragment key={s.id}>{builtinSections[s.builtin]}</Fragment> : null
              ) : (
                <CustomPanduanSection
                  key={s.id}
                  section={s}
                  logoLeft={logoLeftUrl}
                  logoRight={logoRightUrl}
                  logoLeft2={event.panduanLogoLeft2}
                  logoCenter={event.panduanLogoCenter}
                  logoRight2={event.panduanLogoRight2}
                  topRight={event.panduanLogoTopRight}
                  topRight2={event.panduanLogoTopRight2}
                />
              ),
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
                  Lewat tombol cetak: pilih <strong className="text-[#657080]">Save as PDF / Simpan sebagai PDF</strong>,
                  kertas <strong className="text-[#657080]">A4</strong> tanpa margin tambahan — tiap section jadi satu
                  halaman penuh (210 × 297 mm).{' '}
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
          </div>
        </>
      )}
    </main>
  )
}
