ALTER TABLE `alerts` DROP FOREIGN KEY `alerts_eventId_events_id_fk`;
--> statement-breakpoint
ALTER TABLE `alerts` DROP FOREIGN KEY `alerts_assignedTo_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `alerts` MODIFY COLUMN `type` enum('performance_issue','security_breach','system_error','business_alert','custom') NOT NULL;--> statement-breakpoint
ALTER TABLE `alerts` MODIFY COLUMN `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'low';--> statement-breakpoint
ALTER TABLE `agents` DROP COLUMN `isActive`;--> statement-breakpoint
ALTER TABLE `agents` DROP COLUMN `lastExecutedAt`;--> statement-breakpoint
ALTER TABLE `alerts` DROP COLUMN `eventId`;--> statement-breakpoint
ALTER TABLE `alerts` DROP COLUMN `assignedTo`;--> statement-breakpoint
ALTER TABLE `alerts` DROP COLUMN `emailSent`;--> statement-breakpoint
ALTER TABLE `alerts` DROP COLUMN `emailSentAt`;--> statement-breakpoint
ALTER TABLE `alerts` DROP COLUMN `resolvedAt`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `isActive`;