CREATE TABLE `compiledItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` varchar(64) NOT NULL,
	`topic` varchar(255) NOT NULL,
	`hook` varchar(500) NOT NULL,
	`summary` text NOT NULL,
	`sourceHeadlineIds` json NOT NULL,
	`isSelected` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compiledItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentPackages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` varchar(64) NOT NULL,
	`compiledItemId` int NOT NULL,
	`youtubeTitle` varchar(100),
	`youtubeDescription` text,
	`scriptOutline` text,
	`status` enum('draft','ready','exported') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentPackages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsSources` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('rss','gmail','youtube','website') NOT NULL,
	`config` json NOT NULL,
	`topics` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rawHeadlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` varchar(64) NOT NULL,
	`sourceId` varchar(64) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`url` varchar(2048) NOT NULL,
	`publishedAt` timestamp,
	`source` enum('rss','gmail','youtube','website') NOT NULL,
	`isSelected` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rawHeadlines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `runArchives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`archivedData` json NOT NULL,
	`obsidianExportPath` varchar(2048),
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `runArchives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`status` enum('draft','collecting','compiling','reviewing','completed','archived') NOT NULL DEFAULT 'draft',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`stats` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tone` varchar(50) NOT NULL DEFAULT 'professional',
	`format` json NOT NULL,
	`obsidianVaultPath` varchar(2048),
	`llmModel` varchar(100) NOT NULL DEFAULT 'claude-3.5-sonnet',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
