import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

const PRESCRIPTION_TEMPLATES = [
  {
    id: "post-extraction",
    name: "Post-extracción",
    medications: [
      { name: "Ibuprofeno 400mg", dose: "1 comprimido", frequency: "Cada 8 horas", duration: "5 días", route: "Oral", instructions: "Tomar con alimentos" },
      { name: "Amoxicilina 500mg", dose: "1 cápsula", frequency: "Cada 8 horas", duration: "7 días", route: "Oral", instructions: "Completar el tratamiento" },
    ],
  },
  {
    id: "post-endodontics",
    name: "Post-endodoncia",
    medications: [
      { name: "Ibuprofeno 600mg", dose: "1 comprimido", frequency: "Cada 8 horas", duration: "3 días", route: "Oral", instructions: "Tomar con alimentos. Si el dolor persiste, consultar" },
      { name: "Amoxicilina 500mg", dose: "1 cápsula", frequency: "Cada 8 horas", duration: "7 días", route: "Oral", instructions: "" },
    ],
  },
  {
    id: "antibiotic-prophylaxis",
    name: "Profilaxis antibiótica",
    medications: [
      { name: "Amoxicilina 2g", dose: "4 cápsulas de 500mg", frequency: "Dosis única", duration: "1 hora antes del procedimiento", route: "Oral", instructions: "Tomar 1 hora antes de la cita" },
    ],
  },
  {
    id: "acute-pain",
    name: "Dolor agudo",
    medications: [
      { name: "Ketorolac 10mg", dose: "1 comprimido", frequency: "Cada 8 horas", duration: "3 días", route: "Oral", instructions: "No exceder 5 días de uso. Tomar con alimentos" },
    ],
  },
];

export async function prescriptionRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET /api/v1/patients/:patientId/prescriptions
  app.get("/api/v1/patients/:patientId/prescriptions", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const prescriptions = await prisma.prescription.findMany({
        where: { patientId, tenantId: user.tenantId },
        include: {
          dentist: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return { prescriptions };
    },
  });

  // POST /api/v1/patients/:patientId/prescriptions
  app.post("/api/v1/patients/:patientId/prescriptions", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as {
        dentistId: string;
        evolutionId?: string;
        diagnosis?: string;
        medications: Array<{ name: string; dose: string; frequency: string; duration: string; route: string; instructions: string }>;
        notes?: string;
        templateUsed?: string;
        signatureData?: string;
      };

      if (!body.dentistId) {
        throw new AppError(400, "VALIDATION_ERROR", "dentistId es requerido");
      }
      if (!body.medications || body.medications.length === 0) {
        throw new AppError(400, "VALIDATION_ERROR", "medications es requerido y no puede estar vacío");
      }

      // Verify dentist belongs to tenant
      const dentist = await prisma.dentist.findFirst({
        where: { id: body.dentistId, tenantId: user.tenantId, isActive: true },
      });
      if (!dentist) throw new AppError(404, "DENTIST_NOT_FOUND", "Profesional no encontrado");

      // Auto-generate prescriptionNumber: count existing for tenant + 1
      const existingCount = await prisma.prescription.count({
        where: { tenantId: user.tenantId },
      });
      const prescriptionNumber = existingCount + 1;

      const prescription = await prisma.prescription.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          dentistId: body.dentistId,
          evolutionId: body.evolutionId ?? null,
          prescriptionNumber,
          diagnosis: body.diagnosis ?? null,
          medications: body.medications,
          notes: body.notes ?? null,
          templateUsed: body.templateUsed ?? null,
          signatureData: body.signatureData ?? null,
        },
        include: {
          dentist: { select: { id: true, name: true } },
        },
      });

      return reply.status(201).send({ prescription });
    },
  });

  // GET /api/v1/prescription-templates (tenant-level, hardcoded)
  app.get("/api/v1/prescription-templates", {
    preHandler,
    handler: async () => {
      return { templates: PRESCRIPTION_TEMPLATES };
    },
  });
}
