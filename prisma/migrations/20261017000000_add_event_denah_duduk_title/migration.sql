-- Judul utama halaman Denah Duduk (dipakai bersama semua unit). Keterangan
-- orange/hijau Denah Duduk tetap per unit (kolom di tabel Bus).
ALTER TABLE `Event` ADD COLUMN `denahDudukTitle` VARCHAR(200) NULL;
