import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { autoAssignToFirstStage } from "../pipeline/index.js";

export async function patientRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // List patients
  app.get("/api/v1/patients", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { search?: string; page?: string; limit?: string };

      const page = parseInt(query.page ?? "1");
      const limit = Math.min(parseInt(query.limit ?? "20"), 100);
      const skip = (page - 1) * limit;

      const where = {
        tenantId: user.tenantId,
        isActive: true,
        ...(query.search && {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" as const } },
            { lastName: { contains: query.search, mode: "insensitive" as const } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            birthdate: true,
            tags: true,
            lastVisitAt: true,
            nextVisitDue: true,
            createdAt: true,
          },
        }),
        prisma.patient.count({ where }),
      ]);

      return { patients, total, page, limit };
    },
  });

  // Get patient by ID
  app.get("/api/v1/patients/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const patient = await prisma.patient.findFirst({
        where: { id, tenantId: user.tenantId },
        include: {
          appointments: {
            orderBy: { startTime: "desc" },
            take: 10,
            include: { dentist: true, treatmentType: true },
          },
          clinicalNotes: { orderBy: { createdAt: "desc" }, take: 20 },
          pipelineEntry: { include: { stage: true } },
        },
      });

      if (!patient) {
        throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");
      }

      return patient;
    },
  });

  // Create patient
  app.post("/api/v1/patients", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        birthdate?: string;
        gender?: "MALE" | "FEMALE" | "OTHER";
        address?: string;
        notes?: string;
        tags?: string[];
      };

      // Check for duplicate phone
      const existing = await prisma.patient.findUnique({
        where: { tenantId_phone: { tenantId: user.tenantId, phone: body.phone } },
      });

      if (existing) {
        throw new AppError(409, "PATIENT_PHONE_EXISTS", "Ya existe un paciente con ese teléfono");
      }

      const patient = await prisma.patient.create({
        data: {
          tenantId: user.tenantId,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          email: body.email,
          birthdate: body.birthdate ? new Date(body.birthdate) : undefined,
          gender: body.gender,
          address: body.address,
          notes: body.notes,
          tags: body.tags ?? [],
        },
      });

      // Auto-assign new patient to first pipeline stage
      await autoAssignToFirstStage(user.tenantId, patient.id);

      return reply.status(201).send(patient);
    },
  });
}
