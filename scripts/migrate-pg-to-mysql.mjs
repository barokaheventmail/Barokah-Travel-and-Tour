#!/usr/bin/env node
/**
 * Pindahkan data dari PostgreSQL (Supabase) ke MySQL/MariaDB (Hostinger / Docker).
 *
 * Karena tipe kolomnya sudah dijamin sama oleh schema Prisma, skrip ini cukup
 * membaca tiap tabel apa adanya lalu menulisnya ke MySQL dengan urutan foreign
 * key yang benar, lalu memverifikasi jumlah baris.
 *
 * Pemakaian:
 *   PG_URL="postgresql://...?sslmode=require" MYSQL_URL="mysql://..." \
 *     node scripts/migrate-pg-to-mysql.mjs
 *
 * Opsi:
 *   --dry-run    hanya bandingkan jumlah baris, tidak menulis apa pun
 *   --keep-data  jangan TRUNCATE tabel target sebelum menulis (gabung, rawan duplikat)
 *   --help       tampilkan bantuan
 *
 * Env bisa juga diambil otomatis dari file (tidak menimpa env yang sudah ada):
 *   .env  /  .env.production  -> MYSQL_URL (lewat DATABASE_URL)
 *   .env.supabase             -> PG_URL
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import mysql from 'mysql2/promise'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const args = new Set(process.argv.slice(2))
if (args.has('--help')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''))
  process.exit(0)
}
const DRY_RUN = args.has('--dry-run')
const KEEP_DATA = args.has('--keep-data')

// Urutan penting: induk sebelum anak supaya foreign key tidak melanggar.
const TABLES = ['User', 'Event', 'Bus', 'BusWorker', 'Participant', 'ScanLog', 'ActivityLog']
const BATCH_ROWS = 200

function loadEnvFile(file) {
  const full = path.join(ROOT, file)
  if (!fs.existsSync(full)) return
  try {
    process.loadEnvFile(full)
  } catch {}
}

// loadEnvFile tidak menimpa env yang sudah ada, jadi urutan ini aman:
// .env (lokal) dulu, lalu .env.production, lalu rahasia Supabase.
loadEnvFile('.env')
loadEnvFile('.env.production')
loadEnvFile('.env.supabase')

const PG_URL = process.env.PG_URL || process.env.DIRECT_URL
const MYSQL_URL = process.env.MYSQL_URL || process.env.DATABASE_URL

function fail(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

if (!PG_URL?.startsWith('postgres')) {
  fail(
    'PG_URL tidak ditemukan. Set env PG_URL (connection string Supabase, port 5432 + ?sslmode=require)\n' +
      'atau isi file .env.supabase dengan baris: PG_URL="postgresql://..."'
  )
}
if (!MYSQL_URL?.startsWith('mysql')) {
  fail('MYSQL_URL tidak ditemukan. Set env MYSQL_URL atau isi DATABASE_URL di .env')
}

// Supabase memakai `timestamp without time zone` (Prisma DateTime). Biar tidak
// salah geser timezone oleh TZ lokal, timestamp dibaca sebagai string mentah.
pg.types.setTypeParser(1114, (v) => v) // timestamp
pg.types.setTypeParser(1082, (v) => v) // date
pg.types.setTypeParser(1184, (v) => v) // timestamptz (tak terpakai, jaga-jaga)

/** Sesuaikan tipe JavaScript hasil pg dengan kebutuhan kolom MySQL. */
function convert(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0 // MariaDB/MySQL BOOLEAN = TINYINT(1)
  if (value instanceof Date) {
    const p = (n, w = 2) => String(n).padStart(w, '0')
    return (
      `${value.getUTCFullYear()}-${p(value.getUTCMonth() + 1)}-${p(value.getUTCDate())} ` +
      `${p(value.getUTCHours())}:${p(value.getUTCMinutes())}:${p(value.getUTCSeconds())}.${p(value.getUTCMilliseconds(), 3)}`
    )
  }
  if (typeof value === 'object') return JSON.stringify(value) // jsonb -> JSON
  return value
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function pgColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table]
  )
  return rows.map((r) => r.column_name)
}

async function mysqlColumns(conn, table) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [table]
  )
  return rows.map((r) => r.c)
}

async function pgCount(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM "${table}"`)
  return rows[0].n
}

async function mysqlCount(conn, table) {
  const [rows] = await conn.query(`SELECT COUNT(*) AS n FROM \`${table}\``)
  return Number(rows[0].n)
}

async function main() {
  const started = Date.now()
  console.log(`\n→ Sumber : ${PG_URL.replace(/:[^:@/]*@/, ':***@')}`)
  console.log(`→ Target : ${MYSQL_URL.replace(/:[^:@/]*@/, ':***@')}`)
  console.log(`→ Mode   : ${DRY_RUN ? 'dry-run (tanpa menulis)' : KEEP_DATA ? 'tanpa truncate' : 'truncate + tulis'}\n`)

  const client = new pg.Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } })
  const conn = await mysql.createConnection({ uri: MYSQL_URL, dateStrings: true })

  try {
    await client.connect()

    // 1. Cocokkan kolom antar kedua sisi sebelum menyentuh data apa pun.
    const plan = []
    for (const table of TABLES) {
      const src = await pgColumns(client, table)
      const dst = await mysqlColumns(conn, table)
      if (src.length === 0) fail(`Tabel "${table}" tidak ada di PostgreSQL`)
      if (dst.length === 0) fail(`Tabel "${table}" tidak ada di MySQL — jalankan "pnpm db:deploy" dulu`)
      const shared = src.filter((c) => dst.includes(c))
      const missingInMysql = src.filter((c) => !dst.includes(c))
      const missingInPg = dst.filter((c) => !src.includes(c))
      if (missingInMysql.length) console.warn(`  ! ${table}: kolom di PG tapi tidak di MySQL -> ${missingInMysql.join(', ')}`)
      if (missingInPg.length) console.warn(`  ! ${table}: kolom di MySQL tapi tidak di PG -> ${missingInPg.join(', ')}`)
      plan.push({ table, columns: shared, srcCount: await pgCount(client, table) })
    }

    console.log('Jumlah baris sumber (PostgreSQL):')
    for (const p of plan) console.log(`  ${p.table.padEnd(14)} ${String(p.srcCount).padStart(7)}`)

    if (DRY_RUN) {
      console.log('\nDry-run: perbandingan dengan target (tanpa perubahan):')
      let same = true
      for (const p of plan) {
        const n = await mysqlCount(conn, p.table)
        const ok = n === p.srcCount
        if (!ok) same = false
        console.log(`  ${p.table.padEnd(14)} pg=${String(p.srcCount).padStart(7)}  mysql=${String(n).padStart(7)} ${ok ? 'OK' : 'BEDA'}`)
      }
      console.log(same ? '\n✔ Jumlah baris cocok.' : '\n✖ Ada selisih — jalankan tanpa --dry-run untuk memindahkan data.')
      process.exit(same ? 0 : 1)
    }

    // 2. Tulis data.
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')
    if (!KEEP_DATA) {
      for (const { table } of plan) await conn.query(`TRUNCATE TABLE \`${table}\``)
    }

    for (const { table, columns, srcCount } of plan) {
      if (srcCount === 0) {
        console.log(`  ${table.padEnd(14)} 0 baris (dilewati)`)
        continue
      }
      const colsSql = columns.map((c) => `\`${c}\``).join(', ')
      // Seluruh baris dibaca dulu (data proyek ini kecil — ratusan MB pun masih
      // aman di memori), baru ditulis ke MySQL per batch.
      const { rows: sourceRows } = await client.query(
        `SELECT ${columns.map((c) => `"${c}"`).join(', ')} FROM "${table}"`
      )
      const placeholders = `(${columns.map(() => '?').join(', ')})`

      let written = 0
      for (const batch of chunk(sourceRows, BATCH_ROWS)) {
        const values = batch.flatMap((row) => columns.map((c) => convert(row[c])))
        await conn.query(`INSERT INTO \`${table}\` (${colsSql}) VALUES ${batch.map(() => placeholders).join(', ')}`, values)
        written += batch.length
      }
      console.log(`  ${table.padEnd(14)} ${String(written).padStart(7)} baris`)
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1')

    // 3. Verifikasi.
    console.log('\nVerifikasi jumlah baris:')
    let ok = true
    for (const { table, srcCount } of plan) {
      const n = await mysqlCount(conn, table)
      const match = n === srcCount
      if (!match) ok = false
      console.log(`  ${table.padEnd(14)} pg=${String(srcCount).padStart(7)}  mysql=${String(n).padStart(7)} ${match ? '✔' : '✖ BEDA'}`)
    }

    const [[ev]] = await conn.query('SELECT COUNT(*) AS n, MAX(title) AS lastTitle FROM `Event`')
    const [[pt]] = await conn.query('SELECT COUNT(*) AS n FROM `Participant` WHERE `scannedAt` IS NOT NULL')
    console.log(`\n  Event: ${ev.n} (contoh judul: ${ev.lastTitle ?? '-'})`)
    console.log(`  Peserta sudah hadir: ${pt.n}`)

    console.log(ok ? `\n✔ Selesai dalam ${((Date.now() - started) / 1000).toFixed(1)}s` : `\n✖ Ada tabel yang jumlah barisnya tidak cocok`)
    process.exit(ok ? 0 : 1)
  } finally {
    await client.end().catch(() => {})
    await conn.end().catch(() => {})
  }
}

main().catch((err) => {
  console.error('\n✖ Gagal memindahkan data:\n', err)
  process.exit(1)
})
