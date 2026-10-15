-- Keterangan di samping judul "Denah Duduk" pada panduan peserta.
-- denahDudukKeterangan tampil orange, denahDudukKeterangan2 tampil hijau di bawahnya.
ALTER TABLE `Event` ADD COLUMN `denahDudukKeterangan` VARCHAR(500) NULL;
ALTER TABLE `Event` ADD COLUMN `denahDudukKeterangan2` VARCHAR(500) NULL;
