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

const ADMIN_USER = process.env.ADMIN_USER ?? 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'admin123'
const CREW_USER = process.env.CREW_USER ?? 'crew'
const CREW_PASS = process.env.CREW_PASS ?? 'crew123'

async function upsertUser(username, password, role) {
  const passwordHash = await bcrypt.hash(password, 10)
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, role } })
    return { username, role, action: 'updated' }
  }
  await prisma.user.create({ data: { username, passwordHash, role } })
  return { username, role, action: 'created' }
}

async function main() {
  const admin = await upsertUser(ADMIN_USER, ADMIN_PASS, 'ADMIN')
  const crew = await upsertUser(CREW_USER, CREW_PASS, 'CREW')
  console.log('Seed selesai:', [admin, crew])
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())