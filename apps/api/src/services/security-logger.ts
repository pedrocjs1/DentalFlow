/**
 * Security Logger — fire-and-forget security event logging.
 * Never blocks calling flow. Errors are swallowed.
 */

import { prisma } from "@dentiqa/db";

interface SecurityEvent {
  type: string; // LOGIN_ATTEMPT, LOGIN_FAILED, UNAUTHORIZED_ACCESS, RATE_LIMITED,
                // WEBHOOK_INVALID_SIGNATURE, PROMPT_INJECTION_ATTEMPT, SUSPICIOUS_ACTIVITY
  ip?: string;
  email?: string;
  userId?: string;
  tenantId?: string;
  endpoint?: string;
  details?: string;
  success?: boolean;
  userAgent?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await prisma.securityLog.create({
      data: {
        type: event.type,
        ip: event.ip ?? null,
        email: event.email ?? null,
        userId: event.userId ?? null,
        tenantId: event.tenantId ?? null,
        endpoint: event.endpoint ?? null,
        details: event.details ?? null,
        success: event.success ?? false,
        userAgent: event.userAgent ?? null,
        severity: event.severity ?? "LOW",
      },
    });
  } catch (err) {
    // Fire-and-forget — never block
    console.error("[security-logger] Failed to log event:", err);
  }
}

/**
 * Check if an IP has too many failed login attempts (lockout).
 * Returns true if the IP should be blocked.
 */
export async function isLoginLocked(ip: string): Promise<boolean> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const failedAttempts = await prisma.securityLog.count({
    where: {
      type: "LOGIN_FAILED",
      ip,
      createdAt: { gte: fiveMinAgo },
    },
  });

  return failedAttempts >= 5;
}
