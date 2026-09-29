import Link from 'next/link'
import { History, ScanBarcode, Search, Users } from 'lucide-react'
import { formatWaktuLengkap } from '@/lib/dates'
import { scanStatusUi } from '@/lib/crew-scan-status'

export type RiwayatScope = 'unit' | 'saya'

export type RiwayatLog = {
  id: string
  status: string
  createdAt: Date
  /** Siapa yang mencatat kehadiran (bisa admin atau crew lain). */
  scannedBy: { name: string | null; username: string; isMe: boolean } | null
  participant: {
    name: string
    order: number
    seat: string | null
    room: string | null
    bus: { name: string }
    event: { title: string }
  }
}

type Props = {
  basePath: string
  tab?: string
  scope: RiwayatScope
  q: string
  page: number
  total: number
  todayCount: number
  totalPages: number
  logs: RiwayatLog[]
}

export function CrewRiwayatList({ basePath, tab, scope, q, page, total, todayCount, totalPages, logs }: Props) {
  const qs = (patch: Record<string, string>): string => {
    const p = new URLSearchParams()
    if (tab) p.set('tab', tab)
    if (scope) p.set('scope', scope)
    if (q) p.set('q', q)
    p.set('page', String(page))
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v)
    }
    return `${basePath}?${p.toString()}`
  }

  const scopeClass = (active: boolean) =>
    `flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
      active ? 'bg-[#f5b915] text-[#1d2733]' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`

  return (
    <>
      <form className="flex items-center gap-2" method="get" action={basePath}>
        {tab && <input type="hidden" name="tab" value={tab} />}
        {scope && <input type="hidden" name="scope" value={scope} />}
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white px-3 py-2.5">
          <Search size={15} className="shrink-0 text-[#9aa3af]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nama peserta…"
            className="w-full bg-transparent text-sm font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af]"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-[#f5b915] px-4 py-2.5 text-sm font-bold text-[#1d2733] transition-colors duration-200 hover:bg-[#e4aa09]"
        >
          Cari
        </button>
        {q && (
          <Link
            href={qs({ q: '' })}
            className="rounded-xl border border-white/20 px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5">
        <Link href={qs({ scope: 'unit', page: '1' })} className={scopeClass(scope === 'unit')}>
          <span className="flex items-center justify-center gap-1">
            <Users size={13} /> Hadir di unitku
          </span>
        </Link>
        <Link href={qs({ scope: 'saya', page: '1' })} className={scopeClass(scope === 'saya')}>
          <span className="flex items-center justify-center gap-1">
            <ScanBarcode size={13} /> Scan saya
          </span>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-2xl font-black text-white">{total.toLocaleString('id-ID')}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
            {scope === 'unit' ? 'Hadir di unitku' : 'Total scan'}
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-2xl font-black text-[#8fe3a5]">{todayCount.toLocaleString('id-ID')}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
            {scope === 'unit' ? 'Hadir hari ini' : 'Scan hari ini'}
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
          <ScanBarcode className="mx-auto text-white/30" size={32} />
          <p className="mt-3 text-sm font-bold text-white">
            {q
              ? 'Tidak ada yang cocok'
              : scope === 'unit'
                ? 'Belum ada peserta hadir'
                : 'Belum ada scan'}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {q
              ? `Tidak ditemukan peserta bernama "${q}".`
              : scope === 'unit'
                ? 'Kehadiran yang dicatat admin atau crew lain otomatis muncul di sini.'
                : 'Scan pertama yang kamu lakukan akan tercatat di sini.'}
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {logs.map((log) => {
            const status = scanStatusUi(log.status)
            const p = log.participant
            const by = log.scannedBy
            return (
              <li key={log.id} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-2xl">
                <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.badgeClass}`}>
                  {status.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1b3555]">{p.name}</p>
                  <p className="mt-0.5 text-xs text-[#657080]">
                    {p.bus.name}
                    {p.seat ? ` · Kursi ${p.seat}` : ` · No. ${p.order}`}
                    {p.room ? ` · ${p.room}` : ''}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#9aa3af]">{p.event.title}</p>
                  {by && (
                    <p className="mt-1 text-[11px] font-semibold text-[#657080]">
                      Dicatat oleh{' '}
                      {by.isMe ? (
                        <span className="text-[#1b4f9c]">kamu</span>
                      ) : (
                        <span className="text-[#1b4f9c]">{by.name || by.username}</span>
                      )}
                      {by.name && by.isMe ? ` (${by.name})` : ''}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-right text-[11px] font-semibold text-[#657080]">
                  {formatWaktuLengkap(new Date(log.createdAt))}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="font-semibold text-white/70">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={qs({ page: String(page - 1) })}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20"
              >
                ‹ Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={qs({ page: String(page + 1) })}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20"
              >
                Berikutnya ›
              </Link>
            )}
          </div>
        </div>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-white/50">
        <History size={12} />
        {scope === 'unit'
          ? 'Kehadiran peserta di unit kamu, termasuk yang dicatat admin atau crew lain.'
          : 'Riwayat semua scan yang kamu lakukan.'}
      </p>
    </>
  )
}
