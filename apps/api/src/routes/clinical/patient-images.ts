import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

const VALID_CATEGORIES = ["RADIOGRAPHY", "INTRAORAL", "EXTRAORAL", "DOCUMENT", "OTHER"];

export async function patientImageRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // List images (metadata only, no imageData)
  app.get("/api/v1/patients/:patientId/images", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };
      const { category } = request.query as { category?: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const where: any = { patientId, tenantId: user.tenantId };
      if (category && VALID_CATEGORIES.includes(category)) {
        where.category = category;
      }

      const images = await prisma.patientImage.findMany({
        where,
        select: {
          id: true,
          category: true,
          description: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          toothNumbers: true,
          evolutionId: true,
          uploadedById: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return { images };
    },
  });

  // Get single image with full imageData (base64)
  app.get("/api/v1/patients/:patientId/images/:imageId", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId, imageId } = request.params as { patientId: string; imageId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const image = await prisma.patientImage.findFirst({
        where: { id: imageId, patientId, tenantId: user.tenantId },
      });
      if (!image) throw new AppError(404, "IMAGE_NOT_FOUND", "Imagen no encontrada");

      return image;
    },
  });

  // Upload a new image
  app.post("/api/v1/patients/:patientId/images", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as {
        category: string;
        description?: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        imageData: string;
        toothNumbers?: string;
        evolutionId?: string;
      };

      if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          `category debe ser uno de: ${VALID_CATEGORIES.join(", ")}`
        );
      }
      if (!body.fileName || !body.mimeType || !body.imageData) {
        throw new AppError(400, "VALIDATION_ERROR", "fileName, mimeType e imageData son requeridos");
      }

      const image = await prisma.patientImage.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          category: body.category,
          description: body.description || null,
          fileName: body.fileName,
          fileSize: body.fileSize || 0,
          mimeType: body.mimeType,
          imageData: body.imageData,
          toothNumbers: body.toothNumbers || null,
          evolutionId: body.evolutionId || null,
          uploadedById: user.sub,
        },
      });

      // Return without imageData to keep response small
      const { imageData: _, ...metadata } = image;
      return reply.status(201).send(metadata);
    },
  });

  // Delete an image
  app.delete("/api/v1/patients/:patientId/images/:imageId", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { patientId, imageId } = request.params as { patientId: string; imageId: string };

      const image = await prisma.patientImage.findFirst({
        where: { id: imageId, patientId, tenantId: user.tenantId },
      });
      if (!image) throw new AppError(404, "IMAGE_NOT_FOUND", "Imagen no encontrada");

      await prisma.patientImage.delete({ where: { id: imageId } });
      return reply.status(204).send();
    },
  });
}
