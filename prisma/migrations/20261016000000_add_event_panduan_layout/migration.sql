-- Rekam ulang migrasi yang hilang dari riwayat lokal. Kolom ini sudah ada di
-- database tapi belum dipakai kode.
ALTER TABLE `Event` ADD COLUMN `panduanLayout` LONGTEXT NULL;
