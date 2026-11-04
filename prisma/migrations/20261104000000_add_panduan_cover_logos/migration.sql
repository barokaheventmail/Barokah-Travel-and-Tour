-- Logo khusus sampul panduan (terpisah dari logo kepala halaman).
ALTER TABLE `Event`
  ADD COLUMN `panduanCoverLogoLeft` VARCHAR(500) NULL,
  ADD COLUMN `panduanCoverLogoLeft2` VARCHAR(500) NULL,
  ADD COLUMN `panduanCoverLogoCenter` VARCHAR(500) NULL,
  ADD COLUMN `panduanCoverLogoRight2` VARCHAR(500) NULL,
  ADD COLUMN `panduanCoverLogoRight` VARCHAR(500) NULL;
