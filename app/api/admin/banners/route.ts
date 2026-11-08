import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import {
  ALLOWED_BANNER_TYPES,
  MAX_BANNER_BYTES,
  MAX_BANNERS,
  removeBannerUpload,
  saveBannerImage,
} from '@/lib/banner-upload'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) {
    return NextResponse.json({ error: 'Pilih minimal satu gambar banner.' }, { status: 400 })
  }

  const existing = await prisma.banner.count()
  if (existing + files.length > MAX_BANNERS) {
    return NextResponse.json(
      { error: `Banner maksimal ${MAX_BANNERS} gambar. Tersisa ${Math.max(MAX_BANNERS - existing, 0)} slot.` },
      { status: 400 },
    )
  }

  const saved: string[] = []
  for (const file of files) {
    if (file.size > MAX_BANNER_BYTES) {
      for (const url of saved) await removeBannerUpload(url)
      return NextResponse.json({ error: 'Ukuran tiap file maksimal 5 MB.' }, { status: 400 })
    }
    const ext = ALLOWED_BANNER_TYPES.get(file.type)
    if (!ext) {
      for (const url of saved) await removeBannerUpload(url)
      return NextResponse.json({ error: 'Hanya mendukung gambar JPG, PNG, atau WebP.' }, { status: 400 })
    }
    saved.push(await saveBannerImage(file, ext))
  }

  try {
    const banners = await prisma.$transaction(async (tx) => {
      const last = await tx.banner.findFirst({ orderBy: { order: 'desc' }, select: { order: true } })
      let order = (last?.order ?? -1) + 1
      await tx.banner.createMany({
        data: saved.map((imageUrl) => ({ imageUrl, order: order++ })),
      })
      await tx.activityLog.create({
        data: { userId: session.sub, action: 'banner.add', detail: { count: saved.length } },
      })
      return tx.banner.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
    })
    revalidatePath('/')
    logger.info('banner uploaded', { by: session.username, count: saved.length })
    return NextResponse.json({ banners }, { status: 201 })
  } catch (err) {
    for (const url of saved) await removeBannerUpload(url)
    logger.error('banner upload failed', { by: session.username, err })
    return NextResponse.json({ error: 'Gagal menyimpan banner.' }, { status: 500 })
  }
}
