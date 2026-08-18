CREATE INDEX `notifications_user_created_idx` ON `notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`userId`,`readAt`);