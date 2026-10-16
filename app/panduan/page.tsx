import type { Metadata } from 'next'
import { Clock3, MapPin, Phone } from 'lucide-react'
import { BackLink, Logo } from '@/components/site'

export const metadata: Metadata = {
  title: 'Buku Panduan Peserta – Open Trip Ancol–Dufan | Barokah Tour and Travel',
  description: 'Buku panduan resmi untuk peserta open trip Barokah Tour and Travel: itinerary, denah duduk, crew on duty, dan tata tertib.',
  robots: { index: false },
}

const rules = [
  'Hadir 15 menit sebelum waktu keberangkatan.',
  'Menjaga kebersihan dan kenyamanan bersama.',
  'Mengikuti arahan crew selama perjalanan.',
  'Menjaga barang pribadi masing-masing.',
]

const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function upcomingSaturday(): Date {
  const date = new Date()
  let diff = (6 - date.getDay() + 7) % 7
  if (diff === 0) diff = 7
  date.setDate(date.getDate() + diff)
  return date
}

function formatDate(date: Date): string {
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function SeatRow({ seats, yourSeat }: { seats: number[]; yourSeat: number }) {
  return (
    <>
      {seats.map((seat, index) =>
        seat === -1 ? (
          <span key={`gap-${index}`} aria-hidden />
        ) : (
          <div
            key={`seat-${seat}`}
            className={`flex h-9 items-center justify-center border text-xs font-bold ${
              seat === yourSeat ? 'bg-[#f5b915] text-[#1d2733]' : 'bg-white text-[#1b4f9c]'
            }`}
          >
            {seat}
          </div>
        ),
      )}
    </>
  )
}

function buildRows(total: number): number[][] {
  const rows: number[][] = []
  let seat = 1
  while (seat <= total) {
    const row = [seat++, seat++]
    row.push(-1)
    row.push(seat++, seat++)
    rows.push(row)
    if (seat > total && rows[rows.length - 1][4] > total) {
      rows[rows.length - 1][4] = -1
    }
  }
  return rows
}

const YOUR_SEAT = 12

export default function Guide() {
  const departDate = formatDate(upcomingSaturday())
  return (
    <main className="h-screen overflow-y-scroll bg-[#f4f7fa] pb-12 [scrollbar-width:auto] [-ms-overflow-style:auto] [scrollbar-color:#1b4f9c_#dfe4e8] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#dfe4e8] [&::-webkit-scrollbar-thumb]:bg-[#1b4f9c] [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:hover:bg-[#143d79]">
      {/* sticky top-0 => topbar tetap menempel di atas saat halaman di-scroll.
          Karena masih in-flow, tidak perlu padding tambahan di <main>. */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-[0_2px_14px_-8px_rgba(27,53,85,0.45)]">
        <div className="container-wide flex h-[76px] items-center justify-between">
          <Logo />
          <BackLink />
        </div>
      </header>

      <div className="guide-pattern border-b border-[#dfe4e8] px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">Perjalanan Anda</p>
          <h1 className="mt-2 text-3xl font-bold text-[#1b3555]">Open Trip Ancol–Dufan</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#657080]">
            <span className="flex items-center gap-1">
              <Clock3 size={15} className="text-[#2ca84a]" /> {departDate}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={15} className="text-[#2ca84a]" /> Graha Barokah
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-7">
        <section className="border border-[#dfe4e8] bg-white p-5">
          <h2 className="text-xl font-bold text-[#1b3555]">Itinerary Perjalanan</h2>
          <div className="mt-4 space-y-4">
            {[
              ['05.00', 'Kumpul & registrasi'],
              ['05.30', 'Berangkat menuju Jakarta'],
              ['09.00', 'Tiba di Ancol – Dufan'],
              ['12.00', 'Makan siang bersama'],
              ['17.00', 'Persiapan pulang'],
              ['22.00', 'Tiba di Sukabumi'],
            ].map(([time, event]) => (
              <div key={time} className="flex gap-4 border-l-2 border-[#2ca84a] pl-4">
                <strong className="w-12 text-sm text-[#1b4f9c]">{time}</strong>
                <span className="text-sm">{event}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-[#dfe4e8] bg-white p-5">
          <h2 className="text-xl font-bold text-[#1b3555]">Denah Duduk</h2>
          <p className="mt-1 text-sm text-[#657080]">Silakan duduk sesuai nomor kursi yang telah dibagikan crew.</p>
          <div className="mx-auto mt-5 max-w-xs rounded border bg-[#edf5ef] p-4">
            <div className="mb-3 bg-[#1b4f9c] py-2 text-center text-xs font-bold text-white">DEPAN / SOPIR</div>
            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))_0.5rem_repeat(2,minmax(0,1fr))] gap-2">
              {buildRows(20).map((seats, i) => (
                <SeatRow key={i} seats={seats} yourSeat={YOUR_SEAT} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#657080]">
              <span className="h-3 w-3 bg-[#f5b915]" /> Kursi Anda
            </div>
          </div>
        </section>

        <section className="border border-[#dfe4e8] bg-white p-5">
          <h2 className="text-xl font-bold text-[#1b3555]">Crew on Duty</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dcebe0] text-xl font-bold text-[#2ca84a]">
              AR
            </div>
            <div>
              <strong className="block">Andi Rahmat</strong>
              <span className="text-sm text-[#657080]">Tour Leader</span>
              <a href="tel:085930005544" className="mt-1 flex items-center gap-1 text-sm font-bold text-[#1b4f9c]">
                <Phone size={13} /> 0859-3000-5544
              </a>
            </div>
          </div>
        </section>

        <section className="border border-[#dfe4e8] bg-white p-5">
          <h2 className="text-xl font-bold text-[#1b3555]">Tata Tertib</h2>
          <ol className="mt-4 space-y-3">
            {rules.map((rule, i) => (
              <li key={rule} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ca84a] text-xs font-bold text-white">
                  {i + 1}
                </span>
                {rule}
              </li>
            ))}
          </ol>
        </section>

        <section className="border-l-4 border-[#f5b915] bg-[#fffaf0] p-5">
          <h2 className="text-xl font-bold text-[#1b3555]">Doa Bepergian</h2>
          <p className="mt-4 text-right text-xl leading-loose text-[#1b3555]" dir="rtl" lang="ar">
            سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ ۝ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ
          </p>
          <p className="mt-3 text-sm italic leading-relaxed text-[#657080]">
            “Mahasuci Allah yang telah menundukkan semua ini bagi kami, padahal kami sebelumnya tidak mampu
            menguasainya. Dan sesungguhnya kami akan kembali kepada Tuhan kami.”
          </p>
        </section>
      </div>
    </main>
  )
}