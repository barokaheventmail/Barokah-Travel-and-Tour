-- Rekam ulang migrasi yang sempat hilang dari riwayat lokal. Kolom-kolom ini
-- sudah ada di database (hasil eksperimen lama) tapi tidak lagi dipakai kode.
ALTER TABLE `Event` ADD COLUMN `panduanHeadingTop` VARCHAR(191) NULL,
                    ADD COLUMN `panduanHeadingBottom` VARCHAR(191) NULL,
                    ADD COLUMN `panduanHeadingTopColor` VARCHAR(20) NULL,
                    ADD COLUMN `panduanHeadingBottomColor` VARCHAR(20) NULL;
