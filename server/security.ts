/**
 * Zero Trust Security Module
 * Implements context validation, risk scoring, and adaptive authentication
 */

import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import { createAuditLog } from "./db";

export interface SecurityContext {
  userId: number;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  riskScore: number;
}

export interface ValidationResult {
  isValid: boolean;
  riskScore: number;
  reason?: string;
}

/**
 * Calculate risk score based on multiple factors
 * Zero Trust: Never trust, always verify
 */
export async function calculateRiskScore(
  ctx: TrpcContext,
  action: string
): Promise<number> {
  let riskScore = 0;

  // Factor 1: IP Address changes (0-30 points)
  if (ctx.user?.lastIpAddress && ctx.user.lastIpAddress !== ctx.req.ip) {
    riskScore += 20; // IP changed
  }

  // Factor 2: User Agent changes (0-20 points)
  const userAgent = ctx.req.headers["user-agent"] as string;
  if (ctx.user?.lastUserAgent && ctx.user.lastUserAgent !== userAgent) {
    riskScore += 15; // User agent changed
  }

  // Factor 3: Time-based anomalies (0-20 points)
  const now = Date.now();
  const lastSignIn = ctx.user?.lastSignedIn?.getTime() || 0;
  const timeSinceLastSignIn = now - lastSignIn;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  if (timeSinceLastSignIn > oneWeek) {
    riskScore += 15; // Unusual gap since last sign-in
  }

  // Factor 4: Sensitive operations require higher scrutiny (0-30 points)
  const sensitiveActions = [
    "delete_user",
    "modify_permissions",
    "access_audit_logs",
    "modify_agent_config",
    "export_data",
  ];

  if (sensitiveActions.includes(action)) {
    riskScore += 25;
  }

  return Math.min(riskScore, 100); // Cap at 100
}

/**
 * Validate request context against Zero Trust policies
 */
export async function validateSecurityContext(
  ctx: TrpcContext,
  action: string,
  requiredRole?: "admin" | "user" | "agent"
): Promise<ValidationResult> {
  // 1. User must be authenticated
  if (!ctx.user) {
    return {
      isValid: false,
      riskScore: 100,
      reason: "User not authenticated",
    };
  }

  // 2. User must be active (removed - isActive column not in schema)
  // Skipping inactive user check as isActive was removed from users table

  // 3. Role-based access control
  if (requiredRole && ctx.user.role !== requiredRole && ctx.user.role !== "admin") {
    await createAuditLog({
      userId: ctx.user.id,
      action,
      resource: "security",
      status: "failure",
      errorMessage: `Insufficient permissions. Required: ${requiredRole}, Got: ${ctx.user.role}`,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"] as string,
    });
    return {
      isValid: false,
      riskScore: 90,
      reason: `Insufficient permissions for action: ${action}`,
    };
  }

  // 4. Calculate risk score
  const riskScore = await calculateRiskScore(ctx, action);

  // 5. Log the security event
  await createAuditLog({
    userId: ctx.user.id,
    action,
    resource: "security",
    status: "success",
    ipAddress: ctx.req.ip,
    userAgent: ctx.req.headers["user-agent"] as string,
    changes: { riskScore },
  });

  // 6. Determine if action should be allowed based on risk
  const isValid = riskScore < 80; // Allow if risk is below threshold

  return {
    isValid,
    riskScore,
    reason: isValid ? undefined : "Risk score too high",
  };
}

/**
 * Enforce Zero Trust: Always verify before allowing sensitive operations
 */
export async function enforceZeroTrust(
  ctx: TrpcContext,
  action: string,
  requiredRole?: "admin" | "user" | "agent"
): Promise<void> {
  const validation = await validateSecurityContext(ctx, action, requiredRole);

  if (!validation.isValid) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: validation.reason || "Access denied",
    });
  }
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>"']/g, (char) => {
      const map: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[char] || char;
    });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320;
}

/**
 * Hash sensitive data for logging (never log actual values)
 */
export function hashForLogging(value: string): string {
  if (!value) return "[empty]";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((time) => now - time < this.windowMs);

    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Global rate limiters for different operations
 */
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const apiRateLimiter = new RateLimiter(100, 60 * 1000); // 100 requests per minute
export const sensitiveActionRateLimiter = new RateLimiter(10, 60 * 60 * 1000); // 10 per hour
