CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('data_analyst','security_auditor','performance_monitor','business_intelligence','custom') NOT NULL,
	`status` enum('active','inactive','error','maintenance') NOT NULL DEFAULT 'active',
	`capabilities` json NOT NULL DEFAULT ('[]'),
	`config` json NOT NULL,
	`createdBy` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastExecutedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('service_failure','security_incident','performance_degradation','quota_exceeded','agent_error','custom') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','acknowledged','resolved','dismissed') NOT NULL DEFAULT 'open',
	`eventId` int,
	`assignedTo` int,
	`emailSent` boolean NOT NULL DEFAULT false,
	`emailSentAt` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`resource` varchar(100) NOT NULL,
	`resourceId` varchar(255),
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('success','failure') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`environment` enum('development','staging','production') NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`isSecret` boolean NOT NULL DEFAULT false,
	`description` text,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`mimeType` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`s3Key` varchar(500) NOT NULL,
	`s3Url` text NOT NULL,
	`uploadedBy` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_s3Key_unique` UNIQUE(`s3Key`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`aggregateType` varchar(100) NOT NULL,
	`aggregateId` varchar(255) NOT NULL,
	`userId` int,
	`agentId` int,
	`data` json NOT NULL,
	`metadata` json,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`value` decimal(18,4) NOT NULL,
	`unit` varchar(50),
	`tags` json NOT NULL DEFAULT ('[]'),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','agent') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastIpAddress` varchar(45);--> statement-breakpoint
ALTER TABLE `users` ADD `lastUserAgent` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `configurations` ADD CONSTRAINT `configurations_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `agent_type_idx` ON `agents` (`type`);--> statement-breakpoint
CREATE INDEX `agent_status_idx` ON `agents` (`status`);--> statement-breakpoint
CREATE INDEX `alert_type_idx` ON `alerts` (`type`);--> statement-breakpoint
CREATE INDEX `alert_severity_idx` ON `alerts` (`severity`);--> statement-breakpoint
CREATE INDEX `alert_status_idx` ON `alerts` (`status`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `auditLogs` (`action`);--> statement-breakpoint
CREATE INDEX `resource_idx` ON `auditLogs` (`resource`);--> statement-breakpoint
CREATE INDEX `audit_created_at_idx` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `env_key_idx` ON `configurations` (`environment`,`key`);--> statement-breakpoint
CREATE INDEX `s3_key_idx` ON `documents` (`s3Key`);--> statement-breakpoint
CREATE INDEX `event_type_idx` ON `events` (`eventType`);--> statement-breakpoint
CREATE INDEX `aggregate_idx` ON `events` (`aggregateType`,`aggregateId`);--> statement-breakpoint
CREATE INDEX `severity_idx` ON `events` (`severity`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `metric_name_idx` ON `metrics` (`name`);--> statement-breakpoint
CREATE INDEX `metric_category_idx` ON `metrics` (`category`);--> statement-breakpoint
CREATE INDEX `metric_timestamp_idx` ON `metrics` (`timestamp`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);