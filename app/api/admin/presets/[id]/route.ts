import { NextRequest, NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { PRESET_MAX_NAME, validateKursiPreset, validatePanduanPreset } from '@/lib/preset'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.preset.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Preset tidak ditemukan.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const record = (body ?? {}) as Record<string, unknown>
  const data: { name?: string; data?: string } = {}

  if (record.name !== undefined) {
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Nama preset wajib diisi.' }, { status: 400 })
    if (name.length > PRESET_MAX_NAME) {
      return NextResponse.json({ error: `Nama preset maksimal ${PRESET_MAX_NAME} karakter.` }, { status: 400 })
    }
    data.name = name
  }

  if (record.data !== undefined) {
    const validated =
      existing.kind === 'PANDUAN' ? validatePanduanPreset(record.data) : validateKursiPreset(record.data)
    if (validated.error || !validated.data) {
      return NextResponse.json({ error: validated.error ?? 'Data preset tidak valid.' }, { status: 400 })
    }
    data.data = JSON.stringify(validated.data)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah.' }, { status: 400 })
  }

  try {
    const preset = await prisma.$transaction(async (tx) => {
      const updated = await tx.preset.update({ where: { id }, data })
      await tx.activityLog.create({
        data: { userId: session.sub, action: 'preset.update', detail: { name: updated.name, kind: updated.kind } },
      })
      return updated
    })
    logger.info('preset updated', { presetId: id, by: session.username })
    return NextResponse.json({ preset })
  } catch (err) {
    logger.error('preset update failed', { presetId: id, by: session.username, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Gagal memperbarui preset.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.preset.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Preset tidak ditemukan.' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.preset.delete({ where: { id } })
    await tx.activityLog.create({
      data: { userId: session.sub, action: 'preset.delete', detail: { name: existing.name, kind: existing.kind } },
    })
  })
  logger.info('preset deleted', { presetId: id, by: session.username, name: existing.name })

  return NextResponse.json({ ok: true })
}
