'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Copy, Loader2, UserPlus, X } from 'lucide-react'
import { useModal } from '@/components/admin/use-modal'

export type GenerateBus = { id: string; name: string; workerCount: number }

type CreatedRow = { busName: string; username: string; password: string }

const inputCls =
  'w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15'

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 12) || 'unit'
  )
}

export function GenerateCrewButton({
  eventId,
  eventTitle,
  defaultPrefix,
  buses,
  mode = 'button',
  open: controlledOpen,
  onOpenChange,
}: {
  eventId: string
  eventTitle: string
  defaultPrefix: string | null
  buses: GenerateBus[]
  // 'button' = pemicunya ikut dirender. 'modal' = hanya layarnya, pemicunya
  // dibuat oleh ActionMenu supaya seragam dengan aksi lain di menu.
  mode?: 'button' | 'modal'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useModal(controlledOpen, onOpenChange)
  const [prefix, setPrefix] = useState(defaultPrefix ?? slugify(eventTitle))
  // Jumlah akun diinput manual per unit (bukan satu angka global). Default-nya
  // mengikuti jumlah crew yang sudah ada supaya unit yang sudah lengkap tidak
  // ikut digenerate ulang tanpa sengaja.
  const [targets, setTargets] = useState<Record<string, number>>(() =>
    Object.fromEntries(buses.map((b) => [b.id, b.workerCount > 0 ? b.workerCount : 1])),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedRow[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const newCountFor = (b: GenerateBus) => Math.max(0, (targets[b.id] ?? 0) - b.workerCount)
  const totalNew = buses.reduce((acc, b) => acc + newCountFor(b), 0)
  const totalTarget = buses.reduce((acc, b) => acc + (targets[b.id] ?? 0), 0)
  const totalExisting = buses.reduce((acc, b) => acc + b.workerCount, 0)
  const includedCount = buses.filter((b) => (targets[b.id] ?? 0) > 0).length

  function setAll(value: number) {
    setTargets(Object.fromEntries(buses.map((b) => [b.id, value])))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/workers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, perBusByBus: targets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal generate akun.')
      setCreated(data.created)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal generate akun.')
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
    setCreated(null)
    setError(null)
  }

  return (
    <>
      {mode === 'button' && (
        <button
          type="button"
          onClick={() => {
            if (defaultPrefix) setPrefix(defaultPrefix)
            setTargets(Object.fromEntries(buses.map((b) => [b.id, b.workerCount > 0 ? b.workerCount : 1])))
            setCreated(null)
            setError(null)
            setOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95"
        >
          <UserPlus size={13} /> Generate Akun Crew
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="animate-fade-up flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1b3555]">Generate Akun Crew</h3>
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-full p-1 text-[#657080] hover:bg-[#f1f3f5]"
              >
                <X size={15} />
              </button>
            </div>

            {!created ? (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">Kode event</label>
                  <p className="mb-1 text-[11px] text-[#9aa3af]">
                    Username jadi <span className="font-bold text-[#1b4f9c]">{prefix || 'kode'}1</span>,{' '}
                    <span className="font-bold text-[#1b4f9c]">{prefix || 'kode'}2</span>, … berurutan.
                  </p>
                  <input
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    placeholder="mis. dufan"
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                      Jumlah akun per unit
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#9aa3af]">Isi semua:</span>
                      {[0, 1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setAll(n)}
                          className="h-6 w-6 rounded-full border border-[#dfe4e8] text-[11px] font-bold text-[#657080] transition-colors hover:border-[#1b4f9c] hover:bg-[#eef3fb] hover:text-[#1b4f9c]"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mb-1 text-[11px] text-[#9aa3af]">
                    Ketik manual per unit. Isi <span className="font-bold text-[#1b4f9c]">0</span> untuk melewati unit
                    tersebut; angka di bawahnya adalah total crew/unit, jadi yang sudah ada tidak digenerate ulang.
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-[#dfe4e8]">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                        <tr>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2 text-right">Crew saat ini</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-right">Baru</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef0f3]">
                        {buses.map((b) => {
                          const value = targets[b.id] ?? 0
                          const fresh = newCountFor(b)
                          return (
                            <tr key={b.id} className={value === 0 ? 'text-[#9aa3af]' : 'text-[#1b3555]'}>
                              <td className="px-3 py-1.5 font-semibold">{b.name}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums">{b.workerCount}</td>
                              <td className="px-3 py-1.5 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  aria-label={`Total akun crew ${b.name}`}
                                  value={value}
                                  onChange={(e) =>
                                    setTargets((t) => ({
                                      ...t,
                                      [b.id]: Math.min(Math.max(0, Number(e.target.value) || 0), 10),
                                    }))
                                  }
                                  className="w-16 rounded-lg border border-[#dfe4e8] bg-[#f8fafc] px-2 py-1 text-right text-xs font-bold text-[#1b3555] outline-none focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
                                />
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums">
                                {fresh > 0 ? (
                                  <span className="font-bold text-[#2ca84a]">+{fresh}</span>
                                ) : (
                                  <span className="text-[#9aa3af]">0</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="rounded-xl bg-[#eef3fb] px-3 py-2 text-xs font-semibold text-[#1b4f9c]">
                  {includedCount} dari {buses.length} unit · total crew {totalExisting} → {totalTarget} ·{' '}
                  <span className="font-black">{totalNew}</span> akun baru
                </p>
                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || totalNew === 0 || !prefix.trim()}
                    className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Generate
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4">
                {created.length === 0 ? (
                  <p className="rounded-xl bg-[#eef3fb] px-3 py-2 text-xs font-semibold text-[#1b4f9c]">
                    Semua unit sudah lengkap. Tidak ada akun baru. (Unit lain tetap bisa dapat akun lewat panel per
                    unit.)
                  </p>
                ) : (
                  <>
                    <p className="mb-2 rounded-xl bg-[#fff7e0] px-3 py-2 text-[11px] font-semibold text-[#b98a12]">
                      Password hanya tampil sekali ini. Segera bagikan ke crew masing-masing. Salin tabel di bawah lalu
                      kirim ke相关负责人 unit.
                    </p>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-[#dfe4e8]">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">
                          <tr>
                            <th className="px-3 py-2">Unit</th>
                            <th className="px-3 py-2">Username</th>
                            <th className="px-3 py-2">Password</th>
                            <th className="px-3 py-2 text-right">Salin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef0f3]">
                          {created.map((r, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-semibold text-[#1b3555]">{r.busName}</td>
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
                        onClick={() =>
                          copy(
                            created.map((r) => `${r.busName}\t${r.username}\t${r.password}`).join('\n'),
                            'all',
                          )
                        }
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