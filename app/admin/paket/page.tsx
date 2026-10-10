import type { Metadata } from 'next'
import { Package } from 'lucide-react'
import { prisma } from '@/lib/db'
import { CreatePaket } from '@/components/admin/create-paket'
import { DeletePaket } from '@/components/admin/delete-paket'
import { EditPaket } from '@/components/admin/edit-paket'
import { PaketThumb } from '@/components/admin/paket-thumb'

export const metadata: Metadata = { title: 'Paket Event – Panel Admin', robots: { index: false } }

export const dynamic = 'force-dynamic'

export default async function AdminPaketPage() {
  const pakets = await prisma.paketEvent.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { prices: { orderBy: { order: 'asc' } }, images: { orderBy: { order: 'asc' } } },
  })

  return (
    <div className="mx-auto max-w-4xl" suppressHydrationWarning>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1b3555]">Paket Event</h1>
          <p className="mt-0.5 text-sm text-[#657080]">
            Paket yang tampil di halaman publik <span className="font-bold">/paket</span>: nama, lokasi, keterangan, dan gambar.
          </p>
        </div>
        <CreatePaket />
      </div>

      {pakets.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#bfd3c4] bg-white p-10 text-center">
          <Package className="mx-auto text-[#9aa3af]" size={36} />
          <p className="mt-3 text-sm font-bold text-[#1b3555]">Belum ada paket event</p>
          <p className="mt-1 text-xs text-[#657080]">
            Klik &ldquo;Tambah Paket Event&rdquo; untuk menambahkan paket wisata yang ditampilkan di website.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {pakets.map((paket) => (
            <div
              key={paket.id}
              className="rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <PaketThumb paketId={paket.id} imageUrl={paket.imageUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-[#1b3555]">{paket.title}</h2>
                    <span className="rounded-full bg-[#eef3fb] px-2.5 py-0.5 text-[11px] font-bold text-[#1b4f9c]">
                      Urutan {paket.order}
                    </span>
                  </div>
                  {paket.location && <p className="mt-1 text-xs font-semibold text-[#657080]">📍 {paket.location}</p>}
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#657080]">
                    {paket.description || <span className="italic">Belum ada keterangan.</span>}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <EditPaket paket={paket} />
              </div>

              <div className="mt-2 border-t border-[#f2f4f6] pt-2">
                <DeletePaket paketId={paket.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}