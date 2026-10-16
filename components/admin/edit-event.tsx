'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { toDateInput } from '@/lib/dates'
import { EventForm } from './event-form'
import type { EventFormData } from './event-form'

export function EditEvent({ event }: { event: EventFormData & { id: string } }) {
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
    <div className="animate-fade-up rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1b3555]">Edit Event</h2>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]">
          <X size={16} />
        </button>
      </div>
      <EventForm
        initial={{ ...event, date: toDateInput(event.date), dateEnd: toDateInput(event.dateEnd) }}
        onDone={() => setOpen(false)}
        compact
      />
    </div>
  )
}