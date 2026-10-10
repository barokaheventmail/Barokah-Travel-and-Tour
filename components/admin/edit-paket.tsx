'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { PaketForm } from './paket-form'
import { PaketAlbum } from './paket-album'

type PaketEdit = {
  id: string
  title: string
  location: string
  description: string | null
  subtitle: string | null
  body: string | null
  badge: string | null
  order: number
  prices: { label: string; price: number; facilities: unknown; badge: string | null }[]
  images: { id: string; url: string }[]
}

export function EditPaket({ paket }: { paket: PaketEdit }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-bold text-[#1b3555] transition-colors duration-200 hover:bg-[#f1f3f5] active:scale-95"
      >
        <Pencil size={13} /> Edit
      </button>
    )
  }

  return (
    <div className="animate-fade-up mx-auto w-full max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1b3555]">Edit Paket Event</h2>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]">
          <X size={16} />
        </button>
      </div>
      <PaketForm
        initial={{
          id: paket.id,
          title: paket.title,
          location: paket.location,
          description: paket.description ?? '',
          subtitle: paket.subtitle ?? '',
          body: paket.body ?? '',
          badge: paket.badge ?? '',
          order: paket.order,
          prices: paket.prices.map((p) => ({
            label: p.label,
            price: String(p.price),
            facilities: Array.isArray(p.facilities) ? (p.facilities as string[]) : [],
            badge: p.badge ?? '',
          })),
        }}
        onDone={() => setOpen(false)}
      />
      <div className="mt-6 border-t border-[#eef1f4] pt-5">
        <PaketAlbum paketId={paket.id} initialImages={paket.images} />
      </div>
    </div>
  )
}
