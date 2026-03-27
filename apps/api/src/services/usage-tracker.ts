/**
 * Usage Tracker
 * Records all billable events: WhatsApp messages, AI interactions, campaign sends.
 * Also enforces plan limits (soft block — logs overage but allows through).
 */

import { prisma } from "@dentiqa/db";
import { PLAN_LIMITS, USAGE_WARNING_THRESHOLD, USAGE_LIMIT_THRESHOLD, AI_EXTRA_BLOCK_SIZE, AI_EXTRA_BLOCK_PRICE } from "@dentiqa/shared";
import type { FastifyBaseLogger } from "fastify";

type UsageType = "WHATSAPP_MESSAGE" | "AI_INTERACTION" | "AI_TOKENS" | "CAMPAIGN_SEND" | "EMAIL_SEND";

function currentPeriod(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${mm}`;
}

// ─── Record usage ─────────────────────────────────────────────────────────────

export async function recordUsage(
  tenantId: string,
  type: UsageType,
  quantity = 1,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.usageRecord.create({
      data: {
        tenantId,
        type,
        quantity,
        period: currentPeriod(),
        metadata: metadata ? (metadata as Record<string, string>) : undefined,
      },
    });
  } catch {
    // Never throw — usage tracking must not block the main flow
  }
}

// ─── Get current month usage for a tenant ────────────────────────────────────

interface MonthlyUsage {
  whatsappMessages: number;
  aiInteractions: number;
  campaignSends: number;
  emailSends: number;
}

export async function getMonthlyUsage(
  tenantId: string,
  period?: string
): Promise<MonthlyUsage> {
  const p = period ?? currentPeriod();

  const records = await prisma.usageRecord.groupBy({
    by: ["type"],
    where: { tenantId, period: p },
    _sum: { quantity: true },
  });

  const map: Record<string, number> = {};
  for (const r of records) {
    map[r.type] = r._sum.quantity ?? 0;
  }

  return {
    whatsappMessages: (map["WHATSAPP_MESSAGE"] ?? 0),
    aiInteractions: (map["AI_INTERACTION"] ?? 0) + (map["AI_TOKENS"] ?? 0),
    campaignSends: map["CAMPAIGN_SEND"] ?? 0,
    emailSends: map["EMAIL_SEND"] ?? 0,
  };
}

// ─── Check if tenant can send (soft limit enforcement) ───────────────────────

export interface PlanLimitResult {
  allowed: boolean;
  usage: number;
  limit: number;
  overLimit: boolean;
  atWarning: boolean;       // >= 80% usage
  percentUsed: number;
  extraBlocksUsed: number;  // how many extra blocks (1000 calls) beyond the limit
  extraCostUSD: number;     // estimated extra cost
}

export async function checkPlanLimit(
  tenantId: string,
  type: "WHATSAPP_MESSAGE" | "AI_INTERACTION",
  log?: FastifyBaseLogger
): Promise<PlanLimitResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  const plan = tenant?.plan ?? "STARTER";
  const limits = PLAN_LIMITS[plan];

  const limitValue = type === "WHATSAPP_MESSAGE"
    ? limits.whatsappMessages
    : limits.aiInteractions;

  // -1 = unlimited
  if (limitValue === -1) {
    return { allowed: true, usage: 0, limit: -1, overLimit: false, atWarning: false, percentUsed: 0, extraBlocksUsed: 0, extraCostUSD: 0 };
  }

  const usage = await getMonthlyUsage(tenantId);
  const current = type === "WHATSAPP_MESSAGE" ? usage.whatsappMessages : usage.aiInteractions;

  const percentUsed = Math.round((current / limitValue) * 100);
  const overLimit = current >= limitValue;
  const atWarning = !overLimit && current >= limitValue * USAGE_WARNING_THRESHOLD;

  // Calculate extra blocks used beyond plan limit
  const overageCount = Math.max(0, current - limitValue);
  const extraBlocksUsed = Math.ceil(overageCount / AI_EXTRA_BLOCK_SIZE);
  const extraCostUSD = extraBlocksUsed * AI_EXTRA_BLOCK_PRICE;

  if (atWarning && log) {
    log.warn(
      { tenantId, type, current, limit: limitValue, percentUsed },
      `Tenant at ${percentUsed}% of plan limit — approaching limit`
    );
  }

  if (overLimit && log) {
    log.warn(
      { tenantId, type, current, limit: limitValue, extraBlocksUsed, extraCostUSD },
      "Tenant exceeded plan limit — allowing through (overage billing)"
    );
  }

  // Soft block: always allow through — overage is billed
  return {
    allowed: true,
    usage: current,
    limit: limitValue,
    overLimit,
    atWarning,
    percentUsed,
    extraBlocksUsed,
    extraCostUSD,
  };
}

// ─── Get multi-tenant usage report (for Super Admin) ─────────────────────────

interface TenantUsageSummary {
  tenantId: string;
  period: string;
  whatsappMessages: number;
  aiInteractions: number;
  campaignSends: number;
  emailSends: number;
}

export async function getAllTenantsUsage(period?: string): Promise<TenantUsageSummary[]> {
  const p = period ?? currentPeriod();

  const records = await prisma.usageRecord.groupBy({
    by: ["tenantId", "type"],
    where: { period: p },
    _sum: { quantity: true },
  });

  // Group by tenantId
  const byTenant = new Map<string, TenantUsageSummary>();
  for (const r of records) {
    if (!byTenant.has(r.tenantId)) {
      byTenant.set(r.tenantId, {
        tenantId: r.tenantId,
        period: p,
        whatsappMessages: 0,
        aiInteractions: 0,
        campaignSends: 0,
        emailSends: 0,
      });
    }
    const entry = byTenant.get(r.tenantId)!;
    const qty = r._sum.quantity ?? 0;
    if (r.type === "WHATSAPP_MESSAGE") entry.whatsappMessages += qty;
    else if (r.type === "AI_INTERACTION" || r.type === "AI_TOKENS") entry.aiInteractions += qty;
    else if (r.type === "CAMPAIGN_SEND") entry.campaignSends += qty;
    else if (r.type === "EMAIL_SEND") entry.emailSends += qty;
  }

  return Array.from(byTenant.values());
}
