-- Override judul/keterangan per halaman panduan (JSON map).
ALTER TABLE `Event` ADD COLUMN `panduanHeadings` LONGTEXT NULL;
