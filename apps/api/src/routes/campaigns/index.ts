import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function campaignRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  app.get("/api/v1/campaigns", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };

      const campaigns = await prisma.campaign.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: "desc" },
      });

      return campaigns;
    },
  });

  app.post("/api/v1/campaigns", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        name: string;
        type: string;
        channel?: string;
        messageContent?: string;
        subject?: string;
        segmentFilter?: unknown;
        triggerType?: string;
        triggerConfig?: unknown;
        scheduledAt?: string;
      };

      const campaign = await prisma.campaign.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          type: body.type as "MANUAL" | "BIRTHDAY" | "REMINDER_6M" | "REMINDER_24H" | "REACTIVATION" | "PROMO" | "WELCOME" | "POST_VISIT" | "CUSTOM",
          channel: (body.channel as "WHATSAPP" | "EMAIL" | "WEB_CHAT" | "SMS") ?? "WHATSAPP",
          messageContent: body.messageContent,
          subject: body.subject,
          segmentFilter: body.segmentFilter as object ?? undefined,
          triggerType: body.triggerType as "DATE_FIELD" | "EVENT" | "TIME_AFTER_EVENT" | "CRON" | undefined,
          triggerConfig: body.triggerConfig as object ?? undefined,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        },
      });

      return reply.status(201).send(campaign);
    },
  });
}
