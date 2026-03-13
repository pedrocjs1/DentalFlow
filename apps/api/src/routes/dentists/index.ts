import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

const DENTIST_SELECT = {
  id: true,
  name: true,
  specialty: true,
  licenseNumber: true,
  phone: true,
  email: true,
  photoUrl: true,
  birthdate: true,
  color: true,
  isActive: true,
  createdAt: true,
  treatments: { select: { treatmentTypeId: true } },
};

export async function dentistRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET all dentists
  app.get("/api/v1/dentists", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { includeInactive?: string };
      const includeInactive = query.includeInactive === "true";

      const dentists = await prisma.dentist.findMany({
        where: {
          tenantId: user.tenantId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        select: DENTIST_SELECT,
        orderBy: { name: "asc" },
      });

      return {
        dentists: dentists.map((d) => ({
          ...d,
          treatmentIds: d.treatments.map((t) => t.treatmentTypeId),
          treatments: undefined,
        })),
      };
    },
  });

  // GET single dentist
  app.get("/api/v1/dentists/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const dentist = await prisma.dentist.findFirst({
        where: { id, tenantId: user.tenantId },
        select: DENTIST_SELECT,
      });
      if (!dentist) throw new AppError(404, "DENTIST_NOT_FOUND", "Dentista no encontrado");

      return {
        ...dentist,
        treatmentIds: dentist.treatments.map((t) => t.treatmentTypeId),
        treatments: undefined,
      };
    },
  });

  // POST create dentist
  app.post("/api/v1/dentists", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        name: string;
        specialty?: string;
        licenseNumber?: string;
        phone?: string;
        email?: string;
        photoUrl?: string;
        birthdate?: string;
        color?: string;
        treatmentIds?: string[];
      };

      const dentist = await prisma.dentist.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          specialty: body.specialty,
          licenseNumber: body.licenseNumber,
          phone: body.phone,
          email: body.email,
          photoUrl: body.photoUrl,
          birthdate: body.birthdate ? new Date(body.birthdate) : undefined,
          color: body.color ?? "#3B82F6",
          ...(body.treatmentIds?.length && {
            treatments: {
              create: body.treatmentIds.map((tid) => ({
                tenantId: user.tenantId,
                treatmentTypeId: tid,
              })),
            },
          }),
        },
        select: DENTIST_SELECT,
      });

      return reply.status(201).send({
        ...dentist,
        treatmentIds: dentist.treatments.map((t) => t.treatmentTypeId),
        treatments: undefined,
      });
    },
  });

  // PATCH update dentist
  app.patch("/api/v1/dentists/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        specialty?: string;
        licenseNumber?: string;
        phone?: string;
        email?: string;
        photoUrl?: string;
        birthdate?: string | null;
        color?: string;
        isActive?: boolean;
        treatmentIds?: string[];
      };

      const existing = await prisma.dentist.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "DENTIST_NOT_FOUND", "Dentista no encontrado");

      // Handle treatment assignments: replace all if provided
      if (body.treatmentIds !== undefined) {
        await prisma.dentistTreatment.deleteMany({ where: { dentistId: id } });
        if (body.treatmentIds.length > 0) {
          await prisma.dentistTreatment.createMany({
            data: body.treatmentIds.map((tid) => ({
              tenantId: user.tenantId,
              dentistId: id,
              treatmentTypeId: tid,
            })),
          });
        }
      }

      const dentist = await prisma.dentist.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.specialty !== undefined && { specialty: body.specialty }),
          ...(body.licenseNumber !== undefined && { licenseNumber: body.licenseNumber }),
          ...(body.phone !== undefined && { phone: body.phone }),
          ...(body.email !== undefined && { email: body.email }),
          ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
          ...(body.birthdate !== undefined && { birthdate: body.birthdate ? new Date(body.birthdate) : null }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        select: DENTIST_SELECT,
      });

      return {
        ...dentist,
        treatmentIds: dentist.treatments.map((t) => t.treatmentTypeId),
        treatments: undefined,
      };
    },
  });

  // DELETE (soft delete) dentist
  app.delete("/api/v1/dentists/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const existing = await prisma.dentist.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "DENTIST_NOT_FOUND", "Dentista no encontrado");

      await prisma.dentist.update({ where: { id }, data: { isActive: false } });
      return reply.status(204).send();
    },
  });
}
