import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'

const envFiles =
  process.env.NODE_ENV === 'production'
    ? ['.env.production', '.env']
    : ['.env', '.env.production']

for (const file of envFiles) {
  try {
    process.loadEnvFile(file)
  } catch {}
}

const { PrismaClient } = pkg
const prisma = new PrismaClient()

// Akun tetap: 1 owner (mengawasi seluruh sistem) + 2 admin. Password bisa
// diganti sendiri lewat panel admin, jadi nilai di sini hanya untuk awal.
const SEED_USERS = [
  { username: process.env.OWNER_USER ?? 'owner', password: process.env.OWNER_PASS ?? 'owner123', role: 'OWNER' },
  { username: process.env.ADMIN_USER ?? 'admin', password: process.env.ADMIN_PASS ?? 'admin123', role: 'ADMIN' },
  {
    username: process.env.ADMIN2_USER ?? 'admin2',
    password: process.env.ADMIN2_PASS ?? 'admin2123',
    role: 'ADMIN',
  },
  { username: process.env.CREW_USER ?? 'crew', password: process.env.CREW_PASS ?? 'crew123', role: 'CREW' },
]

async function upsertUser(username, password, role) {
  if (!username) return null
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    // Password tidak ditimpa di akun yang sudah ada: admin/owner yang sudah
    // mengganti sandinya sendiri tidak boleh dikembalikan ke nilai seed.
    if (existing.role !== role) {
      await prisma.user.update({ where: { id: existing.id }, data: { role } })
    }
    return { username, role, action: 'kept' }
  }
  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({ data: { username, passwordHash, role } })
  return { username, role, action: 'created' }
}

async function main() {
  const results = []
  for (const user of SEED_USERS) {
    results.push(await upsertUser(user.username, user.password, user.role))
  }
  console.log('Seed selesai:', results.filter(Boolean))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
