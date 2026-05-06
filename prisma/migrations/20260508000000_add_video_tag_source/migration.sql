-- CreateTable
CREATE TABLE `VideoTag` (
    `videoId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'manual',

    PRIMARY KEY (`videoId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `VideoTag_tagId_idx` ON `VideoTag`(`tagId`);

-- AddForeignKey
ALTER TABLE `VideoTag` ADD CONSTRAINT `VideoTag_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VideoTag` ADD CONSTRAINT `VideoTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy data from old implicit junction table
INSERT INTO `VideoTag` (`videoId`, `tagId`, `source`)
SELECT `B`, `A`, 'manual'
FROM `_TagToVideo`;

-- Drop old implicit junction table
DROP TABLE `_TagToVideo`;
