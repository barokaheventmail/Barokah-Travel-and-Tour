import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { canManage, requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { buildPreview, parseWorkbook, type ExcelParseResult } from '@/lib/excel'
import { conflictSummary, planImport, type ImportConflict } from '@/lib/import-match'
import { ticketCodeFromToken } from '@/lib/scan'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_ROWS = 50000
const ACCEPTED_EXT = ['xlsx', 'xlsm', 'xls', 'csv', 'ods'] as const
const ACCEPTED_LABEL = '.xlsx, .xlsm, .xls, .csv, .ods'

type Params = { params: Promise<{ id: string }> }

type ForecastBus = { name: string; created: number; updated: number; conflicts: number; duplicates: number }
type Forecast = {
  created: number
  updated: number
  duplicates: number
  forced: number
  buses: ForecastBus[]
  conflicts: (ImportConflict & { bus: string })[]
}

/**
 * Hitung dulu apa yang AKAN terjadi kalau file ini disimpan, tanpa menulis apa pun.
 *
 * Ini yang membuat import tidak diam-diam: admin bisa melihat "3 baru · 12
 * diperbarui · 1 bentrok" beserta nama yang bentrok SEBELUM menekan Simpan,
 * bukan baru sadar setelah data salah simpan.
 */
async function buildForecast(eventId: string, parsed: ExcelParseResult, forceOrder: boolean): Promise<Forecast> {
  const buses = await prisma.bus.findMany({
    where: { eventId },
    select: {
      name: true,
      participants: { select: { id: true, order: true, name: true, phone: true }, orderBy: { order: 'asc' } },
    },
  })
  const byName = new Map(buses.map((b) => [b.name, b]))

  const out: Forecast = { created: 0, updated: 0, duplicates: 0, forced: 0, buses: [], conflicts: [] }
  for (const bus of parsed.buses) {
    const plan = planImport({ existing: byName.get(bus.name)?.participants ?? [], rows: bus.participants, forceByOrder: forceOrder })
    out.created += plan.created
    out.updated += plan.updated
    out.duplicates += plan.duplicates
    out.forced += plan.forced
    out.conflicts.push(...plan.conflicts.map((c) => ({ ...c, bus: bus.name })))
    out.buses.push({
      name: bus.name,
      created: plan.created,
      updated: plan.updated,
      conflicts: plan.conflicts.length,
      duplicates: plan.duplicates,
    })
  }
  return out
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdminSession()
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File Excel diperlukan.' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Ukuran file maksimal 10MB.' }, { status: 400 })
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ACCEPTED_EXT.includes(ext as (typeof ACCEPTED_EXT)[number])) {
    return NextResponse.json({ error: `Format file harus salah satu dari ${ACCEPTED_LABEL}.` }, { status: 400 })
  }

  // Preview: parse saja, tidak menulis apa pun. Admin bisa cek dulu cara file
  // dibaca — termasuk prediksi peserta yang akan ditambah/diperbarui dan baris
  // yang tidak bisa disimpan — baru menekan Simpan.
  const isPreview = formData.get('preview') === '1'
  // "overwrite" membuat sel kosong menimpa data yang sudah ada. Default: sel
  // kosong tidak menghapus data lama.
  const overwriteEmpty = formData.get('overwrite') === '1'
  // "forceOrder" mengembalikan pencocokan lewat kolom "No" seperti versi lama.
  // Bahaya: kalau nomor di file bergeser, nama peserta bisa tertukar. Karena itu
  // harus dicentang manual oleh admin, dan tercatat di log aktivitas.
  const forceOrder = formData.get('forceOrder') === '1'

  let parsed
  try {
    parsed = parseWorkbook(await file.arrayBuffer(), file.name)
  } catch (e) {
    logger.error('excel parse failed', { eventId: id, file: file.name, error: e instanceof Error ? e.message : 'unknown' })
    return NextResponse.json({ error: `Gagal membaca file ${ext.toUpperCase()}. Pastikan file tidak rusak atau dikunci password.` }, { status: 400 })
  }

  if (parsed.buses.length === 0) {
    const notes = parsed.diagnostics.sheets.flatMap((s) => s.notes)
    return NextResponse.json(
      {
        error: 'Tidak ada data peserta yang bisa dibaca dari file ini.',
        notes: parsed.diagnostics.warnings.length ? parsed.diagnostics.warnings : notes,
      },
      { status: 400 },
    )
  }

  const totalRows = parsed.buses.reduce((acc, b) => acc + b.participants.length, 0)
  if (totalRows > MAX_ROWS) {
    return NextResponse.json(
      { error: `File terlalu besar: ${totalRows} baris. Maksimal ${MAX_ROWS} baris per file. Pisahkan menjadi beberapa file.` },
      { status: 400 },
    )
  }

  if (isPreview) {
    const forecast = await buildForecast(id, parsed, forceOrder)
    return NextResponse.json({ ok: true, preview: true, ...buildPreview(parsed), forecast })
  }

  const busResults: { name: string; created: number; updated: number; skipped: number }[] = []
  let totalCreated = 0
  let totalUpdated = 0

  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < parsed.buses.length; i++) {
        const bus = parsed.buses[i]
        const busRec = await tx.bus.upsert({
          where: { eventId_name: { eventId: id, name: bus.name } },
          create: { eventId: id, name: bus.name, order: i + 1 },
          update: { order: i + 1 },
        })

        // Prefetch sekali per bus: tanpa ini tiap baris butuh 1 findUnique
        // tambahan di dalam transaksi (50k baris = 50k query sia-sia).
        const existing = await tx.participant.findMany({
          where: { busId: busRec.id },
          select: { id: true, order: true },
        })
        const byOrder = new Map(existing.map((e) => [e.order, e.id]))

        let created = 0
        let updated = 0
        const createData = []
        const updatePromises = []

        for (const p of bus.participants) {
          const values = {
            name: p.name,
            birthPlace: p.birthPlace,
            birthDate: p.birthDate,
            phone: p.phone,
            seat: p.seat,
            room: p.room,
            roomType: p.roomType,
            vw: p.vw,
          }
          // `undefined` berarti "jangan sentuh field ini" supaya data lama
          // tidak hilang saat file yang diimport lebih sepi.
          const data = overwriteEmpty
            ? { ...values, birthPlace: values.birthPlace ?? null, birthDate: values.birthDate ?? null, phone: values.phone ?? null, seat: values.seat ?? null, room: values.room ?? null, roomType: values.roomType ?? null, vw: values.vw ?? null }
            : {
                name: values.name,
                ...(values.birthPlace != null ? { birthPlace: values.birthPlace } : {}),
                ...(values.birthDate != null ? { birthDate: values.birthDate } : {}),
                ...(values.phone != null ? { phone: values.phone } : {}),
                ...(values.seat != null ? { seat: values.seat } : {}),
                ...(values.room != null ? { room: values.room } : {}),
                ...(values.roomType != null ? { roomType: values.roomType } : {}),
                ...(values.vw != null ? { vw: values.vw } : {}),
              }

          const existsId = byOrder.get(p.order)
          if (existsId) {
            updatePromises.push(tx.participant.update({ where: { id: existsId }, data }))
            updated++
          } else {
            const token = randomUUID()
            createData.push({
              ...data,
              eventId: id,
              busId: busRec.id,
              order: p.order,
              token,
              ticketCode: ticketCodeFromToken(event.date, token),
            })
            created++
          }
        }

        // Eksekusi create sekaligus (1 query untuk ribuan baris, sangat cepat)
        if (createData.length > 0) {
          await tx.participant.createMany({ data: createData })
        }

        // Eksekusi update secara paralel dalam batch 50
        for (let j = 0; j < updatePromises.length; j += 50) {
          await Promise.all(updatePromises.slice(j, j + 50))
        }

        totalCreated += created
        totalUpdated += updated
        busResults.push({ name: bus.name, created, updated, skipped: 0 })
      }

      await tx.activityLog.create({
        data: {
          eventId: id,
          userId: session.sub,
          action: 'event.import',
          detail: {
            buses: busResults,
            created: totalCreated,
            updated: totalUpdated,
            skipped: parsed.skipped,
            sheetsIgnored: parsed.diagnostics.sheets.filter((s) => s.status === 'ignored').length,
            sheetsEmpty: parsed.diagnostics.sheets.filter((s) => s.status === 'empty').length,
            guessedColumns: parsed.diagnostics.sheets.reduce(
              (n, s) => n + s.mappings.filter((m) => m.kind === 'inferred' || m.kind === 'positional').length,
              0,
            ),
          },
        },
      })
    }, {
      maxWait: 15000,
      timeout: 120000,
    })
  } catch (e) {
    logger.error('excel import failed', { eventId: id, file: file.name, error: e instanceof Error ? e.message : 'unknown' })
    return NextResponse.json({ error: 'Gagal menyimpan data import. Tidak ada perubahan yang tersimpan.' }, { status: 500 })
  }

  logger.info('excel imported', { eventId: id, by: session.username, created: totalCreated, updated: totalUpdated, file: file.name })

  return NextResponse.json({
    ok: true,
    created: totalCreated,
    updated: totalUpdated,
    skipped: parsed.skipped,
    buses: busResults,
    warnings: parsed.diagnostics.warnings,
    sheets: parsed.diagnostics.sheets.map((s) => ({
      name: s.name,
      status: s.status,
      headerRow: s.headerRow,
      participants: s.participants,
      mappings: s.mappings,
      notes: s.notes,
    })),
  })
}
