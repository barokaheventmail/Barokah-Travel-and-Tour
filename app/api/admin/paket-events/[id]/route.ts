import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { normalizePaketOrder, reorderPaket } from '@/lib/paket'

type Params = { params: Promise<{ id: string }> }

const priceSchema = z.object({
  label: z.string().trim().min(1, 'Label harga wajib diisi'),
  price: z.coerce.number().int().min(0).default(0),
  facilities: z.array(z.string().trim().min(1)).optional(),
  badge: z.string().trim().nullish(),
})

const paketPatchSchema = z.object({
  title: z.string().trim().min(1, 'Judul paket wajib diisi').optional(),
  location: z.string().trim().optional(),
  description: z.string().trim().nullish(),
  subtitle: z.string().trim().nullish(),
  body: z.string().trim().nullish(),
  badge: z.string().trim().nullish(),
  order: z.coerce.number().int().min(0).optional(),
  prices: z.array(priceSchema).optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.paketEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Paket event tidak ditemukan.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = paketPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  const { title, location, description, subtitle, body: bodyText, badge, order, prices } = parsed.data

  const data: Prisma.PaketEventUpdateInput = {}
  if (title !== undefined) data.title = title
  if (location !== undefined) data.location = location
  if (description !== undefined) data.description = description || null
  if (subtitle !== undefined) data.subtitle = subtitle || null
  if (bodyText !== undefined) data.body = bodyText || null
  if (badge !== undefined) data.badge = badge || null
  const orderChanged = order !== undefined
  const pricesChanged = prices !== undefined

  if (Object.keys(data).length === 0 && !orderChanged && !pricesChanged) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah.' }, { status: 400 })
  }

  const paket = await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.paketEvent.update({ where: { id }, data })
    }
    if (pricesChanged) {
      await tx.paketPrice.deleteMany({ where: { paketId: id } })
      const rows = (prices ?? []).map((p, i) => ({
        paketId: id,
        label: p.label,
        price: p.price,
        facilities: p.facilities ?? [],
        badge: p.badge || null,
        order: i + 1,
      }))
      if (rows.length > 0) await tx.paketPrice.createMany({ data: rows })
    }
    if (orderChanged) {
      await reorderPaket(tx, id, order as number)
    }
    const updated = await tx.paketEvent.findUniqueOrThrow({
      where: { id },
      include: { prices: { orderBy: { order: 'asc' } } },
    })
    await tx.activityLog.create({
      data: { userId: session.sub, action: 'paket.update', detail: { title: updated.title } },
    })
    return updated
  })
  logger.info('paket updated', { paketId: id, by: session.username })

  return NextResponse.json({ paket })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.paketEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Paket event tidak ditemukan.' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({
      data: { userId: session.sub, action: 'paket.delete', detail: { title: existing.title } },
    })
    await tx.paketEvent.delete({ where: { id } })
    await normalizePaketOrder(tx)
  })
  logger.info('paket deleted', { paketId: id, title: existing.title, by: session.username })

  if (existing.imageUrl) rmImage(existing.imageUrl).catch(() => undefined)

  return NextResponse.json({ ok: true })
}

async function rmImage(url: string): Promise<void> {
  const prefix = '/uploads/paket-events/'
  if (!url.startsWith(prefix)) return
  const filename = url.slice(prefix.length)
  if (!filename || filename.includes('/') || filename.includes('..')) return
  const { rm } = await import('fs/promises')
  const { join, resolve } = await import('path')
  await rm(join(resolve(process.cwd(), 'uploads', 'paket-events'), filename), { force: true })
}
