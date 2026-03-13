import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  User,
  users,
  agents,
  events,
  alerts,
  auditLogs,
  documents,
  metrics,
  configurations,
  InsertAgent,
  Agent,
  InsertEvent,
  Event,
  InsertAlert,
  Alert,
  InsertAuditLog,
  AuditLog,
  InsertDocument,
  Document,
  InsertMetric,
  Metric,
  InsertConfiguration,
  Configuration,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER OPERATIONS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
}

// ============= AGENT OPERATIONS =============

export async function createAgent(agent: InsertAgent): Promise<Agent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agents).values(agent);
  const agentId = (result as any).insertId;
  const created = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  return created[0]!;
}

export async function getAgentById(id: number): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAgents(): Promise<Agent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents);
}

export async function updateAgent(id: number, updates: Partial<Agent>): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(agents).set({ ...updates, updatedAt: new Date() }).where(eq(agents.id, id));
  return getAgentById(id);
}

// ============= EVENT OPERATIONS =============

export async function createEvent(event: InsertEvent): Promise<Event> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(events).values(event);
  const eventId = (result as any).insertId;
  const created = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return created[0]!;
}

export async function getEventById(id: number): Promise<Event | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEventsByType(eventType: string, limit: number = 100): Promise<Event[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(eq(events.eventType, eventType)).orderBy(desc(events.createdAt)).limit(limit);
}

export async function getRecentEvents(limit: number = 50): Promise<Event[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(desc(events.createdAt)).limit(limit);
}

// ============= ALERT OPERATIONS =============

export async function createAlert(alert: InsertAlert): Promise<Alert> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alerts).values(alert);
  const alertId = (result as any).insertId;
  const created = await db.select().from(alerts).where(eq(alerts.id, alertId)).limit(1);
  return created[0]!;
}

export async function getAlertById(id: number): Promise<Alert | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOpenAlerts(limit: number = 50): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alerts).where(eq(alerts.status, 'open')).orderBy(desc(alerts.createdAt)).limit(limit);
}

export async function updateAlert(id: number, updates: Partial<Alert>): Promise<Alert | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(alerts).set({ ...updates, updatedAt: new Date() }).where(eq(alerts.id, id));
  return getAlertById(id);
}

// ============= AUDIT LOG OPERATIONS =============

export async function createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(auditLogs).values(log);
  const logId = (result as any).insertId;
  const created = await db.select().from(auditLogs).where(eq(auditLogs.id, logId)).limit(1);
  return created[0]!;
}

export async function getAuditLogsByUser(userId: number, limit: number = 100): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function getAuditLogsByAction(action: string, limit: number = 100): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.action, action)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ============= DOCUMENT OPERATIONS =============

export async function createDocument(doc: InsertDocument): Promise<Document> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(doc);
  const docId = (result as any).insertId;
  const created = await db.select().from(documents).where(eq(documents.id, docId)).limit(1);
  return created[0]!;
}

export async function getDocumentById(id: number): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDocumentByS3Key(s3Key: string): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.s3Key, s3Key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserDocuments(userId: number): Promise<Document[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.uploadedBy, userId));
}

// ============= METRIC OPERATIONS =============

export async function createMetric(metric: InsertMetric): Promise<Metric> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(metrics).values(metric);
  const metricId = (result as any).insertId;
  const created = await db.select().from(metrics).where(eq(metrics.id, metricId)).limit(1);
  return created[0]!;
}

export async function getMetricsByCategory(category: string, limit: number = 100): Promise<Metric[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metrics).where(eq(metrics.category, category)).orderBy(desc(metrics.timestamp)).limit(limit);
}

export async function getMetricsByName(name: string, limit: number = 100): Promise<Metric[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metrics).where(eq(metrics.name, name)).orderBy(desc(metrics.timestamp)).limit(limit);
}

// ============= CONFIGURATION OPERATIONS =============

export async function getConfiguration(environment: string, key: string): Promise<Configuration | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(configurations).where(and(eq(configurations.environment, environment as any), eq(configurations.key, key))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setConfiguration(config: InsertConfiguration): Promise<Configuration> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(configurations).values(config);
  const configId = (result as any).insertId;
  const created = await db.select().from(configurations).where(eq(configurations.id, configId)).limit(1);
  return created[0]!;
}

export async function getConfigurationsByEnvironment(environment: string): Promise<Configuration[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(configurations).where(eq(configurations.environment, environment as any));
}
