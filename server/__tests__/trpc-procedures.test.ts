import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "../routers";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";

// Mock las funciones de base de datos
vi.mock("../db", () => ({
  getAllAgents: vi.fn(() => Promise.resolve([])),
  getAgentById: vi.fn(() => Promise.resolve(null)),
  createAgent: vi.fn((agent) =>
    Promise.resolve({ id: 1, ...agent, createdAt: new Date(), updatedAt: new Date() })
  ),
  updateAgent: vi.fn((id, updates) =>
    Promise.resolve({ id, ...updates, createdAt: new Date(), updatedAt: new Date() })
  ),
  getRecentEvents: vi.fn(() => Promise.resolve([])),
  getEventsByType: vi.fn(() => Promise.resolve([])),
  createEvent: vi.fn((event) =>
    Promise.resolve({ id: 1, ...event, createdAt: new Date() })
  ),
  getOpenAlerts: vi.fn(() => Promise.resolve([])),
  createAlert: vi.fn((alert) =>
    Promise.resolve({
      id: 1,
      ...alert,
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  ),
  updateAlert: vi.fn((id, updates) =>
    Promise.resolve({
      id,
      ...updates,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  ),
  getMetricsByCategory: vi.fn(() => Promise.resolve([])),
  createMetric: vi.fn((metric) =>
    Promise.resolve({ id: 1, ...metric, timestamp: new Date() })
  ),
  getAllUsers: vi.fn(() => Promise.resolve([])),
  getAuditLogsByUser: vi.fn(() => Promise.resolve([])),
}));

function createMockContext(overrides?: Partial<TrpcContext>): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
    ...overrides,
  };
}

function createAdminContext(): TrpcContext {
  return createMockContext({
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  });
}

describe("tRPC Procedures - Agents", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should list agents", async () => {
    const agents = await caller.agents.list();
    expect(Array.isArray(agents)).toBe(true);
  });

  it("should reject agent creation for non-admin users", async () => {
    const userCtx = createMockContext();
    const userCaller = appRouter.createCaller(userCtx);

    try {
      await userCaller.agents.create({
        name: "Test Agent",
        type: "data_analyst",
        capabilities: [],
        config: {},
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("should create an agent as admin", async () => {
    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    const agent = await adminCaller.agents.create({
      name: "Test Agent",
      type: "data_analyst",
      capabilities: ["data_query"],
      config: { timeout: 30000 },
    });

    expect(agent).toBeDefined();
    expect(agent.name).toBe("Test Agent");
  });
});

describe("tRPC Procedures - Events", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should get recent events", async () => {
    const events = await caller.events.recent({ limit: 10 });
    expect(Array.isArray(events)).toBe(true);
  });

  it("should get events by type", async () => {
    const events = await caller.events.byType({
      eventType: "user_action",
      limit: 5,
    });

    expect(Array.isArray(events)).toBe(true);
  });

  it("should create an event", async () => {
    const event = await caller.events.create({
      eventType: "user_action",
      aggregateType: "agent",
      aggregateId: "agent-123",
      data: { action: "execute", status: "success" },
      severity: "info",
    });

    expect(event).toBeDefined();
    expect(event.eventType).toBe("user_action");
  });
});

describe("tRPC Procedures - Alerts", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const adminCtx = createAdminContext();
    caller = appRouter.createCaller(adminCtx);
  });

  it("should get open alerts", async () => {
    const alerts = await caller.alerts.open({ limit: 10 });
    expect(Array.isArray(alerts)).toBe(true);
  });

  it("should create an alert as admin", async () => {
    const alert = await caller.alerts.create({
      title: "Test Alert",
      description: "This is a test alert",
      type: "service_failure",
      severity: "high",
    });

    expect(alert).toBeDefined();
    expect(alert.title).toBe("Test Alert");
    expect(alert.status).toBe("open");
  });

  it("should reject alert creation for non-admin users", async () => {
    const userCtx = createMockContext();
    const userCaller = appRouter.createCaller(userCtx);

    try {
      await userCaller.alerts.create({
        title: "Test Alert",
        type: "service_failure",
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("should update alert status as admin", async () => {
    const alert = await caller.alerts.create({
      title: "Test Alert",
      type: "service_failure",
      severity: "medium",
    });

    const updated = await caller.alerts.updateStatus({
      id: alert.id,
      status: "acknowledged",
    });

    expect(updated).toBeDefined();
  });
});

describe("tRPC Procedures - Metrics", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should get metrics by category", async () => {
    const metrics = await caller.metrics.byCategory({
      category: "performance",
      limit: 10,
    });

    expect(Array.isArray(metrics)).toBe(true);
  });

  it("should record a metric", async () => {
    const metric = await caller.metrics.record({
      name: "api_response_time",
      category: "performance",
      value: 125.5,
      unit: "ms",
      tags: ["api", "v1"],
    });

    expect(metric).toBeDefined();
    expect(metric.name).toBe("api_response_time");
  });
});

describe("tRPC Procedures - Users", () => {
  it("should list users as admin", async () => {
    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    const users = await adminCaller.users.list();
    expect(Array.isArray(users)).toBe(true);
  });

  it("should reject user listing for non-admin users", async () => {
    const userCtx = createMockContext();
    const userCaller = appRouter.createCaller(userCtx);

    try {
      await userCaller.users.list();
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

describe("tRPC Procedures - Audit", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should get user audit logs", async () => {
    const logs = await caller.audit.myLogs({ limit: 10 });
    expect(Array.isArray(logs)).toBe(true);
  });
});

describe("tRPC Procedures - Auth", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should get current user", async () => {
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.id).toBe(1);
  });

  it("should logout user", async () => {
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
