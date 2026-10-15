# Cara Menjalankan Website di Localhost

Stack: **Next.js 16 + Prisma + MariaDB (Docker)**. URL: `http://localhost:3000`.

## Prasyarat

- **Node.js 20+**
- **pnpm** (`npm i -g pnpm`)
- **Docker** (untuk database MariaDB lokal)

## Langkah-langkah

### 1. Install dependencies

```bash
pnpm install
```

### 2. Siapkan file environment

```bash
cp .env.example .env
cp .env.example .env.local
```

Buka `.env` / `.env.local`, lalu **ganti `JWT_SECRET`** dengan string acak panjang.

- `.env` → dipakai Prisma CLI (`pnpm db:*`)
- `.env.local` → dipakai Next.js saat `pnpm dev`

### 3. Nyalakan database MariaDB (Docker)

```bash
pnpm db:up
```

Container `barokah-db` jalan di port host **3307**.

### 4. Buat tabel + seed akun awal

```bash
pnpm db:migrate   # buat tabel (prisma migrate dev)
pnpm db:seed      # isi akun: owner / admin / admin2 / crew
```

### 5. Jalankan aplikasi

```bash
pnpm dev
```

Buka **http://localhost:3000**.

## Akun default

| Role  | Username | Password  |
| ----- | -------- | --------- |
| Owner | owner    | owner123  |
| Admin | admin    | admin123  |
| Admin | admin2   | admin2123 |
| Crew  | crew     | crew123   |

## Cek sehat

```bash
curl http://localhost:3000/api/health
# harus balas: { "status": "ok", "db": "ok" }
```

## Perintah berguna lain

| Perintah         | Fungsi                             |
| ---------------- | ---------------------------------- |
| `pnpm db:studio` | Buka Prisma Studio (lihat data DB) |
| `pnpm db:up`     | Start MariaDB Docker               |
| `pnpm test`      | Jalankan test (vitest)             |

## Troubleshooting

- **Port 3307 bentrok** → edit `docker-compose.yml` (`ports: '3307:3306'`) jadi port lain, sesuaikan juga `DATABASE_URL` di `.env`.
- **Migrasi gagal** → pastikan container sudah sehat: `docker ps | grep barokah-db`.
- **`.env.production`** hanya untuk server Hostinger — jangan diisi koneksi lokal.
