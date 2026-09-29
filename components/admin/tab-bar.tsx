import Link from 'next/link'

export const EVENT_TABS = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'panduan', label: 'Panduan' },
  { id: 'peserta', label: 'Peserta' },
  { id: 'unit', label: 'Bus & Unit' },
  { id: 'kursi', label: 'Kursi & Fasilitas' },
  { id: 'riwayat', label: 'Riwayat' },
] as const

export type EventTabId = (typeof EVENT_TABS)[number]['id']

export function isEventTab(value: unknown): value is EventTabId {
  return typeof value === 'string' && EVENT_TABS.some((t) => t.id === value)
}

export function TabBar({ eventId, active }: { eventId: string; active: EventTabId }) {
  return (
    <div className="mt-5 flex flex-wrap gap-1.5 rounded-2xl border border-[#dfe4e8] bg-white p-1.5 shadow-sm">
      {EVENT_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/admin/events/${eventId}?tab=${tab.id}`}
          className={`flex-1 rounded-xl px-4 py-2 text-center text-xs font-bold transition-colors duration-200 ${
            active === tab.id
              ? 'bg-[#1b4f9c] text-white'
              : 'text-[#657080] hover:bg-[#f1f3f5]'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}