-- AlterTable
ALTER TABLE `PaketEvent` ADD COLUMN `badge` VARCHAR(100) NULL,
    ADD COLUMN `body` TEXT NULL,
    ADD COLUMN `subtitle` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `PaketPrice` (
    `id` VARCHAR(191) NOT NULL,
    `paketId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `note` VARCHAR(300) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `PaketPrice_paketId_order_idx`(`paketId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaketPrice` ADD CONSTRAINT `PaketPrice_paketId_fkey` FOREIGN KEY (`paketId`) REFERENCES `PaketEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

