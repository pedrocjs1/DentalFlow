/**
 * Trial Expiration Job
 *
 * Runs every 1 hour. Finds subscriptions where trial has expired
 * and updates status to TRIAL_EXPIRED.
 */

import { prisma } from "@dentiqa/db";
import { createNotification } from "../services/notifications.js";

export async function runTrialExpirationCheck(): Promise<void> {
  const now = new Date();

  // Find trialing subscriptions with expired trial
  const expired = await prisma.subscription.findMany({
    where: {
      status: "TRIALING",
      trialEndDate: { lt: now },
    },
    include: {
      tenant: { select: { id: true, name: true } },
    },
  });

  for (const sub of expired) {
    try {
      await prisma.subscription.update({
        where: { id: sub.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { status: "TRIAL_EXPIRED" as any },
      });

      await prisma.tenant.update({
        where: { id: sub.tenantId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { subscriptionStatus: "TRIAL_EXPIRED" as any },
      });

      await createNotification(sub.tenantId, {
        type: "system",
        title: "Tu prueba gratuita ha vencido",
        message: "Activá tu plan para seguir usando Dentiqa. Tus datos están seguros.",
        link: "/configuracion?tab=facturacion",
      });

      console.log(`[trial-expiration] Trial expired for tenant ${sub.tenant.name} (${sub.tenantId})`);
    } catch (err) {
      console.error(`[trial-expiration] Error expiring trial for ${sub.tenantId}:`, err);
    }
  }

  if (expired.length > 0) {
    console.log(`[trial-expiration] Processed ${expired.length} expired trials`);
  }
}
