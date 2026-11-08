import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  const ids = (body as { ids?: unknown } | null)?.ids
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'Urutan banner tidak valid.' }, { status: 400 })
  }

  const current = await prisma.banner.findMany({ select: { id: true } })
  if (
    ids.length !== current.length ||
    new Set(ids).size !== ids.length ||
    !current.every((banner) => ids.includes(banner.id))
  ) {
    return NextResponse.json({ error: 'Urutan banner tidak valid.' }, { status: 400 })
  }

  try {
    const banners = await prisma.$transaction(async (tx) => {
      for (const [order, id] of ids.entries()) {
        await tx.banner.update({ where: { id }, data: { order } })
      }
      await tx.activityLog.create({
        data: { userId: session.sub, action: 'banner.reorder', detail: { count: ids.length } },
      })
      return tx.banner.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
    })
    revalidatePath('/')
    logger.info('banner reordered', { by: session.username, count: ids.length })
    return NextResponse.json({ banners })
  } catch (err) {
    logger.error('banner reorder failed', { by: session.username, err })
    return NextResponse.json({ error: 'Gagal menyimpan urutan banner.' }, { status: 500 })
  }
}
