-- Tipe kamar peserta (mis. "Twin", "Double", "Triple"), diisi dari kolom
-- "Tipe Kamar" saat import Excel.
ALTER TABLE `Participant` ADD COLUMN `roomType` VARCHAR(191) NULL;
