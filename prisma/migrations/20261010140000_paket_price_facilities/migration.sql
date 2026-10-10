-- AlterTable
ALTER TABLE `PaketPrice` DROP COLUMN `note`,
    ADD COLUMN `facilities` JSON NULL;

