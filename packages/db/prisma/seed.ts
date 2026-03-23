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
      plan: "PROFESSIONAL",
      phone: "+5491100000000",
      email: "demo@dentalflow.app",
      address: "Av. Corrientes 1234, Piso 3",
      city: "Buenos Aires",
      country: "AR",
      timezone: "America/Argentina/Buenos_Aires",
      currency: "ARS",
      welcomeMessage: "¡Bienvenido/a a Clínica Dental Demo! Estamos para cuidar tu sonrisa.",
      registrationEnabled: true,
      askFullName: true,
      askEmail: true,
      askAddress: false,
      askMedicalConditions: false,
      askAllergies: false,
      askMedications: false,
      askHabits: false,
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

  // Create treatment types (with follow-up cycle config)
  const treatmentTypes = await Promise.all([
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-1" },
      update: { followUpEnabled: true, followUpMonths: 6 },
      create: { id: "tt-demo-1", tenantId: tenant.id, name: "Limpieza dental", durationMin: 45, price: 5000, followUpEnabled: true, followUpMonths: 6 },
    }),
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-2" },
      update: { followUpEnabled: true, followUpMonths: 12 },
      create: { id: "tt-demo-2", tenantId: tenant.id, name: "Consulta general", durationMin: 30, price: 3000, followUpEnabled: true, followUpMonths: 12 },
    }),
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-3" },
      update: { followUpEnabled: true, followUpMonths: 12, postProcedureCheck: true, postProcedureDays: 7 },
      create: { id: "tt-demo-3", tenantId: tenant.id, name: "Extracción", durationMin: 60, price: 8000, followUpEnabled: true, followUpMonths: 12, postProcedureCheck: true, postProcedureDays: 7 },
    }),
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-4" },
      update: { followUpEnabled: true, followUpMonths: 1, isMultiSession: true },
      create: { id: "tt-demo-4", tenantId: tenant.id, name: "Ortodoncia - control", durationMin: 30, price: 4000, followUpEnabled: true, followUpMonths: 1, isMultiSession: true },
    }),
    prisma.treatmentType.upsert({
      where: { id: "tt-demo-5" },
      update: { followUpEnabled: true, followUpMonths: 12 },
      create: { id: "tt-demo-5", tenantId: tenant.id, name: "Blanqueamiento", durationMin: 90, price: 15000, followUpEnabled: true, followUpMonths: 12 },
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

  // Create dentist working hours (Mon-Fri 9-18 for both dentists)
  for (const d of [dentist, dentist2]) {
    for (const day of [1, 2, 3, 4, 5]) {
      await prisma.dentistWorkingHours.upsert({
        where: { dentistId_dayOfWeek: { dentistId: d.id, dayOfWeek: day } },
        update: {},
        create: {
          tenantId: tenant.id,
          dentistId: d.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isActive: true,
        },
      });
    }
  }
  console.log("Dentist working hours seeded");

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

  // No demo patients — real patients come from WhatsApp

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

  // ── Demo conversations removed — real conversations come from WhatsApp
  // Legacy demo conversations cleaned up on next seed run
  const skipDemoConversations = true;
  if (!skipDemoConversations) {
  // ── Demo conversations ───────────────────────────────────────────────────
  // 4 realistic WhatsApp conversations with messages

  const now = Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;

  // Helpers to create relative timestamps
  const t = (offsetMs: number) => new Date(now + offsetMs);

  // Conv 1 — Ana Martínez asks about ortodoncia, bot handles (AI_HANDLING)
  const conv1 = await prisma.conversation.upsert({
    where: { id: "conv-demo-1" },
    update: {},
    create: {
      id: "conv-demo-1",
      tenantId: tenant.id,
      patientId: "patient-demo-1",
      channel: "WHATSAPP",
      status: "AI_HANDLING",
      aiEnabled: true,
      lastMessageAt: t(-5 * min),
      lastMessagePreview: "¡Perfecto! ¿Querés que te agende para el martes?",
    },
  });

  const conv1Messages = [
    { id: "msg-c1-1", dir: "INBOUND",  offset: -47*min, text: "Hola! Quería consultar sobre ortodoncia, cuánto sale la consulta inicial?", meta: null },
    { id: "msg-c1-2", dir: "OUTBOUND", offset: -46*min, text: "¡Hola Ana! 😊 La consulta inicial de ortodoncia con el Dr. Carlos Fernández cuesta $4.000. Incluye revisación completa y presupuesto detallado. ¿Te gustaría agendar?", meta: { sentBy: "bot" } },
    { id: "msg-c1-3", dir: "INBOUND",  offset: -40*min, text: "Sí me interesa! ¿Qué horarios tienen disponibles?", meta: null },
    { id: "msg-c1-4", dir: "OUTBOUND", offset: -39*min, text: "Tenemos disponibilidad esta semana 📅:\n\n• Martes 15/04 — 10:00 hs\n• Miércoles 16/04 — 15:30 hs\n• Viernes 18/04 — 11:00 hs\n\n¿Cuál te queda mejor?", meta: { sentBy: "bot" } },
    { id: "msg-c1-5", dir: "INBOUND",  offset: -10*min, text: "El martes a las 10 me viene bien!", meta: null },
    { id: "msg-c1-6", dir: "OUTBOUND", offset: -5*min,  text: "¡Perfecto! ¿Querés que te agende para el martes?", meta: { sentBy: "bot" } },
  ];

  // Conv 2 — Carlos López needs human (HUMAN_NEEDED)
  const conv2 = await prisma.conversation.upsert({
    where: { id: "conv-demo-2" },
    update: {},
    create: {
      id: "conv-demo-2",
      tenantId: tenant.id,
      patientId: "patient-demo-2",
      channel: "WHATSAPP",
      status: "HUMAN_NEEDED",
      aiEnabled: false,
      lastMessageAt: t(-12*min),
      lastMessagePreview: "Necesito hablar con alguien de la clínica urgente",
    },
  });

  const conv2Messages = [
    { id: "msg-c2-1", dir: "INBOUND",  offset: -3*hr,   text: "Buenas, quería cancelar mi turno de mañana", meta: null },
    { id: "msg-c2-2", dir: "OUTBOUND", offset: -3*hr+1*min, text: "Hola Carlos! 😊 Entendido, ¿podés decirme el motivo de la cancelación? Así lo registramos.", meta: { sentBy: "bot" } },
    { id: "msg-c2-3", dir: "INBOUND",  offset: -2*hr,   text: "Tuve un problema con el seguro médico, necesito que me devuelvan la seña", meta: null },
    { id: "msg-c2-4", dir: "OUTBOUND", offset: -2*hr+2*min, text: "Entiendo tu situación, Carlos. Las consultas sobre pagos y señas las maneja directamente el equipo de administración. Voy a transferirte con ellos 🙏", meta: { sentBy: "bot" } },
    { id: "msg-c2-5", dir: "INBOUND",  offset: -30*min, text: "Ok pero cuándo me responden? Ya pasó una hora", meta: null },
    { id: "msg-c2-6", dir: "INBOUND",  offset: -12*min, text: "Necesito hablar con alguien de la clínica urgente", meta: null },
  ];

  // Conv 3 — Valentina Sosa, reminder confirmed (AI_HANDLING, no unread)
  const conv3 = await prisma.conversation.upsert({
    where: { id: "conv-demo-3" },
    update: {},
    create: {
      id: "conv-demo-3",
      tenantId: tenant.id,
      patientId: "patient-demo-3",
      channel: "WHATSAPP",
      status: "AI_HANDLING",
      aiEnabled: true,
      lastMessageAt: t(-2*hr),
      lastMessagePreview: "¡Confirmado! Te esperamos mañana a las 14:30 ✅",
    },
  });

  const conv3Messages = [
    { id: "msg-c3-1", dir: "OUTBOUND", offset: -25*hr, text: "¡Hola Valentina! 📅 Te recordamos tu cita mañana miércoles a las 14:30 con la Dra. María González. ¿Confirmás tu asistencia? Respondé SI o NO.", meta: { sentBy: "bot" } },
    { id: "msg-c3-2", dir: "INBOUND",  offset: -23*hr, text: "SI confirmo gracias", meta: null },
    { id: "msg-c3-3", dir: "OUTBOUND", offset: -23*hr+1*min, text: "¡Perfecto, Valentina! ✅ Cita confirmada para mañana a las 14:30. Si necesitás cancelar o cambiar, avisanos con anticipación. ¡Hasta mañana! 😊", meta: { sentBy: "bot" } },
    { id: "msg-c3-4", dir: "INBOUND",  offset: -2*hr-10*min, text: "Hola, una consulta, puedo ir con turno un poco antes? digamos a las 14?", meta: null },
    { id: "msg-c3-5", dir: "OUTBOUND", offset: -2*hr, text: "¡Confirmado! Te esperamos mañana a las 14:30 ✅", meta: { sentBy: "bot" } },
  ];

  // Conv 4 — Rodrigo Pérez, past extraction, closed
  const conv4 = await prisma.conversation.upsert({
    where: { id: "conv-demo-4" },
    update: {},
    create: {
      id: "conv-demo-4",
      tenantId: tenant.id,
      patientId: "patient-demo-4",
      channel: "WHATSAPP",
      status: "CLOSED",
      aiEnabled: false,
      lastMessageAt: t(-3*24*hr),
      lastMessagePreview: "Gracias por tu consulta, Rodrigo. ¡Hasta pronto! 🦷",
    },
  });

  const conv4Messages = [
    { id: "msg-c4-1", dir: "INBOUND",  offset: -3*24*hr-2*hr, text: "Buenas tardes, quería preguntar cuánto sale una extracción de muela del juicio", meta: null },
    { id: "msg-c4-2", dir: "OUTBOUND", offset: -3*24*hr-1*hr-55*min, text: "¡Hola Rodrigo! 😊 La extracción de muela del juicio tiene un costo de $8.000. Incluye anestesia local. Para casos complicados puede variar previa evaluación. ¿Querés agendar una consulta?", meta: { sentBy: "bot" } },
    { id: "msg-c4-3", dir: "INBOUND",  offset: -3*24*hr-1*hr, text: "Ah ok gracias. Por ahora no, lo voy a pensar", meta: null },
    { id: "msg-c4-4", dir: "OUTBOUND", offset: -3*24*hr-59*min, text: "¡Claro! Cuando quieras, estamos acá. Recordá que si sentís molestias o dolor, lo antes posible es lo mejor. ¡Hasta pronto! 🦷", meta: { sentBy: "bot" } },
    { id: "msg-c4-5", dir: "OUTBOUND", offset: -3*24*hr, text: "Gracias por tu consulta, Rodrigo. ¡Hasta pronto! 🦷", meta: { sentBy: "human" } },
  ];

  // Insert all messages (upsert by fixed ID)
  const allMessages = [
    ...conv1Messages.map(m => ({ ...m, convId: conv1.id })),
    ...conv2Messages.map(m => ({ ...m, convId: conv2.id })),
    ...conv3Messages.map(m => ({ ...m, convId: conv3.id })),
    ...conv4Messages.map(m => ({ ...m, convId: conv4.id })),
  ];

  for (const { id: msgId, dir, offset, text, meta, convId } of allMessages) {
    const sentAt = t(offset);
    await prisma.message.upsert({
      where: { id: msgId },
      update: {},
      create: {
        id: msgId,
        conversationId: convId,
        direction: dir as "INBOUND" | "OUTBOUND",
        type: "TEXT",
        content: text,
        metadata: meta ?? undefined,
        sentAt,
        // Mark older outbound messages as delivered+read for realism
        deliveredAt: dir === "OUTBOUND" ? new Date(sentAt.getTime() + 10 * 1000) : null,
        readAt: dir === "OUTBOUND" && offset < -30*min ? new Date(sentAt.getTime() + 60 * 1000) : null,
      },
    });
  }

  console.log("Demo conversations skipped (real data from WhatsApp)");
  } // end skipDemoConversations

  // ─── WhatsApp Templates (10 system templates) ───────────────────────────────
  // Delete old templates that had the wrong schema fields
  await prisma.whatsAppTemplate.deleteMany({ where: { tenantId: tenant.id } });

  const templatesData = [
    {
      id: "tpl-sys-1", name: "appointment_reminder_24h", displayName: "Recordatorio de cita 24hs", category: "UTILITY",
      bodyText: "¡Hola {{1}}! 📅 Te recordamos tu cita mañana a las {{2}} con {{3}} en {{4}}. ¡Te esperamos! Si necesitás reprogramar, escribinos con anticipación. 😊",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }, { position: 2, field: "time", example: "10:00" }, { position: 3, field: "dentistName", example: "Dra. González" }, { position: 4, field: "clinicName", example: "Clínica Dental" }],
      triggerType: "appointment_reminder",
    },
    {
      id: "tpl-sys-2", name: "post_visit_followup", displayName: "Seguimiento post-visita", category: "UTILITY",
      bodyText: "¡Hola {{1}}! 😊 ¿Cómo te sentiste después de tu {{2}}? Si tenés alguna molestia o duda, no dudes en escribirnos. Tu salud dental es nuestra prioridad.",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }, { position: 2, field: "treatmentName", example: "limpieza dental" }],
      triggerType: "post_visit",
    },
    {
      id: "tpl-sys-3", name: "treatment_followup_6m", displayName: "Control periódico", category: "UTILITY",
      bodyText: "¡Hola {{1}}! Ya pasaron {{2}} meses desde tu última {{3}} en {{4}}. Es momento de tu control periódico. ¿Te gustaría agendar? 🦷",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }, { position: 2, field: "months", example: "6" }, { position: 3, field: "treatmentName", example: "limpieza" }, { position: 4, field: "clinicName", example: "Clínica Dental" }],
      triggerType: "follow_up",
    },
    {
      id: "tpl-sys-4", name: "interested_not_booked", displayName: "Interesado sin agendar", category: "UTILITY",
      bodyText: "¡Hola {{1}}! Vi que estabas interesado en {{2}}. Tenemos horarios disponibles esta semana. ¿Te ayudo a agendar? 📅",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }, { position: 2, field: "treatmentName", example: "ortodoncia" }],
      triggerType: "interested_not_booked",
    },
    {
      id: "tpl-sys-5", name: "reactivation_standard", displayName: "Reactivación estándar", category: "MARKETING",
      bodyText: "¡Hola {{1}}! Te extrañamos en {{2}}. Tu salud dental es importante. ¿Agendamos un control? Tenemos horarios disponibles para vos. 😊",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }, { position: 2, field: "clinicName", example: "Clínica Dental" }],
      triggerType: "reactivation",
    },
    {
      id: "tpl-sys-6", name: "reactivation_discount", displayName: "Reactivación con descuento", category: "MARKETING",
      bodyText: "¡Hola {{1}}! En {{2}} tenemos un {{3}}% de descuento especial para vos en tu próxima visita. ¡Aprovechalo! ¿Te gustaría agendar? 🎉",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }, { position: 2, field: "clinicName", example: "Clínica Dental" }, { position: 3, field: "discountPercent", example: "10" }],
      triggerType: "reactivation",
    },
    {
      id: "tpl-sys-7", name: "birthday_greeting", displayName: "Feliz cumpleaños", category: "MARKETING",
      bodyText: "¡Feliz cumpleaños {{1}}! 🎂🎉 En {{2}} queremos celebrar con vos. Te regalamos un {{3}}% de descuento en tu próximo tratamiento. ¡Válido por 30 días!",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }, { position: 2, field: "clinicName", example: "Clínica Dental" }, { position: 3, field: "discountPercent", example: "15" }],
      triggerType: "birthday",
    },
    {
      id: "tpl-sys-8", name: "no_show_followup", displayName: "No asistió a cita", category: "UTILITY",
      bodyText: "¡Hola {{1}}! Notamos que no pudiste asistir a tu cita. No te preocupes, estas cosas pasan. ¿Te gustaría que busquemos otro horario? 😊",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }],
      triggerType: "no_show",
    },
    {
      id: "tpl-sys-9", name: "post_procedure_check", displayName: "Control post-procedimiento", category: "UTILITY",
      bodyText: "¡Hola {{1}}! Ya pasaron {{2}} días desde tu {{3}}. ¿Cómo te sentís? Si tenés alguna molestia o duda, escribinos. Estamos para ayudarte. 🦷",
      variablesJson: [{ position: 1, field: "firstName", example: "Pedro" }, { position: 2, field: "days", example: "7" }, { position: 3, field: "treatmentName", example: "extracción" }],
      triggerType: "post_procedure",
    },
    {
      id: "tpl-sys-10", name: "welcome_new_patient", displayName: "Bienvenida nuevo paciente", category: "UTILITY",
      bodyText: "¡Bienvenido/a a {{1}}, {{2}}! 😊 Gracias por elegirnos para cuidar tu sonrisa. Si necesitás agendar una cita o tenés alguna consulta, escribinos por acá.",
      variablesJson: [{ position: 1, field: "clinicName", example: "Clínica Dental" }, { position: 2, field: "firstName", example: "Pedro" }],
      triggerType: "welcome",
    },
  ];

  for (const { id, variablesJson, ...tplData } of templatesData) {
    await prisma.whatsAppTemplate.upsert({
      where: { id },
      update: { ...tplData, variablesJson: variablesJson as unknown as undefined, isSystemTemplate: true, status: "APPROVED", isActive: true },
      create: {
        id,
        tenantId: tenant.id,
        language: "es_AR",
        status: "APPROVED",
        isSystemTemplate: true,
        isActive: true,
        variablesJson: variablesJson as unknown as undefined,
        ...tplData,
      },
    });
  }
  console.log("WhatsApp templates seeded (10 system templates)");

  // ─── Super Admin ────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("DentalFlow2026!", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@dentalflow.app" },
    update: {},
    create: {
      email: "admin@dentalflow.app",
      passwordHash: adminPassword,
      name: "Super Admin",
    },
  });
  console.log("Super admin seeded: admin@dentalflow.app");

  console.log("Seed completed successfully!");
  console.log("\nDemo credentials:");
  console.log("  Email: admin@clinica-demo.com");
  console.log("  Password: password123");
  console.log("\nSuper Admin credentials:");
  console.log("  Email: admin@dentalflow.app");
  console.log("  Password: DentalFlow2026!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
