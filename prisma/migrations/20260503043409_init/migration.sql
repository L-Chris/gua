-- CreateTable
CREATE TABLE `Creator` (
    `id` VARCHAR(191) NOT NULL,
    `mid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `faceUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Creator_mid_key`(`mid`),
    INDEX `Creator_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Video` (
    `id` VARCHAR(191) NOT NULL,
    `bvid` VARCHAR(191) NOT NULL,
    `aid` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `cleanTitle` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `coverUrl` VARCHAR(191) NULL,
    `durationSeconds` INTEGER NOT NULL,
    `durationLabel` VARCHAR(191) NULL,
    `publishAt` DATETIME(3) NOT NULL,
    `typeName` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `sourceKeywords` JSON NULL,
    `subtitle` LONGTEXT NULL,
    `hasSubtitle` BOOLEAN NOT NULL DEFAULT false,
    `play` INTEGER NOT NULL DEFAULT 0,
    `like` INTEGER NOT NULL DEFAULT 0,
    `favorite` INTEGER NOT NULL DEFAULT 0,
    `share` INTEGER NOT NULL DEFAULT 0,
    `reply` INTEGER NOT NULL DEFAULT 0,
    `engagementRate` DOUBLE NOT NULL DEFAULT 0,
    `creatorId` VARCHAR(191) NOT NULL,
    `rawSearch` JSON NULL,
    `rawInfo` JSON NULL,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSyncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Video_bvid_key`(`bvid`),
    INDEX `Video_publishAt_idx`(`publishAt` DESC),
    INDEX `Video_play_idx`(`play` DESC),
    INDEX `Video_creatorId_publishAt_idx`(`creatorId`, `publishAt` DESC),
    INDEX `Video_typeName_idx`(`typeName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncRun` (
    `id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `keywords` JSON NOT NULL,
    `pages` INTEGER NOT NULL DEFAULT 1,
    `pageSize` INTEGER NOT NULL DEFAULT 10,
    `fetchedCount` INTEGER NOT NULL DEFAULT 0,
    `createdCount` INTEGER NOT NULL DEFAULT 0,
    `updatedCount` INTEGER NOT NULL DEFAULT 0,
    `subtitleCount` INTEGER NOT NULL DEFAULT 0,
    `message` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `SyncRun_startedAt_idx`(`startedAt` DESC),
    INDEX `SyncRun_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `Creator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
