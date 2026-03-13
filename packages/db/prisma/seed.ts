import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "clinica-demo" },
    update: {},
    create: {
      name: "Clínica Dental Demo",
      slug: "clinica-demo",
      plan: "PRO",
      phone: "+5491100000000",
      email: "demo@dentalflow.app",
      address: "Av. Corrientes 1234, Piso 3",
      city: "Buenos Aires",
      country: "AR",
      timezone: "America/Argentina/Buenos_Aires",
      currency: "ARS",
      welcomeMessage: "¡Bienvenido/a a Clínica Dental Demo! Estamos para cuidar tu sonrisa.",
      subscriptionStatus: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
  });

  console.log(`Tenant created: ${tenant.name}`);

  // Create admin user
  const passwordHash = await bcrypt.hash("password123", 10);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@clinica-demo.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@clinica-demo.com",
      name: "Admin Demo",
      passwordHash,
      role: "OWNER",
    },
  });

  console.log(`Admin user created: ${adminUser.email}`);

  // Create dentists
  const dentist = await prisma.dentist.upsert({
    where: { id: "dentist-demo-1" },
    update: {},
    create: {
      id: "dentist-demo-1",
      tenantId: tenant.id,
      name: "Dra. María González",
      specialty: "Odontología General",
      color: "#0D9488",
      licenseNumber: "MP 12345",
      phone: "+5491122334455",
      email: "maria.gonzalez@clinica-demo.com",
    },
  });

  const dentist2 = await prisma.dentist.upsert({
    where: { id: "dentist-demo-2" },
    update: {},
    create: {
      id: "dentist-demo-2",
      tenantId: tenant.id,
      name: "Dr. Carlos Fernández",
      specialty: "Ortodoncia",
      color: "#7C3AED",
      licenseNumber: "MP 67890",
      phone: "+5491155667788",
      email: "carlos.fernandez@clinica-demo.com",
      birthdate: new Date(), // birthday today for demo purposes
    },
  });

  // Create chairs (upsert by fixed IDs to avoid duplicates)
  await Promise.all([
    prisma.chair.upsert({
      where: { id: "chair-demo-1" },
      update: {},
      create: { id: "chair-demo-1", tenantId: tenant.id, name: "Sillón 1" },
    }),
    prisma.chair.upsert({
      where: { id: "chair-demo-2" },
      update: {},
      create: { id: "chair-demo-2", tenantId: tenant.id, name: "Sillón 2" },
    }),
  ]);

  // Create treatment types
  const treatmentTypes = await Promise.all([
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-1" },
      update: {},
      create: { id: "tt-demo-1", tenantId: tenant.id, name: "Limpieza dental", durationMin: 45, price: 5000 },
    }),
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-2" },
      update: {},
      create: { id: "tt-demo-2", tenantId: tenant.id, name: "Consulta general", durationMin: 30, price: 3000 },
    }),
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-3" },
      update: {},
      create: { id: "tt-demo-3", tenantId: tenant.id, name: "Extracción", durationMin: 60, price: 8000 },
    }),
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-4" },
      update: {},
      create: { id: "tt-demo-4", tenantId: tenant.id, name: "Ortodoncia - control", durationMin: 30, price: 4000 },
    }),
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-5" },
      update: {},
      create: { id: "tt-demo-5", tenantId: tenant.id, name: "Blanqueamiento", durationMin: 90, price: 15000 },
    }),
  ]);

  // Assign treatments to dentists (DentistTreatment junction)
  await prisma.dentistTreatment.createMany({
    skipDuplicates: true,
    data: [
      // Dra. González does general dentistry treatments
      { tenantId: tenant.id, dentistId: dentist.id, treatmentTypeId: treatmentTypes[0].id },
      { tenantId: tenant.id, dentistId: dentist.id, treatmentTypeId: treatmentTypes[1].id },
      { tenantId: tenant.id, dentistId: dentist.id, treatmentTypeId: treatmentTypes[2].id },
      { tenantId: tenant.id, dentistId: dentist.id, treatmentTypeId: treatmentTypes[4].id },
      // Dr. Fernández does orthodontics + general consults
      { tenantId: tenant.id, dentistId: dentist2.id, treatmentTypeId: treatmentTypes[1].id },
      { tenantId: tenant.id, dentistId: dentist2.id, treatmentTypeId: treatmentTypes[3].id },
    ],
  });

  // Create working hours (Mon-Fri 9-18, break 13-14)
  const workingHoursData = [1, 2, 3, 4, 5].map((day) => ({
    tenantId: tenant.id,
    dayOfWeek: day,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "13:00",
    breakEnd: "14:00",
  }));

  await prisma.workingHours.createMany({ data: workingHoursData, skipDuplicates: true });

  // Remove old pipeline entries and stages that conflict (safe to do in dev)
  const oldStageIds = (await prisma.pipelineStage.findMany({
    where: { tenantId: tenant.id, id: { notIn: ["stage-demo-1","stage-demo-2","stage-demo-3","stage-demo-4","stage-demo-5","stage-demo-6","stage-demo-7","stage-demo-8"] } },
    select: { id: true },
  })).map((s) => s.id);
  if (oldStageIds.length > 0) {
    await prisma.patientPipeline.deleteMany({ where: { stageId: { in: oldStageIds } } });
    await prisma.pipelineStage.deleteMany({ where: { id: { in: oldStageIds } } });
  }

  // Create pipeline stages (8 stages with automation config)
  const stagesData = [
    {
      id: "stage-demo-1", order: 1, name: "Nuevo Contacto", color: "#6B7280", isDefault: true,
      autoMessageEnabled: true, autoMessageDelayHours: 1,
      autoMessageTemplate: "Hola {nombre}! 😊 Gracias por contactarnos. ¿En qué podemos ayudarte? Contanos qué tratamiento te interesa y te buscamos un turno.",
    },
    {
      id: "stage-demo-2", order: 2, name: "Interesado - No Agendó", color: "#F59E0B",
      autoMessageEnabled: true, autoMessageDelayHours: 5,
      autoMessageTemplate: "Hola {nombre}! Vi que te interesó {tratamiento_interes}. ¿Te gustaría agendar tu cita? Tenemos horarios disponibles esta semana 😊",
      autoMoveEnabled: true, autoMoveDelayHours: 24, autoMoveTargetStageId: "stage-demo-7",
    },
    {
      id: "stage-demo-3", order: 3, name: "Primera Cita Agendada", color: "#3B82F6",
      autoMessageEnabled: true, autoMessageDelayHours: 24,
      autoMessageTemplate: "Hola {nombre}! Te recordamos tu cita mañana. ¿Confirmás tu asistencia? 😊",
    },
    {
      id: "stage-demo-4", order: 4, name: "En Tratamiento", color: "#10B981",
    },
    {
      id: "stage-demo-5", order: 5, name: "Seguimiento", color: "#06B6D4",
      autoMessageEnabled: true, autoMessageDelayHours: 4320, // 6 months
      autoMessageTemplate: "Hola {nombre}! Ya pasaron 6 meses desde tu último tratamiento. 🦷 ¿Agendamos tu control? Tenemos turnos disponibles.",
    },
    {
      id: "stage-demo-6", order: 6, name: "Paciente Fidelizado", color: "#8B5CF6",
    },
    {
      id: "stage-demo-7", order: 7, name: "Remarketing", color: "#F97316",
      autoMessageEnabled: true, autoMessageDelayHours: 168, // 1 week
      autoMessageTemplate: "Hola {nombre}! En {clinica} tenemos un {descuento}% de descuento en {tratamiento_interes} solo por esta semana. ¿Te agendamos? 🦷",
      autoMoveEnabled: true, autoMoveDelayHours: 168, autoMoveTargetStageId: "stage-demo-8",
      discountEnabled: true, discountPercent: 10,
      discountMessage: "Descuento especial del 10% en tu próximo tratamiento. Válido por 7 días.",
    },
    {
      id: "stage-demo-8", order: 8, name: "Inactivo", color: "#EF4444",
    },
  ];

  for (const { id, ...data } of stagesData) {
    await prisma.pipelineStage.upsert({
      where: { id },
      update: { name: data.name, color: data.color, order: data.order },
      create: { id, tenantId: tenant.id, ...data },
    });
  }

  // Create demo patients and assign to pipeline stages
  const demoPatients = [
    { id: "patient-demo-1", firstName: "Ana", lastName: "Martínez", phone: "+5491100000001", tags: ["ortodoncia"], stageId: "stage-demo-1", interestTreatment: "Ortodoncia - control" },
    { id: "patient-demo-2", firstName: "Carlos", lastName: "López", phone: "+5491100000002", tags: ["limpieza"], stageId: "stage-demo-2", interestTreatment: "Limpieza dental" },
    { id: "patient-demo-3", firstName: "Valentina", lastName: "Sosa", phone: "+5491100000003", tags: [], stageId: "stage-demo-3", interestTreatment: null },
    { id: "patient-demo-4", firstName: "Rodrigo", lastName: "Pérez", phone: "+5491100000004", tags: ["extracción"], stageId: "stage-demo-4", interestTreatment: null },
    { id: "patient-demo-5", firstName: "Lucía", lastName: "García", phone: "+5491100000005", tags: ["blanqueamiento"], stageId: "stage-demo-5", interestTreatment: null },
    { id: "patient-demo-6", firstName: "Matías", lastName: "Rodríguez", phone: "+5491100000006", tags: [], stageId: "stage-demo-6", interestTreatment: null },
    { id: "patient-demo-7", firstName: "Sofía", lastName: "Torres", phone: "+5491100000007", tags: ["ortodoncia"], stageId: "stage-demo-7", interestTreatment: "Ortodoncia - control" },
    { id: "patient-demo-8", firstName: "Diego", lastName: "Ramírez", phone: "+5491100000008", tags: [], stageId: "stage-demo-8", interestTreatment: null },
  ];

  for (const { id, stageId, interestTreatment, ...patientData } of demoPatients) {
    const patient = await prisma.patient.upsert({
      where: { id },
      update: {},
      create: { id, tenantId: tenant.id, ...patientData, lastVisitAt: stageId === "stage-demo-4" || stageId === "stage-demo-5" || stageId === "stage-demo-6" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : null },
    });
    await prisma.patientPipeline.upsert({
      where: { patientId: patient.id },
      update: {},
      create: {
        patientId: patient.id,
        stageId,
        movedAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
        interestTreatment,
      },
    });
  }

  // Create FAQ entries (upsert by fixed IDs)
  await Promise.all([
    prisma.faqEntry.upsert({
      where: { id: "faq-demo-1" },
      update: {},
      create: { id: "faq-demo-1", tenantId: tenant.id, question: "¿Cuáles son los horarios de atención?", answer: "Atendemos de lunes a viernes de 9:00 a 18:00 hs.", category: "horarios" },
    }),
    prisma.faqEntry.upsert({
      where: { id: "faq-demo-2" },
      update: {},
      create: { id: "faq-demo-2", tenantId: tenant.id, question: "¿Cuánto cuesta una limpieza dental?", answer: "La limpieza dental tiene un costo de $5.000. Consultá por nuestras promos vigentes.", category: "precios" },
    }),
    prisma.faqEntry.upsert({
      where: { id: "faq-demo-3" },
      update: {},
      create: { id: "faq-demo-3", tenantId: tenant.id, question: "¿Dónde están ubicados?", answer: "Estamos en Buenos Aires. Escribinos para que te pasemos la dirección exacta.", category: "ubicación" },
    }),
  ]);

  // Default campaigns (upsert by fixed IDs)
  const campaigns = [
    { id: "camp-demo-1", name: "Recordatorio 24hs antes de cita", type: "REMINDER_24H" as const, triggerType: "TIME_AFTER_EVENT" as const, triggerConfig: { hoursBefore: 24 }, messageContent: "Hola {nombre}! 😊 Te recordamos tu cita mañana {fecha} a las {hora} en {clínica}. ¿Confirmás tu asistencia? Respondé SI para confirmar o NO para cancelar." },
    { id: "camp-demo-2", name: "Feliz Cumpleaños + Descuento", type: "BIRTHDAY" as const, triggerType: "DATE_FIELD" as const, triggerConfig: { field: "birthdate", daysOffset: 0 }, messageContent: "¡Feliz cumpleaños, {nombre}! 🎂 En {clínica} queremos celebrar con vos. Tenés un 15% de descuento en tu próximo tratamiento. Válido por 30 días. ¡Agendá tu cita!" },
    { id: "camp-demo-3", name: "Recordatorio 6 meses (mantenimiento)", type: "REMINDER_6M" as const, triggerType: "TIME_AFTER_EVENT" as const, triggerConfig: { monthsAfter: 6, event: "appointment.completed" }, messageContent: "Hola {nombre}! Ya pasaron 6 meses desde tu última limpieza dental. 🦷 Es momento de tu control. ¿Querés agendar tu próxima cita? Respondé y te ayudamos." },
    { id: "camp-demo-4", name: "Bienvenida nuevo paciente", type: "WELCOME" as const, triggerType: "EVENT" as const, triggerConfig: { event: "patient.created" }, messageContent: "¡Bienvenido/a a {clínica}, {nombre}! 😊 Estamos para cuidar tu salud dental. Si tenés alguna consulta, escribinos por acá. ¡Te esperamos!" },
    { id: "camp-demo-5", name: "Reactivación pacientes inactivos", type: "REACTIVATION" as const, triggerType: "TIME_AFTER_EVENT" as const, triggerConfig: { monthsAfter: 12, event: "appointment.completed" }, messageContent: "Hola {nombre}, ¡te extrañamos en {clínica}! 😊 Hace tiempo que no nos visitás. Tu salud dental es importante. ¿Querés agendar un control? Tenemos un turno disponible para vos." },
  ];

  await Promise.all(
    campaigns.map(({ id, ...data }) =>
      prisma.campaign.upsert({
        where: { id },
        update: {},
        create: { id, tenantId: tenant.id, channel: "WHATSAPP", status: "DRAFT", ...data },
      })
    )
  );

  console.log("Seed completed successfully!");
  console.log("\nDemo credentials:");
  console.log("  Email: admin@clinica-demo.com");
  console.log("  Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
