-- AlterTable
ALTER TABLE `user` ADD COLUMN `adminApproved` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` INTEGER NULL,
    ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `loginOtpAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `loginOtpExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `loginOtpHash` VARCHAR(191) NULL;
