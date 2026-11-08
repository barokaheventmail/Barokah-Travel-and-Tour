import type { Metadata } from 'next'
import { Image as ImageIcon } from 'lucide-react'
import { BannerManager } from '@/components/admin/banner-manager'
import { prisma } from '@/lib/db'

export const metadata: Metadata = { title: 'Banner – Panel Admin', robots: { index: false } }

export const dynamic = 'force-dynamic'

export default async function AdminBannerPage() {
  const banners = await prisma.banner.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, imageUrl: true },
  })

  return (
    <div className="mx-auto max-w-4xl" suppressHydrationWarning>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3fb] text-[#1b4f9c]">
          <ImageIcon size={18} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#1b3555]">Banner</h1>
          <p className="mt-0.5 text-sm text-[#657080]">
            Atur gambar yang tampil bergantian di bagian atas beranda.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <BannerManager initialBanners={banners} />
      </div>
    </div>
  )
}
