import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Bus, CalendarDays, History, ShieldCheck, UserCog, Users } from 'lucide-react'
import { prisma } from '@/lib/db'
import { formatTanggalPendek, formatTanggalRentang, formatWaktuLengkap } from '@/lib/dates'
import { HIDDEN_LOG_ACTIONS } from '@/lib/log-labels'
import { LogEntry } from '@/components/admin/log-entry'
import { requireAdminSession } from '@/lib/auth'

export const metadata: Metadata = { title: 'Pengawasan – Panel Owner', robots: { index: false } }
export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draf',
  ACTIVE: 'Aktif',
  CLOSED: 'Selesai',
}

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-[#eff1f4] text-[#657080]',
  ACTIVE: 'bg-[#e6f4ea] text-[#2ca84a]',
  CLOSED: 'bg-[#eef3fb] text-[#1b4f9c]',
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  CREW: 'Crew',
}

const ROLE_CLS: Record<string, string> = {
  OWNER: 'bg-[#f3ecfb] text-[#7b3fd4]',
  ADMIN: 'bg-[#eef3fb] text-[#1b4f9c]',
  CREW: 'bg-[#eff1f4] text-[#657080]',
}

/**
 * Halaman khusus owner: ringkasan seluruh sistem (semua event, semua akun,
 * aktivitas terbaru lintas event) supaya owner bisa mengawasi tanpa membuka
 * tiap event satu per satu. Admin biasa tidak punya akses ke sini.
 */
export default async function OwnerSupervisionPage() {
  const session = await requireAdminSession()
  if (!session) redirect('/login?scope=ADMIN&next=/admin/pengawasan')
  if (session.role !== 'OWNER') notFound()

  const [events, attendedRows, accounts, logs] = await Promise.all([
    prisma.event.findMany({
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { buses: true, participants: true } },
        buses: { select: { id: true, _count: { select: { workers: true } } } },
      },
    }),
    prisma.participant.groupBy({ by: ['eventId'], where: { scannedAt: { not: null } }, _count: { _all: true } }),
    prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { username: 'asc' }],
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        createdAt: true,
        _count: { select: { workers: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { action: { notIn: HIDDEN_LOG_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { user: { select: { username: true } }, event: { select: { title: true } } },
    }),
  ])

  const attendedMap = new Map(attendedRows.map((r) => [r.eventId, r._count._all]))
  const totalUnits = events.reduce((acc, e) => acc + e._count.buses, 0)
  const totalPeserta = events.reduce((acc, e) => acc + e._count.participants, 0)
  const totalAttended = attendedRows.reduce((acc, r) => acc + r._count._all, 0)
  const crewAccounts = accounts.filter((a) => a.role === 'CREW').length
  const staffAccounts = accounts.filter((a) => a.role !== 'CREW').length
  const activeEvents = events.filter((e) => e.status === 'ACTIVE').length

  const stats = [
    { icon: <CalendarDays size={18} />, value: events.length, label: 'Total Event', note: `${activeEvents} aktif` },
    { icon: <Bus size={18} />, value: totalUnits, label: 'Total Bus / Unit', note: 'semua event' },
    { icon: <Users size={18} />, value: totalPeserta, label: 'Total Peserta', note: 'semua event' },
    {
      icon: <ShieldCheck size={18} />,
      value: totalAttended,
      label: 'Sudah Hadir',
      note: totalPeserta > 0 ? `${Math.round((totalAttended / totalPeserta) * 100)}% dari seluruh peserta` : 'semua event',
    },
    { icon: <UserCog size={18} />, value: staffAccounts, label: 'Akun Owner & Admin', note: 'mengelola panel' },
    { icon: <UserCog size={18} />, value: crewAccounts, label: 'Akun Crew', note: 'untuk scan QR' },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[#1b3555]">Pengawasan Sistem</h1>
        <p className="mt-0.5 text-sm text-[#657080]">
          Ringkasan seluruh event, akun, dan aktivitas terbaru lintas event.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#dfe4e8] bg-white p-4 shadow-sm">
            <span className="text-[#1b4f9c]">{s.icon}</span>
            <p className="mt-2 text-2xl font-black text-[#1b3555]">{s.value.toLocaleString('id-ID')}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">{s.label}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#657080]">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#1b3555]">Kondisi Tiap Event</h2>
        <p className="mt-0.5 text-xs text-[#657080]">Jumlah bus/unit, peserta, kehadiran, dan crew per event.</p>
        {events.length === 0 ? (
          <p className="mt-4 text-xs text-[#9aa3af]">Belum ada event sama sekali.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                <tr className="border-b border-[#eef0f3]">
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Bus / Unit</th>
                  <th className="py-2 pr-3 text-right">Crew</th>
                  <th className="py-2 pr-3 text-right">Peserta</th>
                  <th className="py-2 text-right">Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f6f8]">
                {events.map((e) => {
                  const crewAssignments = e.buses.reduce((acc, b) => acc + b._count.workers, 0)
                  return (
                    <tr key={e.id} className="text-[#1b3555]">
                      <td className="py-2 pr-3">
                        <Link href={`/admin/events/${e.id}`} className="font-bold hover:text-[#1b4f9c]">
                          {e.title}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-[#657080]">{formatTanggalRentang(e.date, e.dateEnd)}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_CLS[e.status] ?? ''}`}>
                          {STATUS_LABEL[e.status] ?? e.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{e._count.buses}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{crewAssignments}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{e._count.participants}</td>
                      <td className="py-2 text-right tabular-nums">{attendedMap.get(e.id) ?? 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#1b3555]">Daftar Akun</h2>
        <p className="mt-0.5 text-xs text-[#657080]">Semua akun yang bisa masuk ke sistem.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
              <tr className="border-b border-[#eef0f3]">
                <th className="py-2 pr-3">Username</th>
                <th className="py-2 pr-3">Level</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3 text-right">Penugasan</th>
                <th className="py-2 text-right">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f6f8]">
              {accounts.map((a) => (
                <tr key={a.id} className="text-[#1b3555]">
                  <td className="py-2 pr-3 font-bold">@{a.username}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ROLE_CLS[a.role] ?? ''}`}>
                      {ROLE_LABEL[a.role] ?? a.role}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[#657080]">{a.name ?? '—'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-[#657080]">
                    {a.role === 'CREW' ? `${a._count.workers} bus` : '—'}
                  </td>
                  <td className="py-2 text-right text-[#657080]">{formatWaktuLengkap(new Date(a.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 rounded-xl bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold text-[#657080]">
          Sandi tidak pernah ditampilkan di sini. Setiap admin/owner bisa mengganti sandinya sendiri lewat tombol
          “Ganti Sandi” di header panel.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#1b3555]">
              <History size={15} /> Aktivitas Terbaru (semua event)
            </h2>
            <p className="mt-0.5 text-xs text-[#657080]">Jejak aksi admin, crew, dan participant di seluruh sistem.</p>
          </div>
          <Link href="/admin/logs" className="shrink-0 text-xs font-bold text-[#1b4f9c] hover:text-[#16407d]">
            Riwayat lengkap →
          </Link>
        </div>
        {logs.length === 0 ? (
          <p className="mt-4 text-xs text-[#9aa3af]">Belum ada aktivitas tercatat.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#eef1f4]">
            {logs.map((log) => (
              <LogEntry
                key={log.id}
                className="px-0"
                log={{
                  id: log.id,
                  action: log.action,
                  detail: log.detail,
                  createdAt: log.createdAt,
                  user: log.user,
                  event: log.event,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
