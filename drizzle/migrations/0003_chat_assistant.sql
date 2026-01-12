-- Migration: Add Chat Assistant tables and fields
-- Date: 2026-01-11

-- Add generatedBy field to compiledItems
ALTER TABLE `compiledItems` ADD COLUMN `generatedBy` VARCHAR(50) NULL COMMENT 'null or "assistant"';

-- Add generatedBy and sourceConversationId fields to contentPackages
ALTER TABLE `contentPackages` ADD COLUMN `generatedBy` VARCHAR(50) NULL COMMENT 'null or "assistant"';
ALTER TABLE `contentPackages` ADD COLUMN `sourceConversationId` VARCHAR(64) NULL COMMENT 'FK to chatConversations';

-- Create chatConversations table
CREATE TABLE `chatConversations` (
  `id` VARCHAR(64) PRIMARY KEY,
  `userId` INT NOT NULL,
  `title` VARCHAR(255),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Create chatMessages table
CREATE TABLE `chatMessages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversationId` VARCHAR(64) NOT NULL,
  `role` ENUM('user', 'assistant', 'system') NOT NULL,
  `content` TEXT NOT NULL,
  `metadata` JSON,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`conversationId`) REFERENCES `chatConversations`(`id`) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX `idx_chatConversations_userId` ON `chatConversations`(`userId`);
CREATE INDEX `idx_chatMessages_conversationId` ON `chatMessages`(`conversationId`);
CREATE INDEX `idx_contentPackages_sourceConversationId` ON `contentPackages`(`sourceConversationId`);
