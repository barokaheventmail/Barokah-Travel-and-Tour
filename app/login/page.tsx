'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogIn, ShieldCheck } from 'lucide-react'

type LoginRole = 'ADMIN' | 'OWNER' | 'CREW'
type LoginSession = { sub: string; username: string; role: LoginRole; slot: 'ADMIN' | 'CREW' }

// ADMIN & OWNER sama-sama masuk ke panel admin; crew masuk ke aplikasinya.
function resolveDest(next: string | null, role: string): string {
  const target = role === 'CREW' ? '/crew' : '/admin'
  if (!next || !next.startsWith('/') || next.startsWith('//')) return target
  const isAdminPath = next.startsWith('/admin')
  const allowed = role !== 'CREW' || !isAdminPath
  return allowed ? next : target
}

function isAllowedNext(next: string | null, role: string): boolean {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return false
  return role !== 'CREW' || !next.startsWith('/admin')
}

function roleFromNext(next: string | null): LoginSession['slot'] | null {
  if (!next) return null
  if (next.startsWith('/admin')) return 'ADMIN'
  if (next.startsWith('/crew')) return 'CREW'
  return null
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [next, setNext] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [sessions, setSessions] = useState<LoginSession[]>([])

  const redirectAfterLogin = useCallback(
    (role: string) => {
      router.replace(resolveDest(next, role))
      router.refresh()
    },
    [next, router]
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedNext = params.get('next')
    const scopeParam = params.get('scope')?.toUpperCase()
    const requestedSlot: LoginSession['slot'] | null =
      scopeParam === 'ADMIN' || scopeParam === 'CREW' ? scopeParam : roleFromNext(requestedNext)
    setNext(requestedNext)
    fetch('/api/auth/me')
      .then(async (r) => {
        if (!r.ok) return
        const data = await r.json()
        const activeSessions: LoginSession[] = (data.sessions ?? (data.user ? [data.user] : [])) as LoginSession[]
        setSessions(activeSessions)
        if (params.get('switch') === '1' || !requestedSlot) return
        // Dicari per slot: sesi owner tetap memenuhi permintaan scope admin.
        const active = activeSessions.find((session) => session.slot === requestedSlot)
        if (!active) return
        if (requestedNext && !isAllowedNext(requestedNext, active.role)) return
        router.replace(resolveDest(requestedNext, active.role))
        router.refresh()
      })
      .finally(() => setChecking(false))
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Gagal masuk.')
        return
      }
      redirectAfterLogin(data.role ?? 'CREW')
    } catch {
      setError('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fa] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="guide-pattern rounded-2xl border border-[#dfe4e8] bg-white p-7 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1b4f9c] text-white">
              <ShieldCheck size={28} />
            </div>
            <h1 className="mt-4 text-xl font-bold text-[#1b3555]">Panel Barokah Tour</h1>
            <p className="mt-1 text-sm text-[#657080]">Masuk untuk Owner, Admin &amp; Crew</p>
          </div>

          {sessions.length > 0 && (
            <div className="mt-5 rounded-xl border border-[#dce8e1] bg-[#f4faf6] p-4 text-xs">
              <p className="flex items-center gap-2 font-bold text-[#2ca84a]">
                <ShieldCheck size={15} className="shrink-0" />
                Sesi login aktif
              </p>
              <p className="mt-1 leading-relaxed text-[#657080]">
                Akun lain bisa login bersamaan di sesi terpisah. Login akun baru tidak akan mengeluarkan sesi yang
                sudah aktif.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sessions.map((session) => (
                  <span
                    key={session.sub}
                    className="rounded-full border border-[#dce8e1] bg-white px-3 py-1.5 font-bold text-[#1b4f9c]"
                  >
                    {session.role} · {session.username}
                  </span>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#657080]" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                disabled={checking}
                placeholder="owner / admin / crew"
                className="mt-1.5 w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#657080]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={checking}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || checking}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1b4f9c] py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          <a href="/" className="mt-5 block text-center text-xs font-semibold text-[#657080] hover:text-[#1b4f9c]">
            ← Kembali ke beranda
          </a>
        </div>
      </div>
    </main>
  )
}