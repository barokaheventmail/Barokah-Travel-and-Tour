import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, removePaketUpload, savePaketImage } from '@/lib/paket-upload'

type Params = { params: Promise<{ id: string }> }

const MAX_ALBUM = 25

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const paket = await prisma.paketEvent.findUnique({ where: { id }, select: { id: true, title: true } })
  if (!paket) return NextResponse.json({ error: 'Paket event tidak ditemukan.' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) {
    return NextResponse.json({ error: 'Pilih minimal satu gambar.' }, { status: 400 })
  }

  const existing = await prisma.paketImage.count({ where: { paketId: id } })
  if (existing + files.length > MAX_ALBUM) {
    return NextResponse.json(
      { error: `Gallery maksimal ${MAX_ALBUM} foto. Tersisa ${Math.max(MAX_ALBUM - existing, 0)} slot.` },
      { status: 400 },
    )
  }

  const saved: string[] = []
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      for (const url of saved) await removePaketUpload(url)
      return NextResponse.json({ error: 'Ukuran tiap file maksimal 5 MB.' }, { status: 400 })
    }
    const ext = ALLOWED_IMAGE_TYPES.get(file.type)
    if (!ext) {
      for (const url of saved) await removePaketUpload(url)
      return NextResponse.json({ error: 'Hanya mendukung gambar JPG, PNG, atau WebP.' }, { status: 400 })
    }
    saved.push(await savePaketImage(file, ext))
  }

  try {
    const images = await prisma.$transaction(async (tx) => {
      const last = await tx.paketImage.findFirst({
        where: { paketId: id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      let order = (last?.order ?? -1) + 1
      const rows = saved.map((url) => ({ paketId: id, url, order: order++ }))
      await tx.paketImage.createMany({ data: rows })
      await tx.activityLog.create({
        data: { userId: session.sub, action: 'paket.albumAdd', detail: { title: paket.title, count: rows.length } },
      })
      return tx.paketImage.findMany({ where: { paketId: id }, orderBy: { order: 'asc' } })
    })
    logger.info('paket album uploaded', { paketId: id, by: session.username, count: saved.length })
    return NextResponse.json({ images }, { status: 201 })
  } catch (err) {
    for (const url of saved) await removePaketUpload(url)
    logger.error('paket album upload failed', { paketId: id, err })
    return NextResponse.json({ error: 'Gagal menyimpan gambar.' }, { status: 500 })
  }
}
