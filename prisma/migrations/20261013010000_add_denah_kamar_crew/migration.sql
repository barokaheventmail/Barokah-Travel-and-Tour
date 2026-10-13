-- Crew on Duty khusus section Denah Kamar pada panduan peserta,
-- terpisah dari crewName/crewRole/crewPhotoUrl section Tata Tertib.
ALTER TABLE `Event` ADD COLUMN `denahKamarCrewName` VARCHAR(500) NULL;
ALTER TABLE `Event` ADD COLUMN `denahKamarCrewRole` VARCHAR(500) NULL;
ALTER TABLE `Event` ADD COLUMN `denahKamarCrewPhotoUrl` VARCHAR(500) NULL;
