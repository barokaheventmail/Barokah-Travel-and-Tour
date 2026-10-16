-- Judul & keterangan heading section panduan peserta (Itinerary, Denah Kamar,
-- Denah Kendaraan/VW), gaya sama dengan keterangan Denah Duduk.
ALTER TABLE `Event`
    ADD COLUMN `itineraryTitle` VARCHAR(200) NULL,
    ADD COLUMN `itineraryKeterangan` VARCHAR(200) NULL,
    ADD COLUMN `itineraryKeterangan2` VARCHAR(200) NULL,
    ADD COLUMN `denahKamarTitle` VARCHAR(200) NULL,
    ADD COLUMN `denahKamarKeterangan` VARCHAR(200) NULL,
    ADD COLUMN `denahKamarKeterangan2` VARCHAR(200) NULL,
    ADD COLUMN `vwKeterangan` VARCHAR(200) NULL,
    ADD COLUMN `vwKeterangan2` VARCHAR(200) NULL;
