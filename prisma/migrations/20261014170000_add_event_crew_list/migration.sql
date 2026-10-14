-- Daftar crew on duty section Tata Tertib (JSON array {name, role, photoUrl}).
-- Menggantikan kolom tunggal crewName/crewRole/crewPhotoUrl; kolom lama tetap
-- dipertahankan untuk kompatibilitas dan dimigrasikan saat admin menyimpan.
ALTER TABLE `Event` ADD COLUMN `crewList` LONGTEXT NULL;
