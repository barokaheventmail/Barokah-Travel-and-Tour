-- AlterTable
ALTER TABLE `Event` ADD COLUMN `panduanLogoCenter` VARCHAR(500) NULL,
    ADD COLUMN `panduanLogoLeft2` VARCHAR(500) NULL,
    ADD COLUMN `panduanLogoRight2` VARCHAR(500) NULL;

-- Salin logo partner lama (slot "kanan atas") ke slot baru supaya tetap tampil:
-- Partner 1 -> Kiri 1, Partner 2 -> Kanan 1.
UPDATE `Event`
   SET `panduanLogoLeft2` = `panduanLogoTopRight`,
       `panduanLogoRight2` = `panduanLogoTopRight2`
 WHERE `panduanLogoTopRight` IS NOT NULL
    OR `panduanLogoTopRight2` IS NOT NULL;

