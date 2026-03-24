import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { adminMiddleware } from "../../middleware/admin-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { decryptToken } from "../../services/encryption.js";
import {
  submitTemplate,
  checkTemplateStatus,
  syncAllTemplates,
  deleteTemplateFromMeta,
} from "../../services/whatsapp-templates.js";

// Validate template name: only lowercase, numbers, underscores
const TEMPLATE_NAME_REGEX = /^[a-z0-9_]+$/;

export async function adminTemplateRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [adminMiddleware];

  // ─── GET /api/v1/admin/templates — List all templates ─────────────────────────
  app.get("/api/v1/admin/templates", {
    preHandler,
    handler: async (request) => {
      const query = request.query as { status?: string };

      const where: Record<string, unknown> = { isSystemTemplate: true };
      if (query.status && query.status !== "ALL") {
        where.status = query.status;
      }

      const templates = await prisma.whatsAppTemplate.findMany({
        where,
        orderBy: { createdAt: "asc" },
        include: {
          events: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      return { templates };
    },
  });

  // ─── GET /api/v1/admin/templates/:id — Template detail with timeline ──────────
  app.get("/api/v1/admin/templates/:id", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };

      const template = await prisma.whatsAppTemplate.findUnique({
        where: { id },
        include: {
          events: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });

      if (!template) {
        throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template no encontrado");
      }

      return { template };
    },
  });

  // ─── GET /api/v1/admin/templates/:id/timeline — Timeline events ───────────────
  app.get("/api/v1/admin/templates/:id/timeline", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };

      const events = await prisma.templateEvent.findMany({
        where: { templateId: id },
        orderBy: { createdAt: "desc" },
      });

      return { events };
    },
  });

  // ─── POST /api/v1/admin/templates — Create template (DRAFT) ──────────────────
  app.post("/api/v1/admin/templates", {
    preHandler,
    handler: async (request) => {
      const body = request.body as {
        name: string;
        displayName: string;
        description?: string;
        category: string;
        language?: string;
        headerType?: string;
        headerText?: string;
        bodyText: string;
        footerText?: string;
        buttonsJson?: unknown;
        variablesJson?: unknown;
        suggestedTrigger?: string;
      };

      // Validate name format
      if (!body.name || !TEMPLATE_NAME_REGEX.test(body.name)) {
        throw new AppError(
          400,
          "INVALID_NAME",
          "El nombre solo puede contener minúsculas, números y guiones bajos"
        );
      }

      if (!body.displayName?.trim()) {
        throw new AppError(400, "INVALID_INPUT", "El nombre visible es obligatorio");
      }

      if (!body.bodyText?.trim()) {
        throw new AppError(400, "INVALID_INPUT", "El cuerpo del mensaje es obligatorio");
      }

      if (body.bodyText.length > 1024) {
        throw new AppError(400, "BODY_TOO_LONG", "El cuerpo no puede exceder 1024 caracteres");
      }

      if (!["UTILITY", "MARKETING"].includes(body.category)) {
        throw new AppError(400, "INVALID_CATEGORY", "Categoría debe ser UTILITY o MARKETING");
      }

      // Check duplicate name
      const existing = await prisma.whatsAppTemplate.findFirst({
        where: { name: body.name, isSystemTemplate: true },
      });
      if (existing) {
        throw new AppError(400, "DUPLICATE_NAME", `Ya existe un template con el nombre "${body.name}"`);
      }

      const template = await prisma.whatsAppTemplate.create({
        data: {
          name: body.name,
          displayName: body.displayName.trim(),
          description: body.description?.trim() ?? null,
          category: body.category,
          language: body.language ?? "es_AR",
          headerType: body.headerType ?? null,
          headerText: body.headerText ?? null,
          bodyText: body.bodyText,
          footerText: body.footerText ?? null,
          buttonsJson: body.buttonsJson ?? undefined,
          variablesJson: body.variablesJson ?? undefined,
          suggestedTrigger: body.suggestedTrigger ?? null,
          status: "DRAFT",
          isSystemTemplate: true,
          isActive: true,
          tenantId: null,
        },
      });

      // Log event
      await prisma.templateEvent.create({
        data: {
          templateId: template.id,
          event: "created",
          details: `Creado por Super Admin`,
        },
      });

      return { template };
    },
  });

  // ─── PUT /api/v1/admin/templates/:id — Edit template ─────────────────────────
  app.put("/api/v1/admin/templates/:id", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        displayName?: string;
        description?: string;
        category?: string;
        headerType?: string;
        headerText?: string;
        bodyText?: string;
        footerText?: string;
        buttonsJson?: unknown;
        variablesJson?: unknown;
        suggestedTrigger?: string;
      };

      const existing = await prisma.whatsAppTemplate.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template no encontrado");
      }

      // Can only edit DRAFT or REJECTED templates
      if (!["DRAFT", "REJECTED"].includes(existing.status)) {
        throw new AppError(
          400,
          "CANNOT_EDIT",
          `No se puede editar un template con estado ${existing.status}. Primero eliminalo de Meta.`
        );
      }

      if (body.bodyText && body.bodyText.length > 1024) {
        throw new AppError(400, "BODY_TOO_LONG", "El cuerpo no puede exceder 1024 caracteres");
      }

      if (body.category && !["UTILITY", "MARKETING"].includes(body.category)) {
        throw new AppError(400, "INVALID_CATEGORY", "Categoría debe ser UTILITY o MARKETING");
      }

      const changes: string[] = [];
      if (body.bodyText && body.bodyText !== existing.bodyText) changes.push("bodyText");
      if (body.displayName && body.displayName !== existing.displayName) changes.push("displayName");
      if (body.category && body.category !== existing.category) changes.push("category");
      if (body.footerText !== undefined && body.footerText !== existing.footerText) changes.push("footerText");
      if (body.headerText !== undefined && body.headerText !== existing.headerText) changes.push("headerText");

      const template = await prisma.whatsAppTemplate.update({
        where: { id },
        data: {
          ...(body.displayName && { displayName: body.displayName.trim() }),
          ...(body.description !== undefined && { description: body.description?.trim() ?? null }),
          ...(body.category && { category: body.category }),
          ...(body.headerType !== undefined && { headerType: body.headerType }),
          ...(body.headerText !== undefined && { headerText: body.headerText }),
          ...(body.bodyText && { bodyText: body.bodyText }),
          ...(body.footerText !== undefined && { footerText: body.footerText }),
          ...(body.buttonsJson !== undefined && { buttonsJson: body.buttonsJson ?? undefined }),
          ...(body.variablesJson !== undefined && { variablesJson: body.variablesJson ?? undefined }),
          ...(body.suggestedTrigger !== undefined && { suggestedTrigger: body.suggestedTrigger }),
          status: "DRAFT", // Reset to draft on edit
        },
      });

      if (changes.length > 0) {
        await prisma.templateEvent.create({
          data: {
            templateId: id,
            event: "edited",
            details: `Campos modificados: ${changes.join(", ")}`,
          },
        });
      }

      return { template };
    },
  });

  // ─── DELETE /api/v1/admin/templates/:id — Delete template ─────────────────────
  app.delete("/api/v1/admin/templates/:id", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.whatsAppTemplate.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template no encontrado");
      }

      // Cascade delete includes TemplateEvents
      await prisma.whatsAppTemplate.delete({ where: { id } });

      return { success: true };
    },
  });

  // ─── POST /api/v1/admin/templates/:id/submit — Send to Meta ──────────────────
  app.post("/api/v1/admin/templates/:id/submit", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as { tenantId: string };

      if (!body.tenantId) {
        throw new AppError(400, "INVALID_INPUT", "Seleccioná una clínica con WhatsApp conectado");
      }

      // Get tenant with WABA credentials
      const tenant = await prisma.tenant.findUnique({
        where: { id: body.tenantId },
        select: {
          wabaId: true,
          whatsappAccessToken: true,
          whatsappStatus: true,
          whatsappDisplayNumber: true,
          name: true,
        },
      });

      if (!tenant?.wabaId || !tenant.whatsappAccessToken) {
        throw new AppError(400, "NO_WABA", "La clínica seleccionada no tiene WhatsApp conectado");
      }

      if (tenant.whatsappStatus !== "CONNECTED") {
        throw new AppError(400, "WABA_DISCONNECTED", "WhatsApp de la clínica no está conectado");
      }

      const accessToken = decryptToken(tenant.whatsappAccessToken);
      const result = await submitTemplate(id, tenant.wabaId, accessToken);

      if (!result.success) {
        throw new AppError(400, "SUBMIT_FAILED", result.error ?? "Error al enviar a Meta");
      }

      return { success: true, metaTemplateId: result.metaTemplateId };
    },
  });

  // ─── POST /api/v1/admin/templates/:id/check — Check status on Meta ───────────
  app.post("/api/v1/admin/templates/:id/check", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as { tenantId: string };

      if (!body.tenantId) {
        throw new AppError(400, "INVALID_INPUT", "Seleccioná una clínica con WhatsApp conectado");
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: body.tenantId },
        select: { wabaId: true, whatsappAccessToken: true, whatsappStatus: true },
      });

      if (!tenant?.wabaId || !tenant.whatsappAccessToken || tenant.whatsappStatus !== "CONNECTED") {
        throw new AppError(400, "NO_WABA", "La clínica seleccionada no tiene WhatsApp conectado");
      }

      const accessToken = decryptToken(tenant.whatsappAccessToken);
      const result = await checkTemplateStatus(id, tenant.wabaId, accessToken);

      if (!result.success) {
        throw new AppError(400, "CHECK_FAILED", result.error ?? "Error al verificar estado");
      }

      // Return updated template
      const template = await prisma.whatsAppTemplate.findUnique({
        where: { id },
        include: { events: { orderBy: { createdAt: "desc" }, take: 5 } },
      });

      return { template };
    },
  });

  // ─── POST /api/v1/admin/templates/sync — Sync all with Meta ──────────────────
  app.post("/api/v1/admin/templates/sync", {
    preHandler,
    handler: async (request) => {
      const body = request.body as { tenantId: string };

      if (!body.tenantId) {
        throw new AppError(400, "INVALID_INPUT", "Seleccioná una clínica con WhatsApp conectado");
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: body.tenantId },
        select: { wabaId: true, whatsappAccessToken: true, whatsappStatus: true },
      });

      if (!tenant?.wabaId || !tenant.whatsappAccessToken || tenant.whatsappStatus !== "CONNECTED") {
        throw new AppError(400, "NO_WABA", "La clínica seleccionada no tiene WhatsApp conectado");
      }

      const accessToken = decryptToken(tenant.whatsappAccessToken);
      const result = await syncAllTemplates(tenant.wabaId, accessToken);

      if (!result.success) {
        throw new AppError(400, "SYNC_FAILED", result.error ?? "Error al sincronizar");
      }

      return { success: true, updated: result.updated };
    },
  });

  // ─── GET /api/v1/admin/connected-wabas — List connected clinics for WABA selector
  app.get("/api/v1/admin/connected-wabas", {
    preHandler,
    handler: async () => {
      const tenants = await prisma.tenant.findMany({
        where: {
          whatsappStatus: "CONNECTED",
          wabaId: { not: null },
        },
        select: {
          id: true,
          name: true,
          wabaId: true,
          whatsappDisplayNumber: true,
        },
        orderBy: { name: "asc" },
      });

      return { tenants };
    },
  });
}
