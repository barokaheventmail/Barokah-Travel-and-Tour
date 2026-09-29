import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

const MIN_LENGTH = 6
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 10
const attempts = new Map<string, { count: number; resetAt: number }>()

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

/** ADMIN & OWNER sama-sama boleh mengganti sandi akunnya sendiri. */
export async function POST(request: NextRequest) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (rateLimited(session.sub)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' }, { status: 429 })
  }

  let body: { currentPassword?: unknown; newPassword?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Sandi lama dan sandi baru wajib diisi.' }, { status: 400 })
  }
  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json({ error: `Sandi baru minimal ${MIN_LENGTH} karakter.` }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'Sandi baru harus berbeda dari sandi lama.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, username: true, passwordHash: true },
  })
  if (!user) return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 })

  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) {
    await prisma.activityLog.create({
      data: { userId: user.id, action: 'auth.password.change', detail: { username: user.username, ok: false } },
    })
    logger.warn('password change rejected', { by: session.username, reason: 'wrong_current_password' })
    return NextResponse.json({ error: 'Sandi lama salah.' }, { status: 401 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } })
    await tx.activityLog.create({
      data: { userId: user.id, action: 'auth.password.change', detail: { username: user.username, ok: true } },
    })
  })

  // Percobaan yang berhasil mereset penghitung, jadi admin tidak terkunci
  // setelah berhasil mengganti sandinya.
  attempts.delete(session.sub)
  logger.info('password changed', { by: session.username, role: session.role })
  return NextResponse.json({ ok: true })
}
