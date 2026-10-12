-- Zoom gambar unit jadi persen bertanda: 0 = pas (cover), + = perbesar, - = perkecil.
ALTER TABLE `Bus` MODIFY `unitImageZoom` INTEGER NOT NULL DEFAULT 0;

-- Nilai lama memakai 100 sebagai "pas", geser ke basis 0.
UPDATE `Bus` SET `unitImageZoom` = `unitImageZoom` - 100;
