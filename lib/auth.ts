import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './db'

export const LEGACY_COOKIE_NAME = 'bt_session'
export const COOKIE_NAME = LEGACY_COOKIE_NAME
export const SESSION_COOKIE_NAMES = {
  ADMIN: 'bt_session_admin',
  CREW: 'bt_session_crew',
} as const
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

/** Slot = COOKIE yang dipakai sesi. ADMIN & OWNER berbagi slot admin. */
export type SessionSlot = keyof typeof SESSION_COOKIE_NAMES
/** Role = peran user di database & isi claim `role` pada JWT. */
export type SessionRole = 'ADMIN' | 'OWNER' | 'CREW'
export type Session = {
  sub: string
  username: string
  role: SessionRole
  slot: SessionSlot
}

type SessionInput = Omit<Session, 'slot'>

/** ADMIN dan OWNER memakai cookie sesi admin, jadi keduanya satu slot. */
export function slotOfRole(role: SessionRole): SessionSlot {
  return role === 'CREW' ? 'CREW' : 'ADMIN'
}

/** Sesi yang boleh mengelola panel admin (bukan crew). Narrowing ke Session. */
export function canManage(session: Session | null | undefined): session is Session {
  return session?.role === 'ADMIN' || session?.role === 'OWNER'
}

const DEV_SECRET = 'dev-secret-change-me'

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET || DEV_SECRET
  if (value === DEV_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET wajib di-set di lingkungan produksi.')
  }
  return new TextEncoder().encode(value)
}

export function getSessionCookieName(slot: SessionSlot): string {
  return SESSION_COOKIE_NAMES[slot]
}

export const cookieOpts = () => {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

export async function signSession(session: SessionInput): Promise<string> {
  return new SignJWT({ username: session.username, role: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret())
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    const role = payload.role
    if (!payload.sub || (role !== 'ADMIN' && role !== 'OWNER' && role !== 'CREW')) return null
    return {
      sub: payload.sub,
      username: String(payload.username ?? ''),
      role,
      slot: slotOfRole(role),
    }
  } catch {
    return null
  }
}

export async function getSessionToken(scope?: SessionSlot): Promise<string | null> {
  const store = await cookies()
  if (scope) {
    const scopedToken = store.get(getSessionCookieName(scope))?.value
    return scopedToken ?? store.get(LEGACY_COOKIE_NAME)?.value ?? null
  }
  return (
    store.get(LEGACY_COOKIE_NAME)?.value ??
    store.get(SESSION_COOKIE_NAMES.ADMIN)?.value ??
    store.get(SESSION_COOKIE_NAMES.CREW)?.value ??
    null
  )
}

async function loadSession(token: string | undefined, expectedSlot?: SessionSlot): Promise<Session | null> {
  if (!token) return null
  const verified = await verifySession(token)
  if (!verified || (expectedSlot && verified.slot !== expectedSlot)) return null
  const user = await prisma.user.findUnique({
    where: { id: verified.sub },
    select: { id: true, username: true, role: true },
  })
  if (!user || user.role !== verified.role) return null
  return { sub: user.id, username: user.username, role: verified.role, slot: slotOfRole(user.role) }
}

export async function getSession(scope: SessionSlot): Promise<Session | null> {
  const store = await cookies()
  const scopedToken = store.get(getSessionCookieName(scope))?.value
  if (scopedToken) return loadSession(scopedToken, scope)
  return loadSession(store.get(LEGACY_COOKIE_NAME)?.value, scope)
}

export async function getSessions(): Promise<Session[]> {
  const store = await cookies()
  const admin = await loadSession(store.get(SESSION_COOKIE_NAMES.ADMIN)?.value, 'ADMIN')
  const crew = await loadSession(store.get(SESSION_COOKIE_NAMES.CREW)?.value, 'CREW')
  const sessions = [admin, crew].filter((session): session is Session => Boolean(session))
  if (store.get(SESSION_COOKIE_NAMES.ADMIN)?.value || store.get(SESSION_COOKIE_NAMES.CREW)?.value) {
    return sessions
  }
  const legacy = await loadSession(store.get(LEGACY_COOKIE_NAME)?.value)
  return legacy ? [legacy] : sessions
}

export async function requireAdminSession(): Promise<Session | null> {
  return getSession('ADMIN')
}

export async function requireUser(): Promise<Session | null> {
  return loadSession((await getSessionToken()) ?? undefined)
}

export async function requireCrewSession(): Promise<Session | null> {
  const store = await cookies()
  const crewToken = store.get(SESSION_COOKIE_NAMES.CREW)?.value
  if (crewToken) return loadSession(crewToken, 'CREW')
  const adminToken = store.get(SESSION_COOKIE_NAMES.ADMIN)?.value
  if (adminToken) return loadSession(adminToken, 'ADMIN')
  return loadSession(store.get(LEGACY_COOKIE_NAME)?.value)
}
