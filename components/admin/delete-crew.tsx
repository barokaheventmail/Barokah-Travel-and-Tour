'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, ShieldAlert, Trash2, X } from 'lucide-react'
import { useModal } from '@/components/admin/use-modal'

type CrewItem = { username: string; name: string | null; buses: string[] }
type Result = { deleted: CrewItem[]; unlinked: CrewItem[] }

export function DeleteCrewButton({
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
  const [result, setResult] = useState<Result | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/workers/delete-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus crew.')
      setResult(data)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus crew.')
    } finally {
      setLoading(false)
    }
  }

  function close() {
    setOpen(false)
    setResult(null)
    setError(null)
  }

  return (
    <>
      {mode === 'button' && (
        <button
          type="button"
          onClick={() => {
            setResult(null)
            setError(null)
            setOpen(true)
          }}
          disabled={totalCrew === 0}
          title={totalCrew === 0 ? 'Belum ada crew di event ini.' : 'Hapus semua akun crew sekaligus.'}
          className="flex items-center gap-1.5 rounded-full border border-[#f0c4c4] bg-white px-4 py-2.5 text-xs font-bold text-[#c03a3a] transition-colors duration-200 hover:bg-[#fdf0f0] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={13} /> Hapus Crew
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="animate-fade-up flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1b3555]">Hapus Crew</h3>
              <button type="button" onClick={close} className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]">
                <X size={15} />
              </button>
            </div>

            {result === null ? (
              <div className="mt-4">
                <div className="flex items-start gap-2 rounded-2xl bg-[#fdf0f0] p-4">
                  <ShieldAlert className="mt-0.5 shrink-0 text-[#c03a3a]" size={16} />
                  <div>
                    <p className="text-xs font-bold text-[#c03a3a]">
                      {totalCrew === 0 ? 'Belum ada crew di event ini.' : `${totalCrew} akun crew (semua unit) akan dihapus sepenuhnya.`}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#a04545]">
                      Login akun langsung tidak berlaku lagi. Riwayat scan tetap tersimpan. Generate ulang nanti akan dimulai dari
                      username pertama lagi.
                    </p>
                  </div>
                </div>
                {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={loading || totalCrew === 0}
                    className="flex items-center gap-1.5 rounded-full bg-[#c03a3a] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#a32f2f] active:scale-95 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Ya, Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                {result.deleted.length === 0 && result.unlinked.length === 0 ? (
                  <p className="rounded-xl bg-[#eef3fb] px-3 py-2 text-xs font-semibold text-[#1b4f9c]">
                    Tidak ada crew di event ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {result.deleted.length > 0 && (
                      <div className="rounded-xl bg-[#fdf0f0] px-3 py-2">
                        <p className="text-xs font-bold text-[#c03a3a]">{result.deleted.length} akun dihapus sepenuhnya</p>
                        <p className="mt-1 text-[11px] font-semibold text-[#9aa3af]">
                          {result.deleted.map((d) => `@${d.username}`).join(', ')}
                        </p>
                      </div>
                    )}
                    {result.unlinked.length > 0 && (
                      <div className="rounded-xl bg-[#fff7e0] px-3 py-2">
                        <p className="text-xs font-bold text-[#b98a12]">
                          {result.unlinked.length} akun masih dipakai unit lain, hanya dilepas dari event ini
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-[#9aa3af]">
                          {result.unlinked.map((d) => `@${d.username}`).join(', ')}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={close}
                        className="rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white hover:bg-[#143d79]"
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}