'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, FileDown, Loader2, ShieldAlert, X } from 'lucide-react'
import { useModal } from '@/components/admin/use-modal'
import { PrintButton } from '@/components/admin/print-button'
import { crewPassword } from '@/lib/crew-password'
import { formatTanggal } from '@/lib/dates'

export type CredentialBus = { name: string; usernames: string[]; customUsernames?: string[] }

type Row = { busName: string; username: string; password: string; custom: boolean }

/**
 * Daftar kredensial crew untuk admin. Password dihitung di client dari username
 * (pola username + 1123) -- tidak ada password plaintext yang diambil dari
 * server, karena yang tersimpan di database tetap hash bcrypt.
 *
 * Crew yang sandinya diganti manual tidak bisa ditampilkan di sini (hanya
 * hash-nya yang tersimpan), jadi barisnya ditandai "password manual" dan
 * reminded untuk dibaca dari panel crew.
 */
export function CrewCredentialsButton({
  eventId,
  eventTitle,
  eventDate,
  buses,
  totalCrew,
  mode = 'button',
  open: controlledOpen,
  onOpenChange,
}: {
  eventId: string
  eventTitle: string
  eventDate: string
  buses: CredentialBus[]
  totalCrew: number
  mode?: 'button' | 'modal'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useModal(controlledOpen, onOpenChange)
  // Modal dirender lewat portal ke <body> supaya saat print ia menjadi anak
  // langsung body: akar cetak tidak lagi terpotong oleh overlay fixed.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [copied, setCopied] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rows: Row[] = buses.flatMap((b) =>
    b.usernames.map((u) => ({
      busName: b.name,
      username: u,
      password: crewPassword(u),
      custom: b.customUsernames?.includes(u) ?? false,
    })),
  )
  const customCount = rows.filter((r) => r.custom).length

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1200)
    } catch {
      // ignore
    }
  }

  // Dipakai ketika admin yakin pola ini harus berlaku untuk crew yang dibuat
  // sebelum pola ada. Endpoint yang dipakai sama dengan menu "Terapkan
  // Password Crew", jadi cukup satu sumber kebenaran di server.
  async function applyPattern() {
    setApplying(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/workers/reset-passwords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menerapkan password crew.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menerapkan password crew.')
    } finally {
      setApplying(false)
    }
  }

  function resetAndClose() {
    setOpen(false)
    setError(null)
  }

  return (
    <>
      {mode === 'button' && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={totalCrew === 0}
          className="flex items-center gap-1.5 rounded-full border border-[#dfe4e8] px-4 py-2.5 text-xs font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef3fb] active:scale-95 disabled:opacity-60"
        >
          <FileDown size={13} /> Kredensial Crew (PDF)
        </button>
      )}

      {open && mounted && createPortal(
        <div className="print-credentials-root fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="animate-fade-up flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl print-credentials">
            <div className="flex items-center justify-between gap-2 print:hidden">
              <h3 className="text-sm font-bold text-[#1b3555]">Kredensial Crew</h3>
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="print-avoid-break border-b-2 border-[#1b4f9c] pb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa3af]">Kredensial Crew</p>
              <h1 className="mt-1 text-lg font-bold leading-tight text-[#1b3555]">{eventTitle}</h1>
              <p className="mt-1 text-[11px] text-[#657080]">{formatTanggal(new Date(eventDate))}</p>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#fff7e0] p-3 print:hidden">
              <ShieldAlert className="mt-0.5 shrink-0 text-[#b98a12]" size={15} />
              <div>
                <p className="text-[11px] font-bold text-[#8a6d1d]">
                  Password dihitung dari username (username + 1123), bukan dibaca dari database.
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#8a6d1d]">
                  {customCount > 0 ? (
                    <>
                      <span className="font-bold">{customCount} crew</span> memakai password manual sehingga tidak
                      bisa ditampilkan di sini — bagikan sandi yang kamu tentukan saat mengganti password mereka di tab
                      Bus &amp; Unit.
                    </>
                  ) : (
                    <>
                      Crew yang dibuat sebelum pola ini ada masih memakai password lamanya. Tekan "Terapkan ke Semua
                      Crew" (atau ganti password satu per satu) agar password di bawah benar-benar berlaku.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="print-credentials-scroll mt-3 flex-1 overflow-y-auto rounded-xl border border-[#dfe4e8] print:overflow-visible print:border-0">
              {rows.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs font-semibold text-[#9aa3af]">
                  Belum ada crew di event ini.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wide text-[#9aa3af] print:bg-[#f8fafc]">
                    <tr>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Password</th>
                      <th className="px-3 py-2 text-right print:hidden">Salin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef0f3]">
                    {rows.map((r, i) => (
                      <tr key={`${r.busName}-${r.username}-${i}`} className="print-avoid-break">
                        <td className="px-3 py-2 font-semibold text-[#1b3555]">{r.busName}</td>
                        <td className="px-3 py-2 font-mono text-[#1b4f9c]">@{r.username}</td>
                        <td className="px-3 py-2 font-mono text-[#1b3555]">
                          {r.custom ? (
                            <span className="font-sans text-[11px] font-bold text-[#b98a12]">password manual</span>
                          ) : (
                            r.password
                          )}
                        </td>
                        <td className="px-3 py-2 text-right print:hidden">
                          <button
                            type="button"
                            disabled={r.custom}
                            title={r.custom ? 'Password manual tidak bisa dibaca dari database.' : undefined}
                            onClick={() => copy(`${r.username} / ${r.password}`, `row-${i}`)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] px-2 py-1 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {copied === `row-${i}` ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600 print:hidden">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={applyPattern}
                disabled={applying || totalCrew === 0}
                className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#f1f3f5] disabled:opacity-60"
              >
                {applying ? <Loader2 size={13} className="animate-spin" /> : null} Terapkan ke Semua Crew
              </button>
              <button
                type="button"
                onClick={() =>
                  copy(
                    rows
                      .filter((r) => !r.custom)
                      .map((r) => `${r.busName}\t${r.username}\t${r.password}`)
                      .join('\n'),
                    'all',
                  )
                }
                disabled={rows.filter((r) => !r.custom).length === 0}
                className="flex items-center gap-1.5 rounded-full bg-[#f5b915] px-4 py-2 text-xs font-bold text-[#1d2733] hover:bg-[#e4aa09] disabled:opacity-60"
              >
                {copied === 'all' ? <Check size={13} /> : <Copy size={13} />} Salin Semua
              </button>
              <PrintButton />
            </div>

            <p className="mt-3 text-right text-[10px] text-[#9aa3af] print:hidden">
              {rows.length} akun · simpan di tempat aman, jangan dibagikan ke peserta.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
