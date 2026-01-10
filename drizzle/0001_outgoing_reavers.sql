CREATE TABLE `headlineEmbeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`headlineId` int NOT NULL,
	`embedding` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `headlineEmbeddings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `keywordAlerts` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`keyword` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`notifyDesktop` boolean NOT NULL DEFAULT true,
	`autoTag` boolean NOT NULL DEFAULT true,
	`matchCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keywordAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `newsSources` ADD `lastFetchedAt` timestamp;--> statement-breakpoint
ALTER TABLE `newsSources` ADD `selectionRate` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `newsSources` ADD `finalRate` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `newsSources` ADD `userRating` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `newsSources` ADD `qualityScore` int DEFAULT 50;--> statement-breakpoint
ALTER TABLE `newsSources` ADD `totalHeadlines` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `newsSources` ADD `selectedHeadlines` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `newsSources` ADD `finalHeadlines` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `rawHeadlines` ADD `deduplicationGroupId` varchar(64);--> statement-breakpoint
ALTER TABLE `rawHeadlines` ADD `heatScore` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `rawHeadlines` ADD `isBestVersion` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `rawHeadlines` ADD `matchedKeywords` json;--> statement-breakpoint
ALTER TABLE `runs` ADD `isIncremental` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `userSettings` ADD `monthlyBudget` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `userSettings` ADD `currentMonthSpend` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `userSettings` ADD `lastBudgetReset` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `userSettings` ADD `defaultIncrementalMode` boolean DEFAULT true;