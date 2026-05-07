-- AlterTable
ALTER TABLE `SyncRun` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'sync';

-- CreateIndex
CREATE INDEX `SyncRun_type_idx` ON `SyncRun`(`type`);
