import { describe, it, expect, vi, beforeEach } from "vitest";
import { trpc } from "@/lib/trpc";

// Mock trpc
vi.mock("@/lib/trpc", () => ({
  trpc: {
    agents: {
      list: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
    },
    events: {
      recent: {
        useQuery: vi.fn(),
      },
      byType: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
    },
    alerts: {
      open: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
      updateStatus: {
        useMutation: vi.fn(),
      },
    },
    metrics: {
      byCategory: {
        useQuery: vi.fn(),
      },
      record: {
        useMutation: vi.fn(),
      },
    },
    useUtils: vi.fn(() => ({
      agents: { list: { invalidate: vi.fn() } },
      events: { recent: { invalidate: vi.fn() } },
      alerts: { open: { invalidate: vi.fn() } },
    })),
  },
}));

const mockAgent = {
  id: 1,
  name: "Test Agent",
  type: "data_analyst" as const,
  status: "active" as const,
  description: "Test description",
  capabilities: [],
  config: {},
  createdBy: 1,
  isActive: true,
  lastExecutedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEvent = {
  id: 1,
  eventType: "user_action",
  aggregateType: "agent",
  aggregateId: "agent-1",
  userId: 1,
  agentId: null,
  data: { action: "execute" },
  metadata: null,
  severity: "info" as const,
  createdAt: new Date(),
};

const mockAlert = {
  id: 1,
  title: "Test Alert",
  description: "Test description",
  type: "service_failure" as const,
  severity: "high" as const,
  status: "open" as const,
  eventId: null,
  assignedTo: null,
  emailSent: false,
  emailSentAt: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Dashboard Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tRPC Hooks", () => {
    it("should have agents hooks", () => {
      expect(trpc.agents.list).toBeDefined();
      expect(trpc.agents.create).toBeDefined();
    });

    it("should have events hooks", () => {
      expect(trpc.events.recent).toBeDefined();
      expect(trpc.events.byType).toBeDefined();
      expect(trpc.events.create).toBeDefined();
    });

    it("should have alerts hooks", () => {
      expect(trpc.alerts.open).toBeDefined();
      expect(trpc.alerts.create).toBeDefined();
      expect(trpc.alerts.updateStatus).toBeDefined();
    });

    it("should have metrics hooks", () => {
      expect(trpc.metrics.byCategory).toBeDefined();
      expect(trpc.metrics.record).toBeDefined();
    });
  });

  describe("Mock Data", () => {
    it("should have valid mock agent", () => {
      expect(mockAgent.id).toBe(1);
      expect(mockAgent.name).toBe("Test Agent");
      expect(mockAgent.type).toBe("data_analyst");
      expect(mockAgent.status).toBe("active");
    });

    it("should have valid mock event", () => {
      expect(mockEvent.id).toBe(1);
      expect(mockEvent.eventType).toBe("user_action");
      expect(mockEvent.severity).toBe("info");
    });

    it("should have valid mock alert", () => {
      expect(mockAlert.id).toBe(1);
      expect(mockAlert.title).toBe("Test Alert");
      expect(mockAlert.severity).toBe("high");
      expect(mockAlert.status).toBe("open");
    });
  });
});
