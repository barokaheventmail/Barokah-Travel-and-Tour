'use client'

import { useState } from 'react'
import { Check, KeyRound, Loader2, X } from 'lucide-react'
import { useModal } from '@/components/admin/use-modal'

const inputCls =
  'w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2.5 text-sm font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15'

/**
 * Ganti sandi akun sendiri (admin & owner). Sesi yang sedang aktif tetap
 * berlaku, karena sandi tidak ikut disimpan di dalam JWT.
 */
export function ChangePasswordButton({ username }: { username: string }) {
  const [open, setOpen] = useModal()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function close() {
    setOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setDone(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi sandi tidak sama dengan sandi baru.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Gagal mengganti sandi.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengganti sandi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Ganti sandi ${username}`}
        className="flex items-center gap-1.5 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-bold text-[#1b3555] transition-colors duration-200 hover:bg-[#f1f3f5]"
      >
        <KeyRound size={13} /> Ganti Sandi
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ganti sandi"
            className="animate-fade-up flex w-full max-w-sm flex-col rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1b3555]">Ganti Sandi</h3>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]"
                aria-label="Tutup"
              >
                <X size={15} />
              </button>
            </div>

            {done ? (
              <div className="mt-4 space-y-4">
                <p className="flex items-center gap-2 rounded-xl bg-[#e6f4ea] px-3 py-2.5 text-xs font-bold text-[#2ca84a]">
                  <Check size={14} /> Sandi {username} berhasil diganti. Gunakan sandi baru saat login berikutnya.
                </p>
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
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <p className="text-[11px] font-semibold text-[#657080]">
                  Akun <span className="font-bold text-[#1b4f9c]">{username}</span>. Sandi baru minimal 6 karakter.
                </p>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">Sandi lama</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`mt-1 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">Sandi baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`mt-1 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                    Ulangi sandi baru
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`mt-1 ${inputCls}`}
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !currentPassword || newPassword.length < 6}
                    className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Simpan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
