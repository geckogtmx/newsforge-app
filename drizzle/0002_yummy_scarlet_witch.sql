ALTER TABLE `compiledItems` MODIFY COLUMN `id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `contentPackages` MODIFY COLUMN `id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `contentPackages` MODIFY COLUMN `compiledItemId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `compiledItems` ADD `heatScore` int DEFAULT 1 NOT NULL;