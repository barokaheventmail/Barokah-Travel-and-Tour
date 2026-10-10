import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { reorderPaket } from '@/lib/paket'

const priceSchema = z.object({
  label: z.string().trim().min(1, 'Label harga wajib diisi'),
  price: z.coerce.number().int().min(0).default(0),
  facilities: z.array(z.string().trim().min(1)).optional(),
  badge: z.string().trim().nullish(),
})

const paketSchema = z.object({
  title: z.string().trim().min(1, 'Judul paket wajib diisi'),
  location: z.string().trim().default(''),
  description: z.string().trim().nullish(),
  subtitle: z.string().trim().nullish(),
  body: z.string().trim().nullish(),
  badge: z.string().trim().nullish(),
  order: z.coerce.number().int().min(0).default(0),
  prices: z.array(priceSchema).optional(),
})

function priceRows(prices: z.infer<typeof priceSchema>[] | undefined) {
  return (prices ?? []).map((p, i) => ({
    label: p.label,
    price: p.price,
    facilities: p.facilities ?? [],
    badge: p.badge || null,
    order: i + 1,
  }))
}

export async function GET() {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pakets = await prisma.paketEvent.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    include: { prices: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json({ pakets })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = paketSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  const { title, location, description, subtitle, body: bodyText, badge, order, prices } = parsed.data

  const paket = await prisma.$transaction(async (tx) => {
    const created = await tx.paketEvent.create({
      data: {
        title,
        location,
        description: description || null,
        subtitle: subtitle || null,
        body: bodyText || null,
        badge: badge || null,
        order: 0,
        prices: { create: priceRows(prices) },
      },
    })
    await reorderPaket(tx, created.id, order)
    await tx.activityLog.create({
      data: { userId: session.sub, action: 'paket.create', detail: { title } },
    })
    return tx.paketEvent.findUniqueOrThrow({ where: { id: created.id }, include: { prices: { orderBy: { order: 'asc' } } } })
  })
  logger.info('paket created', { paketId: paket.id, by: session.username })

  return NextResponse.json({ paket }, { status: 201 })
}
