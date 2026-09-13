CREATE TABLE IF NOT EXISTS communicationlog (
    id INTEGER NOT NULL AUTO_INCREMENT,
    customerId INTEGER NOT NULL,
    orderId INTEGER NULL,
    userId INTEGER NULL,
    type VARCHAR(191) NOT NULL,
    channel VARCHAR(191) NOT NULL DEFAULT 'EMAIL',
    recipient VARCHAR(191) NOT NULL,
    subject VARCHAR(191) NULL,
    status VARCHAR(191) NOT NULL DEFAULT 'SENT',
    messageId VARCHAR(191) NULL,
    errorMessage LONGTEXT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX communicationlog_customerId_idx (customerId),
    INDEX communicationlog_orderId_idx (orderId),
    INDEX communicationlog_userId_idx (userId),
    INDEX communicationlog_type_idx (type),
    INDEX communicationlog_status_idx (status),
    INDEX communicationlog_createdAt_idx (createdAt),

    PRIMARY KEY (id),

    CONSTRAINT communicationlog_customerId_fkey
        FOREIGN KEY (customerId)
        REFERENCES customer(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT communicationlog_orderId_fkey
        FOREIGN KEY (orderId)
        REFERENCES `order`(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT communicationlog_userId_fkey
        FOREIGN KEY (userId)
        REFERENCES user(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
