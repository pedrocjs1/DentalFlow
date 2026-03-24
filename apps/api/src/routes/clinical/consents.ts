import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function consentRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET /api/v1/patients/:patientId/consents
  app.get("/api/v1/patients/:patientId/consents", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const consents = await prisma.patientConsent.findMany({
        where: { patientId, tenantId: user.tenantId },
        include: {
          template: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return { consents };
    },
  });

  // POST /api/v1/patients/:patientId/consents
  app.post("/api/v1/patients/:patientId/consents", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as {
        templateId?: string;
        dentistId: string;
        title: string;
        content: string;
      };

      if (!body.dentistId) {
        throw new AppError(400, "VALIDATION_ERROR", "dentistId es requerido");
      }
      if (!body.title) {
        throw new AppError(400, "VALIDATION_ERROR", "title es requerido");
      }
      if (!body.content) {
        throw new AppError(400, "VALIDATION_ERROR", "content es requerido");
      }

      // Verify dentist belongs to tenant
      const dentist = await prisma.dentist.findFirst({
        where: { id: body.dentistId, tenantId: user.tenantId, isActive: true },
      });
      if (!dentist) throw new AppError(404, "DENTIST_NOT_FOUND", "Profesional no encontrado");

      // Verify template belongs to tenant if provided
      if (body.templateId) {
        const template = await prisma.consentTemplate.findFirst({
          where: { id: body.templateId, tenantId: user.tenantId },
        });
        if (!template) throw new AppError(404, "TEMPLATE_NOT_FOUND", "Plantilla no encontrada");
      }

      const consent = await prisma.patientConsent.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          templateId: body.templateId ?? null,
          dentistId: body.dentistId,
          title: body.title,
          content: body.content,
          status: "DRAFT",
        },
        include: {
          template: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
        },
      });

      return reply.status(201).send({ consent });
    },
  });

  // PATCH /api/v1/patients/:patientId/consents/:consentId/sign
  app.patch("/api/v1/patients/:patientId/consents/:consentId/sign", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId, consentId } = request.params as { patientId: string; consentId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const consent = await prisma.patientConsent.findFirst({
        where: { id: consentId, patientId, tenantId: user.tenantId },
      });
      if (!consent) throw new AppError(404, "CONSENT_NOT_FOUND", "Consentimiento no encontrado");

      if (consent.status === "REVOKED") {
        throw new AppError(400, "CONSENT_REVOKED", "No se puede firmar un consentimiento revocado");
      }

      const body = request.body as {
        patientSignature?: string;
        dentistSignature?: string;
      };

      const updated = await prisma.patientConsent.update({
        where: { id: consentId },
        data: {
          status: "SIGNED",
          signedAt: new Date(),
          ...(body.patientSignature !== undefined && { patientSignature: body.patientSignature }),
          ...(body.dentistSignature !== undefined && { dentistSignature: body.dentistSignature }),
        },
        include: {
          template: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
        },
      });

      return { consent: updated };
    },
  });

  // PATCH /api/v1/patients/:patientId/consents/:consentId/revoke
  app.patch("/api/v1/patients/:patientId/consents/:consentId/revoke", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId, consentId } = request.params as { patientId: string; consentId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const consent = await prisma.patientConsent.findFirst({
        where: { id: consentId, patientId, tenantId: user.tenantId },
      });
      if (!consent) throw new AppError(404, "CONSENT_NOT_FOUND", "Consentimiento no encontrado");

      if (consent.status === "REVOKED") {
        throw new AppError(400, "ALREADY_REVOKED", "El consentimiento ya está revocado");
      }

      const body = request.body as {
        reason?: string;
      };

      const updated = await prisma.patientConsent.update({
        where: { id: consentId },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: body.reason ?? null,
        },
        include: {
          template: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
        },
      });

      return { consent: updated };
    },
  });

  // GET /api/v1/consent-templates
  app.get("/api/v1/consent-templates", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };

      const templates = await prisma.consentTemplate.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });

      return { templates };
    },
  });

  // POST /api/v1/consent-templates
  app.post("/api/v1/consent-templates", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };

      const body = request.body as {
        name: string;
        category: string;
        content: string;
      };

      if (!body.name) {
        throw new AppError(400, "VALIDATION_ERROR", "name es requerido");
      }
      if (!body.category) {
        throw new AppError(400, "VALIDATION_ERROR", "category es requerido");
      }
      if (!body.content) {
        throw new AppError(400, "VALIDATION_ERROR", "content es requerido");
      }

      const template = await prisma.consentTemplate.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          category: body.category,
          content: body.content,
        },
      });

      return reply.status(201).send({ template });
    },
  });

  // PUT /api/v1/consent-templates/:id
  app.put("/api/v1/consent-templates/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const template = await prisma.consentTemplate.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!template) throw new AppError(404, "TEMPLATE_NOT_FOUND", "Plantilla no encontrada");

      const body = request.body as {
        name?: string;
        category?: string;
        content?: string;
        isActive?: boolean;
      };

      const updated = await prisma.consentTemplate.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.content !== undefined && { content: body.content }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });

      return { template: updated };
    },
  });

  // DELETE /api/v1/consent-templates/:id
  app.delete("/api/v1/consent-templates/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const template = await prisma.consentTemplate.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!template) throw new AppError(404, "TEMPLATE_NOT_FOUND", "Plantilla no encontrada");

      if (template.isDefault) {
        throw new AppError(400, "CANNOT_DELETE_DEFAULT", "No se puede eliminar una plantilla predeterminada");
      }

      await prisma.consentTemplate.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
}
