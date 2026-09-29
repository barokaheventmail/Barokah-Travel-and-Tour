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

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.mjs',
  },
})
