import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { removePaketUpload } from '@/lib/paket-upload'

type Params = { params: Promise<{ id: string; imageId: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, imageId } = await params
  const image = await prisma.paketImage.findUnique({ where: { id: imageId }, select: { id: true, paketId: true, url: true } })
  if (!image || image.paketId !== id) {
    return NextResponse.json({ error: 'Gambar tidak ditemukan.' }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.paketImage.delete({ where: { id: imageId } })
    await tx.activityLog.create({
      data: { userId: session.sub, action: 'paket.albumRemove', detail: { url: image.url } },
    })
  })
  removePaketUpload(image.url).catch(() => undefined)
  logger.info('paket album image removed', { paketId: id, by: session.username })
  return NextResponse.json({ ok: true })
}
