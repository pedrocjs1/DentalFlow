import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function visitNotesRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  app.get("/api/v1/patients/:patientId/visit-notes", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };
      const query = request.query as { page?: string; limit?: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const page = parseInt(query.page ?? "1");
      const limit = Math.min(parseInt(query.limit ?? "20"), 50);
      const skip = (page - 1) * limit;

      const [notes, total] = await Promise.all([
        prisma.clinicalVisitNote.findMany({
          where: { patientId, tenantId: user.tenantId },
          orderBy: { visitDate: "desc" },
          skip,
          take: limit,
        }),
        prisma.clinicalVisitNote.count({ where: { patientId, tenantId: user.tenantId } }),
      ]);

      return { notes, total, page, limit };
    },
  });

  app.post("/api/v1/patients/:patientId/visit-notes", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as {
        visitDate?: string;
        toothNumbers?: number[];
        procedureName?: string;
        materials?: string;
        content: string;
        nextStep?: string;
        attachments?: Array<{ type: string; name: string; dataUrl: string }>;
      };

      if (!body.content) {
        throw new AppError(400, "VALIDATION_ERROR", "content es requerido");
      }

      // Validate attachments size (max 10MB total base64)
      const attachments = body.attachments ?? [];
      const totalSize = attachments.reduce((acc, a) => acc + (a.dataUrl?.length ?? 0), 0);
      if (totalSize > 10 * 1024 * 1024) {
        throw new AppError(400, "PAYLOAD_TOO_LARGE", "Las adjuntos no pueden superar 10MB");
      }

      const note = await prisma.clinicalVisitNote.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          authorId: user.sub,
          visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
          toothNumbers: body.toothNumbers ?? [],
          procedureName: body.procedureName ?? null,
          materials: body.materials ?? null,
          content: body.content,
          nextStep: body.nextStep ?? null,
          attachments: attachments.map((a) => ({
            type: a.type,
            name: a.name,
            dataUrl: a.dataUrl,
            uploadedAt: new Date().toISOString(),
          })),
        },
      });

      // Update patient lastVisitAt
      await prisma.patient.update({
        where: { id: patientId },
        data: { lastVisitAt: note.visitDate },
      });

      return reply.status(201).send({ note });
    },
  });

  app.patch("/api/v1/patients/:patientId/visit-notes/:noteId", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId, noteId } = request.params as { patientId: string; noteId: string };

      const body = request.body as {
        content?: string;
        nextStep?: string;
        procedureName?: string;
        materials?: string;
      };

      const note = await prisma.clinicalVisitNote.findFirst({
        where: { id: noteId, patientId, tenantId: user.tenantId },
      });
      if (!note) throw new AppError(404, "NOT_FOUND", "Nota no encontrada");

      const updated = await prisma.clinicalVisitNote.update({
        where: { id: noteId },
        data: {
          ...(body.content !== undefined && { content: body.content }),
          ...(body.nextStep !== undefined && { nextStep: body.nextStep }),
          ...(body.procedureName !== undefined && { procedureName: body.procedureName }),
          ...(body.materials !== undefined && { materials: body.materials }),
        },
      });

      return { note: updated };
    },
  });

  app.delete("/api/v1/patients/:patientId/visit-notes/:noteId", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { patientId, noteId } = request.params as { patientId: string; noteId: string };

      const note = await prisma.clinicalVisitNote.findFirst({
        where: { id: noteId, patientId, tenantId: user.tenantId },
      });
      if (!note) throw new AppError(404, "NOT_FOUND", "Nota no encontrada");

      await prisma.clinicalVisitNote.delete({ where: { id: noteId } });
      return reply.status(204).send();
    },
  });
}
