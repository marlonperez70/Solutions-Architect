import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json, index, foreignKey } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "agent"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  roleIdx: index("role_idx").on(table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Specialized AI Agents for enterprise operations
 * Each agent has specific capabilities and responsibilities
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", [
    "data_analyst",
    "security_auditor",
    "performance_monitor",
    "business_intelligence",
    "custom"
  ]).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "error", "maintenance"]).default("active").notNull(),
  capabilities: json("capabilities").$type<string[]>().default([]).notNull(),
  config: json("config").$type<Record<string, unknown>>().notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  createdByFk: foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
  }),
  typeIdx: index("agent_type_idx").on(table.type),
  statusIdx: index("agent_status_idx").on(table.status),
}));

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * System Events for Event Sourcing and audit trail
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  aggregateType: varchar("aggregateType", { length: 100 }).notNull(),
  aggregateId: varchar("aggregateId", { length: 255 }).notNull(),
  userId: int("userId"),
  agentId: int("agentId"),
  data: json("data").$type<Record<string, unknown>>().notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("info").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  agentIdFk: foreignKey({
    columns: [table.agentId],
    foreignColumns: [agents.id],
  }),
  eventTypeIdx: index("event_type_idx").on(table.eventType),
  aggregateIdx: index("aggregate_idx").on(table.aggregateType, table.aggregateId),
  severityIdx: index("severity_idx").on(table.severity),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * System Alerts and Notifications
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", [
    "performance_issue",
    "security_breach",
    "system_error",
    "business_alert",
    "custom"
  ]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("low").notNull(),
  status: mysqlEnum("status", ["open", "acknowledged", "resolved", "dismissed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  typeIdx: index("alert_type_idx").on(table.type),
  severityIdx: index("alert_severity_idx").on(table.severity),
  statusIdx: index("alert_status_idx").on(table.status),
}));

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Audit Log for compliance and security tracking
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resourceId", { length: 255 }),
  changes: json("changes").$type<Record<string, unknown>>(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  status: mysqlEnum("status", ["success", "failure"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  actionIdx: index("action_idx").on(table.action),
  resourceIdx: index("resource_idx").on(table.resource),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Metrics and KPIs for business intelligence
 */
export const metrics = mysqlTable("metrics", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  value: decimal("value", { precision: 18, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  tags: json("tags").$type<string[]>().default([]).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("metric_name_idx").on(table.name),
  categoryIdx: index("metric_category_idx").on(table.category),
  timestampIdx: index("metric_timestamp_idx").on(table.timestamp),
}));

export type Metric = typeof metrics.$inferSelect;
export type InsertMetric = typeof metrics.$inferInsert;

/**
 * Storage for files and documents
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  size: int("size").notNull(),
  s3Key: varchar("s3Key", { length: 500 }).notNull().unique(),
  s3Url: text("s3Url").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uploadedByFk: foreignKey({
    columns: [table.uploadedBy],
    foreignColumns: [users.id],
  }),
  s3KeyIdx: index("s3_key_idx").on(table.s3Key),
}));

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Configuration for different environments
 */
export const configurations = mysqlTable("configurations", {
  id: int("id").autoincrement().primaryKey(),
  environment: mysqlEnum("environment", ["development", "staging", "production"]).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  isSecret: boolean("isSecret").default(false).notNull(),
  description: text("description"),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  updatedByFk: foreignKey({
    columns: [table.updatedBy],
    foreignColumns: [users.id],
  }),
  envKeyIdx: index("env_key_idx").on(table.environment, table.key),
}));

export type Configuration = typeof configurations.$inferSelect;
export type InsertConfiguration = typeof configurations.$inferInsert;

/**
 * Relations for better query organization
 */
export const usersRelations = relations(users, ({ many }) => ({
  agents: many(agents),
  events: many(events),
  auditLogs: many(auditLogs),
  documents: many(documents),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  creator: one(users, {
    fields: [agents.createdBy],
    references: [users.id],
  }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [events.agentId],
    references: [agents.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  // Alerts are independent entities
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const configurationsRelations = relations(configurations, ({ one }) => ({
  updater: one(users, {
    fields: [configurations.updatedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const metricsRelations = relations(metrics, ({ one }) => ({
  // Metrics can be associated with agents or users through tags
}));
