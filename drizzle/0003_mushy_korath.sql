CREATE TABLE `companion_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`deviceType` enum('laptop','server') NOT NULL,
	`capabilities` text NOT NULL,
	`secretHash` varchar(128) NOT NULL,
	`isDefaultReasoner` boolean NOT NULL DEFAULT false,
	`lastSeenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companion_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `companion_devices_deviceId_unique` UNIQUE(`deviceId`)
);
--> statement-breakpoint
CREATE TABLE `daily_focus_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(64),
	`kind` enum('task.create','calendar.create','calendar.delete','gmail.trash') NOT NULL,
	`status` enum('draft','queued','ready','confirmed','executed','rejected','error','expired') NOT NULL DEFAULT 'draft',
	`encryptedInput` text,
	`proposalPayload` text,
	`providerResourceId` varchar(512),
	`errorCode` varchar(120),
	`expiresAt` timestamp NOT NULL,
	`confirmedAt` timestamp,
	`executedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_focus_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `companion_devices` ADD CONSTRAINT `companion_devices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_focus_actions` ADD CONSTRAINT `daily_focus_actions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;