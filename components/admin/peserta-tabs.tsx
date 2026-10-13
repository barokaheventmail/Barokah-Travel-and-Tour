'use client'

import { useState } from 'react'
import { BedDouble, Bus, Car } from 'lucide-react'
import type { RoomTypeOption } from '@/lib/room-types'
import { ParticipantTable, type RowBus } from './participant-table'
import { ParticipantGroups } from './participant-groups'

type View = 'unit' | 'room' | 'vw'

const VIEWS: { id: View; label: string; icon: typeof Bus }[] = [
  { id: 'unit', label: 'Per Unit', icon: Bus },
  { id: 'room', label: 'Per Kamar', icon: BedDouble },
  { id: 'vw', label: 'Per VW', icon: Car },
]

export function PesertaTabs({
  eventId,
  buses,
  roomTypes,
  totalParticipants,
  totalAttended,
}: {
  eventId: string
  buses: RowBus[]
  roomTypes: RoomTypeOption[]
  totalParticipants: number
  totalAttended: number
}) {
  const [view, setView] = useState<View>('unit')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[#dfe4e8] bg-white p-1.5 shadow-sm">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-center text-xs font-bold transition-colors duration-200 ${
              view === id ? 'bg-[#1b4f9c] text-white' : 'text-[#657080] hover:bg-[#f1f3f5]'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {view === 'unit' && (
        <ParticipantTable
          eventId={eventId}
          buses={buses}
          roomTypes={roomTypes}
          totalParticipants={totalParticipants}
          totalAttended={totalAttended}
        />
      )}
      {view === 'room' && <ParticipantGroups eventId={eventId} mode="room" roomTypes={roomTypes} />}
      {view === 'vw' && <ParticipantGroups eventId={eventId} mode="vw" />}
    </div>
  )
}