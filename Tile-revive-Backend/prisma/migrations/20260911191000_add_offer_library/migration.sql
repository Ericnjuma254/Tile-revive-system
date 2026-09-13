CREATE TABLE `offer` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `type` VARCHAR(191) NOT NULL,
  `productId` INTEGER NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `discountValue` DOUBLE NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `offer_productId_idx` (`productId`),
  INDEX `offer_status_idx` (`status`),
  INDEX `offer_type_idx` (`type`),
  CONSTRAINT `offer_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `product` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
