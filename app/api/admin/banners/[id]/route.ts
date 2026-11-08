import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import {
  ALLOWED_BANNER_TYPES,
  MAX_BANNER_BYTES,
  removeBannerUpload,
  saveBannerImage,
} from '@/lib/banner-upload'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const current = await prisma.banner.findUnique({ where: { id }, select: { id: true, imageUrl: true } })
  if (!current) return NextResponse.json({ error: 'Banner tidak ditemukan.' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Pilih file gambar terlebih dahulu.' }, { status: 400 })
  }
  if (file.size > MAX_BANNER_BYTES) {
    return NextResponse.json({ error: 'Ukuran file maksimal 5 MB.' }, { status: 400 })
  }
  const ext = ALLOWED_BANNER_TYPES.get(file.type)
  if (!ext) {
    return NextResponse.json({ error: 'Hanya mendukung gambar JPG, PNG, atau WebP.' }, { status: 400 })
  }

  const imageUrl = await saveBannerImage(file, ext)

  try {
    const banner = await prisma.$transaction(async (tx) => {
      const updated = await tx.banner.update({ where: { id }, data: { imageUrl } })
      await tx.activityLog.create({
        data: { userId: session.sub, action: 'banner.replace', detail: { url: imageUrl } },
      })
      return updated
    })
    await removeBannerUpload(current.imageUrl)
    revalidatePath('/')
    logger.info('banner replaced', { id, by: session.username, url: imageUrl })
    return NextResponse.json({ banner })
  } catch (err) {
    await removeBannerUpload(imageUrl)
    logger.error('banner replace failed', { id, by: session.username, err })
    return NextResponse.json({ error: 'Gagal mengganti banner.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const banner = await prisma.banner.findUnique({ where: { id }, select: { id: true, imageUrl: true } })
  if (!banner) return NextResponse.json({ error: 'Banner tidak ditemukan.' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.banner.delete({ where: { id } })
    await tx.activityLog.create({
      data: { userId: session.sub, action: 'banner.remove', detail: { url: banner.imageUrl } },
    })
  })
  await removeBannerUpload(banner.imageUrl)
  revalidatePath('/')
  logger.info('banner removed', { id, by: session.username })
  return NextResponse.json({ ok: true })
}
