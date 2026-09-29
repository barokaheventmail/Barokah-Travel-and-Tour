import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { cookieOpts, getSessionCookieName, signSession, slotOfRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

const DUMMY_HASH = '$2b$10$OyeDM9NMGCtakHwJ/qrORutPReVjNeD.uQzUWcs7heLGsU9xpREV.'
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 5
const attempts = new Map<string, { count: number; resetAt: number }>()

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

function rateLimited(key: string): boolean {
  const now = Date.now()
  const rec = attempts.get(key)
  if (!rec || rec.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  rec.count += 1
  return rec.count > MAX_ATTEMPTS
}

export async function POST(request: NextRequest) {
  let body: { username?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 })
  }

  const ip = clientIp(request)
  const key = `${ip}:${username.toLowerCase()}`
  if (rateLimited(key)) {
    logger.warn('login rate limited', { ip, username })
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' }, { status: 429 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

  if (!user || !ok) {
    await prisma.activityLog.create({
      data: { userId: user?.id ?? null, action: 'auth.login.failed', detail: { username } },
    })
    logger.warn('login failed', { username, reason: user ? 'wrong_password' : 'user_not_found' })
    return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 })
  }

  const token = await signSession({ sub: user.id, username: user.username, role: user.role })
  await prisma.activityLog.create({
    data: { userId: user.id, action: 'auth.login.success', detail: { username: user.username, role: user.role } },
  })
  logger.info('login ok', { username, role: user.role })

  const res = NextResponse.json({ ok: true, role: user.role, username: user.username, scope: slotOfRole(user.role) })
  res.cookies.set(getSessionCookieName(slotOfRole(user.role)), token, cookieOpts())
  return res
}