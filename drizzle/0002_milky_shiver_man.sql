CREATE TABLE `google_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`grantedScopes` text NOT NULL,
	`tokenExpiry` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `google_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_connections_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `google_connections` ADD CONSTRAINT `google_connections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;