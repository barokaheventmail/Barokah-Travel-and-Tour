-- Pindahkan keterangan Denah Duduk dari level event ke level unit (bus),
-- supaya tiap bus bisa punya keterangannya sendiri.
ALTER TABLE `Bus` ADD COLUMN `denahDudukKeterangan` VARCHAR(200) NULL;
ALTER TABLE `Bus` ADD COLUMN `denahDudukKeterangan2` VARCHAR(200) NULL;

ALTER TABLE `Event` DROP COLUMN `denahDudukKeterangan`;
ALTER TABLE `Event` DROP COLUMN `denahDudukKeterangan2`;
