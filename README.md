# Barokah Tour and Travel — Website + Sistem Event QR Absensi

Next.js (App Router) 16 + Prisma + **MySQL/MariaDB**. URL utama: `http://localhost:3000`.

> **Catatan hosting**: paket Web/Cloud Hostinger menyediakan **MariaDB** (ditampilkan
> sebagai "MySQL" di hPanel), jadi dev lokal juga memakai MariaDB supaya perilakunya
> sama persis. Schema Prisma tetap memakai provider `mysql`.

## Alur utama
- **Publik**: halaman event → kotak **Cari Nama Peserta** → ketik nama → **Lihat Tiket & QR** → tunjukkan QR ke crew. (Pencarian di hero beranda sengaja non-aktif.)
- **Crew**: buka `/crew` (login) → scan QR kamera → kehadiran **otomatis tercatat**. Event berstatus `CLOSED` masih bisa dibaca (daftar nama, peta kursi, riwayat) tapi tidak bisa discan; `DRAFT` tidak terlihat sama sekali.
- **Admin**: buka `/admin` (login) → kelola event, **import Excel** (1 sheet = 1 bus), lihat daftar/hadir, **Cetak QR**.

Akun awal (dari `.env`): owner / `owner123`, admin / `admin123`, admin2 /
`admin2123`, dan crew / `crew123`. Admin & owner bisa ganti sandi sendiri lewat
tombol **Ganti Sandi** di header panel.

## Persyaratan
- Node 20+, pnpm, Docker (untuk MariaDB lokal).

## Menjalankan di laptop (development)

```bash
pnpm install

# 1. Siapkan environment (file lokal, tidak ikut commit)
cp .env.example .env && cp .env.example .env.local   # lalu ganti JWT_SECRET

# 2. Nyalakan MariaDB (Docker, port host 3307)
pnpm db:up

# 3. Buat tabel database + seed 4 akun awal
pnpm db:migrate               # prisma migrate dev
pnpm db:seed                  # owner / admin / admin2 / crew

# 4. Jalankan aplikasi
pnpm dev                      # localhost:3000
```

Tiga file env punya peran berbeda:

| File | Dipakai oleh | Isi |
| --- | --- | --- |
| `.env` | Prisma CLI (`pnpm db:*`) | koneksi lokal |
| `.env.local` | Next.js (`pnpm dev/build/start`) lokal | koneksi lokal (precedence tertinggi) |
| `.env.production` | server production Hostinger | koneksi Hostinger — **wajib diisi sendiri** |

Cek kesehatan: `GET /api/health` → `{ "status": "ok", "db": "ok" }`.

## Format file Excel import
Import dibuat toleran: file tidak harus sama persis dengan template. Yang wajib
hanya ada **nama peserta**; sisanya dibaca seperlunya.

- **Format file**: `.xlsx`, `.xlsm`, `.xls`, `.csv`, `.ods`.
- **Unit**: 1 sheet = 1 unit (nama sheet jadi nama unit), **atau** pakai
  kolom `Bus`/`Unit` (header lama `Armada` masih dikenali) di dalam sheet
  supaya 1 sheet bisa dipecah jadi beberapa unit. Nama sheet generik (`Sheet1`) diganti nama file kalau tidak ada kolom unit.
- **Header**: dicari sampai 200 baris pertama, jadi blok judul di atas header
  (`DATA PESERTA`, namaPTO, dst.) tidak masalah. Nama kolom dicari lewat alias
  luas + pola teks + cek typo, jadi `NO. TELP/HP`, `NAMA PESERTA (LENGKAP)`,
  `TGL LAHIR`, `HP/WA` tetap dikenali. Kolom yang tidak dikenali **diabaikan**,
  bukan bikin gagal.
- **Kolom**: `No`, `Nama`, `Tempat Lahir`, `Tanggal Lahir`, `No Telp/Hp`,
  `No Kursi`, `No Kamar`, `No VW` (urutan bebas, boleh tidak lengkap).
  Kolom yang hilang tapi isinya jelas (tanggal/HP) dikenali dari isi kolom.
- **Tidak ada header sama sekali**: kolom dibaca berdasarkan urutan template
  standar, dan laporan preview menandainya sebagai tebakan.
- **Tanggal**: `dd/mm/yyyy`, `dd-mm-yy`, `yyyy-mm-dd`, `12 Maret 1998`, atau
  sel tanggal Excel. Tanggal tidak valid (mis. `31/02`) dibiarkan kosong.
- **TTL gabungan** `"Sukabumi, 12/03/1998"` dipecah jadi tempat lahir + tanggal lahir.
- **No HP**: `+62`/spasi/tanda hubung dinormalkan ke format `08xx`; angka yang
  kehilangan nol depan di Excel dikembalikan.
- **Baris rekap** (`TOTAL`, `JUMLAH`, `TERIMA KASIH`) dan baris kosong tidak
  dianggap peserta.
- **No duplikat** dirapikan otomatis supaya tidak menimpa peserta lain.
- **Import ulang** mencocokkan No + unit, jadi tidak menggandakan. Sel kosong
  **tidak** menghapus data lama kecuali centang "Sel kosong menimpa data lama".
- **Alur**: pilih file → **Cek File** (preview peta kolom, contoh data, daftar
  baris yang dilewati) → **Simpan**. Tidak ada yang tersimpan sebelum Simpan.
- Template: `/api/admin/template` (atau tombol **Unduh template Excel** di panel admin).

## Export data peserta
Tombol **Export** di panel admin (popover, di sebelah tombol import) mengunduh
satu file Excel `.xlsx` yang sudah dikelompokkan per unit:

- **Sheet `Rekap`**: judul event, tanggal acara, lalu tabel per unit
  (`Peserta`, `Hadir`, `Belum`, `Kursi Terisi`, `Kamar Terisi`) + baris `TOTAL`.
- **Sheet per unit**: `No, Nama, Tempat Lahir, Tgl Lahir, No HP, Kursi, Kamar,
  VW, Status, Waktu Scan, Crew`. Nama sheet mengikuti nama unit (dibersihkan
  supaya aman untuk Excel: maksimal 31 karakter, tetap unik).
- **Filter** (dipilih di popover): unit (`Semua unit` / satu unit) dan
  status (`Semua peserta` / `Sudah hadir` / `Belum hadir`).
- **Rapi**: header tebal putih di atas biru tua, baris `HADIR` hijau dan `BELUM`
  abu-abu, header membeku saat di-scroll, auto-filter, lebar kolom menyesuaikan,
  serta **judul baris header berulang saat dicetak** (landscape, fit to width).
- **Tanggal** ditulis `dd/MM/yyyy` dan waktu scan `dd/MM/yyyy HH:mm` memakai
  komponen tanggal lokal, jadi tidak bergeser sehari dan sama dengan tampilan
  tabel admin. No HP ditulis sebagai teks supaya tidak jadi notasi ilmiah.
- Nama file: `peserta-<event>-<semua|bus-Nama>[-<status>].xlsx`.
- Parameter API `GET /api/admin/events/<id>/export`:
  `?bus=<id|all>&status=<all|hadir|belum>&format=<xlsx|csv>`. Tanpa parameter
  menghasilkan Excel semua peserta. `format=csv` menghasilkan satu file CSV datar
  (semua unit digabung, kolom `Bus` ikut disertakan) untuk kebutuhan lama.
- Export hanya membaca data, tidak pernah menulis ke database.

## Deploy (Hostinger / VPS)

Hostinger paket Web/Cloud **tidak menyediakan PostgreSQL** — database yang tersedia
adalah MariaDB (ditampilkan sebagai MySQL di hPanel), port **3306**.

### 1. Siapkan database di hPanel
1. `Websites → Dashboard → Databases → Management` → **Create database** (catat
   nama DB, user, password).
2. `Databases → Remote MySQL` → tambahkan IP (atau centang *Any Host*) supaya
   bisa diakses dari luar, dan **salin hostname** yang ditampilkan di sana
   (mis. `srv1517.hstgr.io`). Aplikasi Node.js **tidak memakai `localhost`**,
   tapi hostname itu.

### 2. Isi environment di server
```bash
# .env.production (atau env vars di panel) — isi dengan data hPanel
DATABASE_URL="mysql://USER:PASSWORD@srvXXXX.hstgr.io:3306/DBNAME?connection_limit=20"
JWT_SECRET="<string acak panjang>"
```
Tambahkan `?connection_limit=20` bila limit koneksi shared hosting ketat —
Prisma membuka pool koneksi sesuai jumlah CPU tanpa opsi ini.

### 3. Build & jalankan
```bash
pnpm install
pnpm db:deploy    # prisma migrate deploy — jalankan sekali / saat ada migrasi baru
pnpm build        # prisma generate && next build  (tanpa koneksi migrasi)
pnpm start        # atau PM2/systemd (lihat release.sh)
```
**Penting:** `prisma migrate deploy` **sengaja tidak lagi dijalankan pada setiap
build**. Hostinger membatasi `max_connections_per_hour` (default 500) — menjalankan
migrasi tiap deploy membuat build gagal dengan
`has exceeded the 'max_connections_per_hour' resource`. Jalankan migrasi terpisah
lewat `pnpm db:deploy` hanya saat ada migrasi baru. Kalau build di panel hosting
hanya bisa menjalankan satu perintah, pakai `pnpm run build:deploy` (build termasuk
migrasi) dan set kembali ke `pnpm run build` setelah migrasi selesai.

Kalau kena limit itu: tunggu ±1 jam sampai kuota Hostinger ter-reset, lalu deploy
ulang. Batas koneksi juga bisa dinaikkan di hPanel (MySQL → user database).

### 4. Pindahkan data dari Supabase
Kalau database Supabase masih menjadi sumber data (event, peserta, absensi),
pindahkan dengan skrip khusus:

```bash
# Sekali jalan. PG_URL = koneksi langsung Supabase (port 5432),
# MYSQL_URL = DATABASE_URL target Hostinger.
PG_URL="postgresql://...?sslmode=require" \
MYSQL_URL="mysql://USER:PASS@srvXXXX.hstgr.io:3306/DBNAME" \
  node scripts/migrate-pg-to-mysql.mjs
```

- `--dry-run` hanya membandingkan jumlah baris tanpa menulis.
- Skrip mengecek kecocokan kolom, menulis per batch sesuai urutan foreign key,
  lalu memverifikasi jumlah baris tiap tabel.
- Kalau Remote MySQL tidak mau diaktifkan: jalankan skrip ke MySQL Docker
  lokal, lalu `mysqldump` hasilnya dan **impor via phpMyAdmin** di hPanel.
- Alternatif termudah: `pnpm db:deploy` lalu impor lewat phpMyAdmin.

Setelah pindah data, pastikan akun login ada: `pnpm db:seed` (tidak menimpa
user yang sudah ada).

### 5. Setelah live
- Cek `GET /api/health` → `{ "status": "ok", "db": "ok" }`.
- Ganti `JWT_SECRET` kalau masih memakai nilai lama (koneksi Supabase sudah tidak
  dipakai, tapi nilai lama pernah ter-commit di repo).

Untuk Vercel/VPS non-Hostinger: set env yang sama ke MySQL managed apa pun.

## Backup & restore database
Skrip disediakan di `scripts/` (kerja untuk lokal Docker maupun Hostinger,
kredensial dibaca dari `DATABASE_URL`):

```bash
# Backup ke file (default: backups/barokah-YYYYMMDD-HHMMSS.sql.gz)
bash scripts/backup-mysql.sh

# Restore dari file backup
bash scripts/restore-mysql.sh backups/barokah-20261003-120000.sql.gz
```

Saran: jadwalkan `backup-mysql.sh` via cron/systemd timer setiap hari, atau
pakai backup otomatis dari hPanel.

## Operasional & monitoring
- **Log terstruktur** (JSON di production) untuk: login, import Excel, scan, dan error — lihat log proses (PM2/log systemd).
- **Health check**: `/api/health` (cek DB + uptime) — cocok untuk uptime monitor.
- **Audit**: semua aksi admin & scan tersimpan di tabel `ActivityLog` / `ScanLog`.
- **Dashboard admin** = ops panel: rekap hadir per bus & daftar peserta waktu nyata.

## Struktur penting
```
app/
  api/admin/...       # panel admin (CRUD event, import, peserta, template)
  api/crew/scan       # API scan (valid → otomatis centang, anti-ganda)
  api/public/search   # pencarian nama publik
  api/auth/*          # login/logout/sesi
  admin/...           # halaman panel admin (+ cetak QR)
  crew/               # halaman scanner crew
  tiket/[token]       # tiket publik ber-QR
  login/              # halaman login admin & crew
lib/                  # db, auth (JWT), excel, export (xlsx), logger, scan/Qr, dates
prisma/schema.prisma  # data model
middleware.ts         # proteksi /admin (ADMIN) & /crew (CREW)
```

## Perintah umum
| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` | dev server |
| `pnpm build` / `pnpm start` | build & run production |
| `pnpm db:up` / `pnpm db:migrate` / `pnpm db:seed` | database (MariaDB Docker) |
| `pnpm db:studio` | Prisma Studio (navigate DB) |
| `node scripts/migrate-pg-to-mysql.mjs` | pindah data Supabase → MySQL (`--dry-run` untuk cek) |
| `bash scripts/backup-mysql.sh` | backup database ke `backups/` |

## Batas data (skalabilitas)
- Tidak ada batas jumlah peserta per event; semua layar memakai agregasi (`_count`/`groupBy`) dan daftar peserta admin dimuat sebagian (200 baris + "Muat lebih banyak", pencarian server-side). Pengalaman nyaman sampai ±10.000 peserta/event; di atas itu tetap berfungsi, tetapi melihat massal sebaiknya via ekspor CSV (belum tersedia).
- Import Excel dibatasi **50.000 baris per file**; untuk data lebih besar, pisahkan menjadi beberapa file (import ulang tidak menggandakan data).
- Cari nama `/api/public/search` memakai LIKE (tanpa indeks khusus) — mulai terasa melambat di puluhan ribu baris; batasi event aktif agar Search Engine bisa lebih cepat.

## Catatan keamanan
- Session JWT httpOnly cookie, 7 hari. Ganti `JWT_SECRET` di production.
- Rol ADMIN hanya bisa akses `/admin`; CREW + ADMIN bisa `/crew`.
- QR memuat token unik per peserta (`BTHT:<token>`); token tak bisa ditebak.
- Rate-limit publik bisa ditambahkan di depan `/api/public/search` saat trafik besar.

## Kehadiran: sumber data & aturan
- Sumber kebenaran kehadiran adalah `Participant.scannedAt` (siapa pun yang mencatat: admin atau crew). Tabel `ScanLog` adalah **jejak audit** dan tidak boleh dihapus otomatis.
- **Reset Kehadiran** (panel admin) mengosongkan `scannedAt` tetapi **mempertahankan `ScanLog`**, jadi riwayat scan crew tetap utuh. Halaman publik diberi tahu sinkron ulang lewat flag `reset` dari `GET /api/events/[id]/attendance`.
- Unitnya **tanpa crew** akan memunculkan peringatan di tab Peserta: pesertanya terhitung di admin, tapi tidak muncul di aplikasi crew dan QR-nya ditolak.
- Di app crew, status riwayat: `Hadir` (baru), `Sudah hadir` (scan ulang), `Kehadiran dicabut` (direset admin).