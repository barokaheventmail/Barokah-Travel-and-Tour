-- Jeep yang ditumpangi peserta, diisi dari kolom "Jeep Paris" / "Jeep Merapi" /
-- "Jeep Bromo" saat import Excel.
ALTER TABLE `Participant`
    ADD COLUMN `jeepParis` VARCHAR(191) NULL,
    ADD COLUMN `jeepMerapi` VARCHAR(191) NULL,
    ADD COLUMN `jeepBromo` VARCHAR(191) NULL;
