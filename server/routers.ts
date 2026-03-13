import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createAgent,
  getAgentById,
  getAllAgents,
  updateAgent,
  createEvent,
  getRecentEvents,
  getEventsByType,
  createAlert,
  getOpenAlerts,
  updateAlert,
  getAuditLogsByUser,
  getAllUsers,
  createMetric,
  getMetricsByCategory,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  agents: router({
    list: protectedProcedure.query(async () => {
      return getAllAgents();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const agent = await getAgentById(input.id);
        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }
        return agent;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          type: z.enum([
            "data_analyst",
            "security_auditor",
            "performance_monitor",
            "business_intelligence",
            "custom",
          ]),
          capabilities: z.array(z.string()).default([]),
          config: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can create agents",
          });
        }
        return createAgent({
          name: input.name,
          description: input.description,
          type: input.type,
          capabilities: input.capabilities,
          config: input.config,
          createdBy: ctx.user.id,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z
            .enum(["active", "inactive", "error", "maintenance"])
            .optional(),
          config: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can update agents",
          });
        }
        const updated = await updateAgent(input.id, {
          status: input.status as any,
          config: input.config,
        });
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }
        return updated;
      }),
  }),

  events: router({
    recent: protectedProcedure
      .input(z.object({ limit: z.number().max(100).default(50) }))
      .query(async ({ input }) => {
        return getRecentEvents(input.limit);
      }),

    byType: protectedProcedure
      .input(
        z.object({
          eventType: z.string(),
          limit: z.number().max(100).default(50),
        })
      )
      .query(async ({ input }) => {
        return getEventsByType(input.eventType, input.limit);
      }),

    create: protectedProcedure
      .input(
        z.object({
          eventType: z.string().min(1).max(100),
          aggregateType: z.string().min(1).max(100),
          aggregateId: z.string().min(1).max(255),
          data: z.record(z.string(), z.unknown()),
          severity: z
            .enum(["info", "warning", "error", "critical"])
            .default("info"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createEvent({
          eventType: input.eventType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          userId: ctx.user!.id,
          data: input.data,
          severity: input.severity,
        } as any);
      }),
  }),

  alerts: router({
    open: protectedProcedure
      .input(z.object({ limit: z.number().max(100).default(50) }))
      .query(async ({ input }) => {
        return getOpenAlerts(input.limit);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          description: z.string().optional(),
          type: z.enum([
            "service_failure",
            "security_incident",
            "performance_degradation",
            "quota_exceeded",
            "agent_error",
            "custom",
          ]),
          severity: z
            .enum(["low", "medium", "high", "critical"])
            .default("medium"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can create alerts",
          });
        }
        return createAlert({
          title: input.title,
          description: input.description,
          type: input.type,
          severity: input.severity,
        } as any);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["open", "acknowledged", "resolved", "dismissed"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can update alerts",
          });
        }
        const updated = await updateAlert(input.id, {
          status: input.status as any,
        });
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Alert not found",
          });
        }
        return updated;
      }),
  }),

  metrics: router({
    byCategory: protectedProcedure
      .input(
        z.object({
          category: z.string(),
          limit: z.number().max(500).default(100),
        })
      )
      .query(async ({ input }) => {
        return getMetricsByCategory(input.category, input.limit);
      }),

    record: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          category: z.string().min(1).max(100),
          value: z.number(),
          unit: z.string().max(50).optional(),
          tags: z.array(z.string()).default([]),
        })
      )
      .mutation(async ({ input }) => {
        return createMetric({
          name: input.name,
          category: input.category,
          value: String(input.value),
          unit: input.unit || undefined,
          tags: input.tags,
        } as any);
      }),
  }),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can list users",
        });
      }
      return getAllUsers();
    }),
  }),

  audit: router({
    myLogs: protectedProcedure
      .input(z.object({ limit: z.number().max(500).default(100) }))
      .query(async ({ ctx, input }) => {
        return getAuditLogsByUser(ctx.user!.id, input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
