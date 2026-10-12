import type { Metadata } from 'next'
import { Bookmark, BookOpen, Armchair } from 'lucide-react'
import { prisma } from '@/lib/db'
import type { PresetKindId } from '@/lib/preset'
import { PresetCard } from '@/components/admin/preset-card'

export const metadata: Metadata = { title: 'Preset – Panel Admin', robots: { index: false } }

export const dynamic = 'force-dynamic'

const KIND_META: Record<PresetKindId, { title: string; description: string; icon: typeof BookOpen }> = {
  PANDUAN: {
    title: 'Preset Panduan',
    description: 'Itinerary & logo panduan peserta. Crew on duty tidak ikut disimpan.',
    icon: BookOpen,
  },
  KURSI: {
    title: 'Preset Kursi & Fasilitas',
    description: 'Layout kursi, strip depan (driver/crew), dan daftar fasilitas unit.',
    icon: Armchair,
  },
}

export default async function AdminPresetPage() {
  const presets = await prisma.preset.findMany({
    orderBy: [{ kind: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  })

  const kinds: PresetKindId[] = ['PANDUAN', 'KURSI']

  return (
    <div className="mx-auto max-w-4xl" suppressHydrationWarning>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3fb] text-[#1b4f9c]">
          <Bookmark size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#1b3555]">Preset</h1>
          <p className="mt-0.5 text-sm text-[#657080]">
            Template yang bisa dipakai ulang lintas event. Simpan preset dari tab <span className="font-bold">Panduan</span> atau{' '}
            <span className="font-bold">Kursi &amp; Fasilitas</span> di halaman detail event, lalu terapkan ke event mana pun.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {kinds.map((kind) => {
          const meta = KIND_META[kind]
          const Icon = meta.icon
          const items = presets.filter((p) => p.kind === kind)
          return (
            <section key={kind}>
              <div className="flex items-center gap-2">
                <Icon size={17} className="text-[#1b4f9c]" />
                <h2 className="text-sm font-bold text-[#1b3555]">{meta.title}</h2>
                <span className="rounded-full bg-[#eef3fb] px-2.5 py-0.5 text-[11px] font-bold text-[#1b4f9c]">
                  {items.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#657080]">{meta.description}</p>

              {items.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-[#bfd3c4] bg-white p-8 text-center">
                  <Icon className="mx-auto text-[#9aa3af]" size={30} />
                  <p className="mt-2 text-sm font-bold text-[#1b3555]">Belum ada preset</p>
                  <p className="mt-1 text-xs text-[#657080]">
                    Buka detail event, lalu klik &ldquo;Simpan sebagai Preset&rdquo; di tab yang sesuai.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {items.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      id={preset.id}
                      name={preset.name}
                      kind={kind}
                      data={preset.data}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
