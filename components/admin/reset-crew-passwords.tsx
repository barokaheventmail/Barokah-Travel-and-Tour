'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Copy, KeyRound, Loader2, ShieldAlert, X } from 'lucide-react'
import { useModal } from '@/components/admin/use-modal'

type ResetRow = { username: string; name: string | null; buses: string[]; password: string }

export function ResetCrewPasswordsButton({
  eventId,
  totalCrew,
  mode = 'button',
  open: controlledOpen,
  onOpenChange,
}: {
  eventId: string
  totalCrew: number
  mode?: 'button' | 'modal'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useModal(controlledOpen, onOpenChange)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reset, setReset] = useState<ResetRow[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/workers/reset-passwords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal reset password.')
      setReset(data.reset)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal reset password.')
    } finally {
      setLoading(false)
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1200)
    } catch {
      // ignore
    }
  }

  function resetAndClose() {
    setOpen(false)
    setReset(null)
    setError(null)
  }

  return (
    <>
      {mode === 'button' && (
        <button
          type="button"
          onClick={() => {
            setReset(null)
            setError(null)
            setOpen(true)
          }}
          disabled={totalCrew === 0}
          title={totalCrew === 0 ? 'Belum ada crew di event ini.' : 'Kembalikan semua password crew ke pola username+1123.'}
          className="flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-4 py-2.5 text-xs font-bold text-[#657080] transition-colors duration-200 hover:bg-[#f1f3f5] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KeyRound size={13} /> Terapkan Pola Crew
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="animate-fade-up flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1b3555]">Terapkan Pola Password Crew</h3>
              <button type="button" onClick={resetAndClose} className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]">
                <X size={15} />
              </button>
            </div>

            {reset === null ? (
              <div className="mt-4">
                <div className="flex items-start gap-2 rounded-2xl bg-[#fff7e0] p-4">
                  <ShieldAlert className="mt-0.5 shrink-0 text-[#b98a12]" size={16} />
                  <div>
                    <p className="text-xs font-bold text-[#b98a12]">
                      {totalCrew === 0
                        ? 'Belum ada crew di event ini.'
                        : `${totalCrew} akun crew akan dikembalikan ke pola username + 1123.`}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#8a6d1d]">
                      Password lama langsung tidak berlaku, termasuk password manual yang pernah diganti per crew —
                      semuanya dikembalikan ke pola username + 1123. Bagikan password baru yang muncul setelah ini ke
                      crew masing-masing.
                    </p>
                  </div>
                </div>
                {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={loading || totalCrew === 0}
                    className="flex items-center gap-1.5 rounded-full bg-[#b98a12] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#9d7810] active:scale-95 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Ya, Terapkan
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                {reset.length === 0 ? (
                  <p className="rounded-xl bg-[#eef3fb] px-3 py-2 text-xs font-semibold text-[#1b4f9c]">
                    Tidak ada crew di event ini.
                  </p>
                ) : (
                  <>
                    <p className="mb-2 rounded-xl bg-[#fff7e0] px-3 py-2 text-[11px] font-semibold text-[#b98a12]">
                      Password baru hanya tampil sekali ini. Segera bagikan ke crew masing-masing.
                    </p>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-[#dfe4e8]">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                          <tr>
                            <th className="px-3 py-2">Crew</th>
                            <th className="px-3 py-2">Username</th>
                            <th className="px-3 py-2">Password</th>
                            <th className="px-3 py-2 text-right">Salin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef0f3]">
                          {reset.map((r, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2">
                                <p className="font-semibold text-[#1b3555]">{r.name || r.username}</p>
                                <p className="text-[10px] font-semibold text-[#9aa3af]">{r.buses.join(', ')}</p>
                              </td>
                              <td className="px-3 py-2 font-mono text-[#1b4f9c]">@{r.username}</td>
                              <td className="px-3 py-2 font-mono text-[#1b3555]">{r.password}</td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => copy(`${r.username} / ${r.password}`, `row-${i}`)}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#dfe4e8] px-2 py-1 text-[11px] font-bold text-[#657080] hover:bg-[#f1f3f5]"
                                >
                                  {copied === `row-${i}` ? <Check size={11} /> : <Copy size={11} />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => copy(reset.map((r) => `${r.name || r.username}\t${r.username}\t${r.password}`).join('\n'), 'all')}
                        className="flex items-center gap-1.5 rounded-full bg-[#f5b915] px-4 py-2 text-xs font-bold text-[#1d2733] hover:bg-[#e4aa09]"
                      >
                        {copied === 'all' ? <Check size={13} /> : <Copy size={13} />} Salin Semua
                      </button>
                      <button
                        type="button"
                        onClick={resetAndClose}
                        className="rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white hover:bg-[#143d79]"
                      >
                        Selesai
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}