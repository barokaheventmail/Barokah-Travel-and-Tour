-- Urutan halaman + section tambahan untuk panduan peserta.
-- JSON array node: { type: 'builtin', builtin } atau
-- { type: 'custom', title, items: string[], note: string }.
-- Null = urutan bawaan (semua section bawaan tampil pada urutan asli).
ALTER TABLE `Event` ADD COLUMN `panduanSections` LONGTEXT NULL;
