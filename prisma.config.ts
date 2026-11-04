import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

const envFiles =
  process.env.NODE_ENV === 'production'
    ? ['.env.production', '.env']
    : ['.env', '.env.production']

for (const file of envFiles) {
  try {
    process.loadEnvFile(file)
  } catch {}
}

// Dev lokal di environment ini memakai SQLite (`file:./dev.db`), sedangkan
// produksi memakai MySQL/MariaDB. Native type MySQL (`@db.VarChar`, `@db.Text`,
// `@db.LongText`) tidak dikenal connector SQLite, jadi untuk mode SQLite kita
// turunkan schema sementara tanpa anotasi tersebut. Schema utama tetap satu
// sumber kebenaran; file turunan ini ditulis ulang setiap kali Prisma dijalankan.
function schemaFor(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) return 'prisma/schema.prisma'

  const source = readFileSync('prisma/schema.prisma', 'utf8')
  const sqlite = source
    .replace('provider = "mysql"', 'provider = "sqlite"')
    .replace(/ @db\.(?:VarChar\(\d+\)|Text|LongText)/g, '')
  const path = 'prisma/.schema.sqlite.prisma'
  try {
    if (readFileSync(path, 'utf8') !== sqlite) writeFileSync(path, sqlite)
  } catch {
    writeFileSync(path, sqlite)
  }
  return path
}

export default defineConfig({
  schema: schemaFor(process.env.DATABASE_URL ?? ''),
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.mjs',
  },
})
