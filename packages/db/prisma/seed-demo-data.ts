/**
 * Adds demo patients and appointments to the existing seed data.
 * Safe to run multiple times (checks for existing data first).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "clinica-demo" } });
  if (!tenant) {
    console.error("Tenant 'clinica-demo' not found. Run seed.ts first.");
    process.exit(1);
  }

  const dentist = await prisma.dentist.findFirst({ where: { tenantId: tenant.id } });
  const chair = await prisma.chair.findFirst({ where: { tenantId: tenant.id } });
  const cleaningTreatment = await prisma.treatmentType.findFirst({
    where: { tenantId: tenant.id, name: "Limpieza dental" },
  });
  const consultaTreatment = await prisma.treatmentType.findFirst({
    where: { tenantId: tenant.id, name: "Consulta general" },
  });
  const orthodonticsTreatment = await prisma.treatmentType.findFirst({
    where: { tenantId: tenant.id, name: "Ortodoncia - control" },
  });

  if (!dentist || !chair) {
    console.error("Dentist or chair not found. Run seed.ts first.");
    process.exit(1);
  }

  // Get default pipeline stage
  const defaultStage = await prisma.pipelineStage.findFirst({
    where: { tenantId: tenant.id, isDefault: true },
  });
  const activeStage = await prisma.pipelineStage.findFirst({
    where: { tenantId: tenant.id, name: "Paciente Activo" },
  });

  // Demo patients
  const patientsData = [
    {
      firstName: "María",
      lastName: "García",
      phone: "+5491155551001",
      email: "maria.garcia@email.com",
      birthdate: new Date("1985-03-15"),
      gender: "FEMALE" as const,
      tags: ["vip", "ortodoncia"],
    },
    {
      firstName: "Carlos",
      lastName: "López",
      phone: "+5491155551002",
      email: "carlos.lopez@email.com",
      birthdate: new Date("1990-07-22"),
      gender: "MALE" as const,
      tags: ["activo"],
    },
    {
      firstName: "Ana",
      lastName: "Martínez",
      phone: "+5491155551003",
      email: "ana.martinez@email.com",
      birthdate: new Date("1978-11-08"),
      gender: "FEMALE" as const,
      tags: ["activo", "limpieza"],
    },
    {
      firstName: "Javier",
      lastName: "Rodríguez",
      phone: "+5491155551004",
      email: "javier.rodriguez@email.com",
      birthdate: new Date("2000-01-30"),
      gender: "MALE" as const,
      tags: ["nuevo"],
    },
    {
      firstName: "Laura",
      lastName: "Fernández",
      phone: "+5491155551005",
      email: "laura.fernandez@email.com",
      birthdate: new Date("1995-06-14"),
      gender: "FEMALE" as const,
      tags: ["activo"],
    },
  ];

  const patients = [];
  for (const data of patientsData) {
    const existing = await prisma.patient.findUnique({
      where: { tenantId_phone: { tenantId: tenant.id, phone: data.phone } },
    });
    if (existing) {
      patients.push(existing);
      continue;
    }
    const patient = await prisma.patient.create({
      data: { ...data, tenantId: tenant.id },
    });
    patients.push(patient);

    // Add to pipeline
    const stage = data.tags.includes("nuevo") ? defaultStage : activeStage;
    if (stage) {
      await prisma.patientPipeline.upsert({
        where: { patientId: patient.id },
        update: {},
        create: { patientId: patient.id, stageId: stage.id },
      });
    }
  }

  console.log(`${patients.length} patients ready`);

  // Demo appointments
  const now = new Date();

  // Today's appointments
  const todayAt10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const todayAt1045 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 45, 0);
  const todayAt11 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
  const todayAt1130 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0);
  const todayAt14 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
  const todayAt15 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);

  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowAt9 = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0, 0);
  const tomorrowAt930 = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 30, 0);
  const tomorrowAt10 = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0, 0);
  const tomorrowAt1045 = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 45, 0);

  const appointmentsData = [
    // Today
    {
      patientId: patients[0].id,
      dentistId: dentist.id,
      chairId: chair.id,
      treatmentTypeId: cleaningTreatment?.id,
      startTime: todayAt10,
      endTime: todayAt1045,
      status: "CONFIRMED" as const,
      source: "MANUAL" as const,
    },
    {
      patientId: patients[1].id,
      dentistId: dentist.id,
      chairId: chair.id,
      treatmentTypeId: consultaTreatment?.id,
      startTime: todayAt11,
      endTime: todayAt1130,
      status: "CONFIRMED" as const,
      source: "CHATBOT" as const,
    },
    {
      patientId: patients[2].id,
      dentistId: dentist.id,
      chairId: chair.id,
      treatmentTypeId: orthodonticsTreatment?.id,
      startTime: todayAt14,
      endTime: todayAt15,
      status: "PENDING" as const,
      source: "ONLINE" as const,
    },
    // Tomorrow
    {
      patientId: patients[3].id,
      dentistId: dentist.id,
      chairId: chair.id,
      treatmentTypeId: cleaningTreatment?.id,
      startTime: tomorrowAt9,
      endTime: tomorrowAt930,
      status: "CONFIRMED" as const,
      source: "MANUAL" as const,
    },
    {
      patientId: patients[4].id,
      dentistId: dentist.id,
      chairId: chair.id,
      treatmentTypeId: consultaTreatment?.id,
      startTime: tomorrowAt10,
      endTime: tomorrowAt1045,
      status: "CONFIRMED" as const,
      source: "CHATBOT" as const,
    },
  ];

  let created = 0;
  for (const appt of appointmentsData) {
    const existing = await prisma.appointment.findFirst({
      where: {
        tenantId: tenant.id,
        patientId: appt.patientId,
        startTime: appt.startTime,
      },
    });
    if (!existing) {
      await prisma.appointment.create({ data: { tenantId: tenant.id, ...appt } });
      created++;
    }
  }

  // Update lastVisitAt for patients
  await prisma.patient.update({
    where: { id: patients[0].id },
    data: { lastVisitAt: new Date(now.getFullYear(), now.getMonth() - 6, 15) },
  });
  await prisma.patient.update({
    where: { id: patients[2].id },
    data: { lastVisitAt: new Date(now.getFullYear(), now.getMonth() - 3, 5) },
  });

  console.log(`${created} demo appointments created`);
  console.log("Demo data ready!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
