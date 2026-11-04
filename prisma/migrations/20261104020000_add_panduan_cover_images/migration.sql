-- Dua gambar segi enam pada sampul panduan peserta.
ALTER TABLE `Event`
  ADD COLUMN `panduanCoverImageLeft` VARCHAR(500) NULL,
  ADD COLUMN `panduanCoverImageRight` VARCHAR(500) NULL;
