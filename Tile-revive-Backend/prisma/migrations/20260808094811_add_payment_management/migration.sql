/*
  Warnings:

  - A unique constraint covering the columns `[kcbPaymentCode]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `payment` ADD COLUMN `kcbPaymentCode` VARCHAR(191) NULL,
    ADD COLUMN `reconciled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `reconciledAt` DATETIME(3) NULL,
    ADD COLUMN `reconciliationNote` VARCHAR(191) NULL,
    MODIFY `phoneNumber` VARCHAR(191) NULL,
    MODIFY `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'MPESA',
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX `Payment_kcbPaymentCode_key` ON `Payment`(`kcbPaymentCode`);
