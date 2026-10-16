import { NextRequest, NextResponse } from 'next/server'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  PRESET_MAX_NAME,
  parseKursiPreset,
  parsePanduanPreset,
  presetSummary,
  validateKursiPreset,
  validatePanduanPreset,
  type PresetKindId,
} from '@/lib/preset'

function parseKind(value: unknown): PresetKindId | null {
  return value === 'PANDUAN' || value === 'KURSI' ? value : null
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const kind = parseKind(new URL(request.url).searchParams.get('kind'))
  const presets = await prisma.preset.findMany({
    where: kind ? { kind } : undefined,
    orderBy: [{ kind: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({
    presets: presets.map((p) => {
      const summary = presetSummary(p.kind, p.data)
      return {
        id: p.id,
        name: p.name,
        kind: p.kind,
        order: p.order,
        summary,
        data:
          p.kind === 'PANDUAN'
            ? (() => {
                const d = parsePanduanPreset(p.data)
                return d ? { itinerary: d.panduanItinerary, logos: [d.panduanLogoLeft, d.panduanLogoLeft2, d.panduanLogoCenter, d.panduanLogoRight2, d.panduanLogoRight] } : null
              })()
            : (() => {
                const d = parseKursiPreset(p.data)
                return d ? { seatRows: d.seatRows, seatCols: d.seatCols, seatCellW: d.seatCellW, seatCellH: d.seatCellH, seatLayout: d.seatLayout, frontLayout: d.frontLayout, facilities: d.facilities } : null
              })(),
      }
    }),
  })
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

  const record = (body ?? {}) as Record<string, unknown>
  const kind = parseKind(record.kind)
  if (!kind) return NextResponse.json({ error: 'Jenis preset tidak valid.' }, { status: 400 })

  const name = typeof record.name === 'string' ? record.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Nama preset wajib diisi.' }, { status: 400 })
  if (name.length > PRESET_MAX_NAME) {
    return NextResponse.json({ error: `Nama preset maksimal ${PRESET_MAX_NAME} karakter.` }, { status: 400 })
  }

  const validated = kind === 'PANDUAN' ? validatePanduanPreset(record.data) : validateKursiPreset(record.data)
  if (validated.error || !validated.data) {
    return NextResponse.json({ error: validated.error ?? 'Data preset tidak valid.' }, { status: 400 })
  }

  try {
    const preset = await prisma.$transaction(async (tx) => {
      const count = await tx.preset.count({ where: { kind } })
      const created = await tx.preset.create({
        data: { name, kind, data: JSON.stringify(validated.data), order: count + 1 },
      })
      await tx.activityLog.create({
        data: { userId: session.sub, action: 'preset.create', detail: { name, kind } },
      })
      return created
    })
    logger.info('preset created', { presetId: preset.id, kind, by: session.username })
    return NextResponse.json({ preset }, { status: 201 })
  } catch (err) {
    logger.error('preset create failed', { kind, by: session.username, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Gagal menyimpan preset.' }, { status: 500 })
  }
}
