import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function periodontogramVersionRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // List all periodontogram versions for a patient
  app.get("/api/v1/patients/:patientId/periodontogram/versions", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const versions = await prisma.periodontogramVersion.findMany({
        where: { patientId, tenantId: user.tenantId },
        orderBy: { versionNumber: "desc" },
      });

      return { versions };
    },
  });

  // Create a new periodontogram version (snapshot current entries)
  app.post("/api/v1/patients/:patientId/periodontogram/versions", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as { label?: string };

      // Snapshot latest periodontogram entries for this patient
      const currentEntries = await prisma.periodontogramEntry.findMany({
        where: { patientId, tenantId: user.tenantId },
        orderBy: { recordedAt: "desc" },
      });

      // Calculate metrics from the entries
      const metrics = calculatePeriodontogramMetrics(currentEntries);

      // Auto-increment version number
      const existingCount = await prisma.periodontogramVersion.count({
        where: { patientId, tenantId: user.tenantId },
      });
      const versionNumber = existingCount + 1;

      const version = await prisma.periodontogramVersion.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          versionNumber,
          label: body.label || null,
          entries: JSON.parse(JSON.stringify(currentEntries)),
          metrics,
          createdById: user.sub,
        },
      });

      return reply.status(201).send(version);
    },
  });
}

/**
 * Calculate periodontogram metrics from entries.
 * Each entry has a `findings` JSON field with per-tooth data including:
 * - probing depths (pd), bleeding on probing (bop), clinical attachment level / NIC,
 *   plaque presence
 */
function calculatePeriodontogramMetrics(
  entries: Array<{ findings: any; plaque?: boolean; suppuration?: boolean }>
): { bop: number; avgPD: number; avgNIC: number; plaqueIndex: number } {
  let totalSites = 0;
  let bleedingSites = 0;
  let totalPD = 0;
  let totalNIC = 0;
  let pdCount = 0;
  let nicCount = 0;
  let plaqueSites = 0;

  for (const entry of entries) {
    const findings = typeof entry.findings === "string"
      ? JSON.parse(entry.findings)
      : entry.findings;

    if (!findings || typeof findings !== "object") continue;

    // findings can be keyed by tooth number, each with arrays of site measurements
    for (const toothKey of Object.keys(findings)) {
      const toothData = findings[toothKey];
      if (!toothData) continue;

      // Handle array of site measurements per tooth
      const sites = Array.isArray(toothData) ? toothData : [toothData];
      for (const site of sites) {
        totalSites++;

        if (site.bop === true || site.bleeding === true) {
          bleedingSites++;
        }

        if (typeof site.pd === "number") {
          totalPD += site.pd;
          pdCount++;
        }

        if (typeof site.nic === "number" || typeof site.cal === "number") {
          totalNIC += site.nic ?? site.cal ?? 0;
          nicCount++;
        }

        if (site.plaque === true) {
          plaqueSites++;
        }
      }
    }

    // Also check entry-level plaque flag
    if (entry.plaque === true && totalSites > 0) {
      // Already counted per-site if available
    }
  }

  return {
    bop: totalSites > 0 ? Math.round((bleedingSites / totalSites) * 100 * 10) / 10 : 0,
    avgPD: pdCount > 0 ? Math.round((totalPD / pdCount) * 10) / 10 : 0,
    avgNIC: nicCount > 0 ? Math.round((totalNIC / nicCount) * 10) / 10 : 0,
    plaqueIndex: totalSites > 0 ? Math.round((plaqueSites / totalSites) * 100 * 10) / 10 : 0,
  };
}
