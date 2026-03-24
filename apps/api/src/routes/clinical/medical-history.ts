import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function medicalHistoryRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  app.get("/api/v1/patients/:patientId/medical-history", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const history = await prisma.medicalHistory.findUnique({
        where: { patientId },
      });

      return history ?? { patientId, bloodType: null, rhFactor: null, allergies: [], medications: [], hasDiabetes: false, hasHypertension: false, hasHeartDisease: false, hasAsthma: false, hasHIV: false, hasEpilepsy: false, otherDiseases: null, hasBruxism: false, isSmoker: false, smokingDetails: null, surgicalHistory: null, hospitalizations: null, isPregnant: false, lastDoctorVisit: null, consentSigned: false, consentSignedAt: null, consentNotes: null, primaryDoctor: null, primaryDoctorPhone: null, latexAllergy: false, anestheticAllergy: false, allergyDetails: null, medicationDetails: null, conditionDetails: null, familyHistory: null, smokingAmount: null, alcoholFrequency: null, pregnancyWeeks: null, breastfeeding: false, surgeryHistory: null };
    },
  });

  app.put("/api/v1/patients/:patientId/medical-history", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as {
        bloodType?: string;
        rhFactor?: string;
        allergies?: string[];
        medications?: string[];
        hasDiabetes?: boolean;
        hasHypertension?: boolean;
        hasHeartDisease?: boolean;
        hasAsthma?: boolean;
        hasHIV?: boolean;
        hasEpilepsy?: boolean;
        otherDiseases?: string;
        hasBruxism?: boolean;
        isSmoker?: boolean;
        smokingDetails?: string;
        surgicalHistory?: string;
        hospitalizations?: string;
        isPregnant?: boolean;
        lastDoctorVisit?: string;
        consentSigned?: boolean;
        consentSignedAt?: string;
        consentNotes?: string;
        // New fields
        primaryDoctor?: string;
        primaryDoctorPhone?: string;
        latexAllergy?: boolean;
        anestheticAllergy?: boolean;
        allergyDetails?: unknown;
        medicationDetails?: unknown;
        conditionDetails?: unknown;
        familyHistory?: unknown;
        smokingAmount?: string;
        alcoholFrequency?: string;
        pregnancyWeeks?: number;
        breastfeeding?: boolean;
        surgeryHistory?: unknown;
      };

      // Read existing for audit trail
      const existing = await prisma.medicalHistory.findUnique({ where: { patientId } });

      const data = {
        tenantId: user.tenantId,
        bloodType: body.bloodType ?? null,
        rhFactor: body.rhFactor ?? null,
        allergies: body.allergies ?? [],
        medications: body.medications ?? [],
        hasDiabetes: body.hasDiabetes ?? false,
        hasHypertension: body.hasHypertension ?? false,
        hasHeartDisease: body.hasHeartDisease ?? false,
        hasAsthma: body.hasAsthma ?? false,
        hasHIV: body.hasHIV ?? false,
        hasEpilepsy: body.hasEpilepsy ?? false,
        otherDiseases: body.otherDiseases ?? null,
        hasBruxism: body.hasBruxism ?? false,
        isSmoker: body.isSmoker ?? false,
        smokingDetails: body.smokingDetails ?? null,
        surgicalHistory: body.surgicalHistory ?? null,
        hospitalizations: body.hospitalizations ?? null,
        isPregnant: body.isPregnant ?? false,
        lastDoctorVisit: body.lastDoctorVisit ? new Date(body.lastDoctorVisit) : null,
        consentSigned: body.consentSigned ?? false,
        consentSignedAt: body.consentSignedAt ? new Date(body.consentSignedAt) : null,
        consentNotes: body.consentNotes ?? null,
        // New fields
        primaryDoctor: body.primaryDoctor ?? null,
        primaryDoctorPhone: body.primaryDoctorPhone ?? null,
        latexAllergy: body.latexAllergy ?? false,
        anestheticAllergy: body.anestheticAllergy ?? false,
        allergyDetails: body.allergyDetails ?? undefined,
        medicationDetails: body.medicationDetails ?? undefined,
        conditionDetails: body.conditionDetails ?? undefined,
        familyHistory: body.familyHistory ?? undefined,
        smokingAmount: body.smokingAmount ?? null,
        alcoholFrequency: body.alcoholFrequency ?? null,
        pregnancyWeeks: body.pregnancyWeeks ?? null,
        breastfeeding: body.breastfeeding ?? false,
        surgeryHistory: body.surgeryHistory ?? undefined,
      };

      const history = await prisma.medicalHistory.upsert({
        where: { patientId },
        create: { patientId, ...data },
        update: data,
      });

      // Create audit trail entries for changed fields
      if (existing) {
        const auditFields = ["allergies", "medications", "allergyDetails", "medicationDetails", "conditionDetails", "familyHistory", "surgeryHistory", "latexAllergy", "anestheticAllergy"] as const;
        for (const field of auditFields) {
          const oldVal = JSON.stringify((existing as Record<string, unknown>)[field] ?? null);
          const newVal = JSON.stringify((history as Record<string, unknown>)[field] ?? null);
          if (oldVal !== newVal) {
            await prisma.medicalHistoryAudit.create({
              data: {
                patientId,
                tenantId: user.tenantId,
                changedById: user.sub,
                fieldChanged: field,
                oldValue: oldVal,
                newValue: newVal,
              },
            });
          }
        }
      }

      return history;
    },
  });
}
