-- CreateTable
CREATE TABLE `PaketImage` (
    `id` VARCHAR(191) NOT NULL,
    `paketId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaketImage_paketId_order_idx`(`paketId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaketImage` ADD CONSTRAINT `PaketImage_paketId_fkey` FOREIGN KEY (`paketId`) REFERENCES `PaketEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

