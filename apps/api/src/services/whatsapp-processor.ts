/**
 * WhatsApp Message Processor
 *
 * Handles incoming WhatsApp messages end-to-end:
 * 1. Resolve tenant from phone_number_id
 * 2. Find or create patient by phone
 * 3. Find or create conversation
 * 4. Save inbound message
 * 5. If AI enabled → run chatbot → send response → save outbound message
 * 6. Pipeline integration (new patient, interest tracking)
 */

import { prisma } from "@dentalflow/db";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppInteractiveButtons,
  markWhatsAppMessageAsRead,
  type IncomingMessage,
  type StatusUpdate,
} from "@dentalflow/messaging";
import {
  generateChatbotResponse,
  routeIntent,
  type BotConfig,
  type ClinicContext,
  type PatientContext,
  type ConversationMessage,
} from "@dentalflow/ai";
import { SONNET_USAGE_MULTIPLIER } from "@dentalflow/shared";
import { recordUsage, checkPlanLimit } from "./usage-tracker.js";
import { decryptToken } from "./encryption.js";
import type { FastifyBaseLogger } from "fastify";

// ─── Resolved tenant shape ─────────────────────────────────────────────────────

interface ResolvedTenant {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  resolvedPhoneNumberId: string;
  resolvedAccessToken: string;
  botConfig: BotConfig;
  messageDebounceSeconds: number;
}

// ─── Debounce state (in-memory, per conversation) ─────────────────────────────
// When a patient sends multiple messages quickly, we accumulate them and
// process once the typing pause exceeds the debounce window.

const debounceTimers = new Map<string, NodeJS.Timeout>();
const pendingMessages = new Map<string, string[]>();

// Processing lock: prevents a second AI call while the first batch is still being processed.
// If new messages arrive during processing, they accumulate in pendingMessages and get
// processed automatically when the current batch finishes.
const processingLock = new Map<string, boolean>();

// Context needed to process the debounced batch — stored when first message arrives
interface DebouncedContext {
  tenant: ResolvedTenant;
  conversationId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  pipelineEntry: { stage: { name: string }; interestTreatment?: string | null } | null;
  recipientPhone: string; // msg.from
}
const pendingContexts = new Map<string, DebouncedContext>();

// ─── Audio response messages (0 tokens) ───────────────────────────────────────

const AUDIO_REPLIES: Record<string, string> = {
  es: "¡Hola! Por el momento solo puedo leer mensajes de texto. ¿Podrías escribirme tu consulta? 😊",
  pt: "Olá! No momento só consigo ler mensagens de texto. Poderia me escrever sua consulta? 😊",
  en: "Hi! At the moment I can only read text messages. Could you type your question? 😊",
};

// ─── Resolve tenant from WhatsApp phone_number_id ─────────────────────────────
// Each clinic connects their own WABA via Embedded Signup.
// Lookup is by whatsappPhoneNumberId on the Tenant model.

async function resolveTenant(phoneNumberId: string): Promise<ResolvedTenant | null> {
  const tenant = await prisma.tenant.findFirst({
    where: {
      whatsappPhoneNumberId: phoneNumberId,
      whatsappStatus: "CONNECTED",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      whatsappPhoneNumberId: true,
      whatsappAccessToken: true,
      welcomeMessage: true,
      botTone: true,
      botLanguage: true,
      askBirthdate: true,
      askInsurance: true,
      offerDiscounts: true,
      maxDiscountPercent: true,
      proactiveFollowUp: true,
      leadRecontactHours: true,
      messageDebounceSeconds: true,
    },
  });

  if (!tenant?.whatsappPhoneNumberId || !tenant.whatsappAccessToken) {
    return null;
  }

  // Decrypt the stored access token
  let accessToken: string;
  try {
    accessToken = decryptToken(tenant.whatsappAccessToken);
  } catch {
    // Fallback: token might be stored unencrypted (pre-migration data)
    accessToken = tenant.whatsappAccessToken;
  }

  return {
    id: tenant.id,
    name: tenant.name,
    address: tenant.address,
    phone: tenant.phone,
    resolvedPhoneNumberId: tenant.whatsappPhoneNumberId,
    resolvedAccessToken: accessToken,
    botConfig: {
      botTone: tenant.botTone as BotConfig["botTone"],
      botLanguage: tenant.botLanguage as BotConfig["botLanguage"],
      welcomeMessage: tenant.welcomeMessage,
      askBirthdate: tenant.askBirthdate,
      askInsurance: tenant.askInsurance,
      offerDiscounts: tenant.offerDiscounts,
      maxDiscountPercent: tenant.maxDiscountPercent,
      proactiveFollowUp: tenant.proactiveFollowUp,
      leadRecontactHours: tenant.leadRecontactHours,
    },
    messageDebounceSeconds: tenant.messageDebounceSeconds,
  };
}

// ─── Find or create patient by phone ──────────────────────────────────────────

async function findOrCreatePatient(
  tenantId: string,
  phone: string,
  profileName: string | undefined,
  log: FastifyBaseLogger
) {
  // Normalize phone to international format (ensure + prefix)
  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

  let patient = await prisma.patient.findFirst({
    where: { tenantId, phone: normalizedPhone },
    include: {
      pipelineEntry: {
        include: { stage: { select: { id: true, name: true } } },
      },
    },
  });

  if (!patient) {
    log.info({ phone: normalizedPhone, profileName }, "Creating new patient from WhatsApp");

    // Parse profile name from WhatsApp (best effort)
    const nameParts = (profileName ?? "Paciente WhatsApp").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "Paciente";
    const lastName = nameParts.slice(1).join(" ") || "WhatsApp";

    // Find the first pipeline stage ("Nuevo Contacto")
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { tenantId },
      orderBy: { order: "asc" },
    });

    patient = await prisma.patient.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone: normalizedPhone,
        source: "CHATBOT",
        tags: ["whatsapp", "nuevo"],
        ...(firstStage
          ? {
              pipelineEntry: {
                create: {
                  stageId: firstStage.id,
                  movedAt: new Date(),
                },
              },
            }
          : {}),
      },
      include: {
        pipelineEntry: {
          include: { stage: { select: { id: true, name: true } } },
        },
      },
    });

    log.info({ patientId: patient.id }, "New patient created from WhatsApp");
  }

  return patient;
}

// ─── Find or create active conversation ───────────────────────────────────────

async function findOrCreateConversation(
  tenantId: string,
  patientId: string,
  log: FastifyBaseLogger
) {
  let conv = await prisma.conversation.findFirst({
    where: {
      tenantId,
      patientId,
      status: { not: "CLOSED" },
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        tenantId,
        patientId,
        channel: "WHATSAPP",
        status: "AI_HANDLING",
        aiEnabled: true,
        lastMessageAt: new Date(),
      },
    });
    log.info({ conversationId: conv.id }, "New conversation created");
  }

  return conv;
}

// ─── Build clinic context for chatbot ─────────────────────────────────────────

async function buildClinicContext(tenantId: string, tenantName: string, tenantAddress?: string | null): Promise<ClinicContext> {
  const [workingHours, dentists, treatments, faqs] = await Promise.all([
    prisma.workingHours.findMany({
      where: { tenantId, isActive: true },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.dentist.findMany({
      where: { tenantId, isActive: true },
      include: {
        treatments: {
          include: { treatmentType: { select: { name: true } } },
        },
      },
    }),
    prisma.treatmentType.findMany({
      where: { tenantId, isActive: true },
      select: { name: true, price: true, durationMin: true },
    }),
    prisma.faqEntry.findMany({
      where: { tenantId, isActive: true },
    }),
  ]);

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const workingHoursFormatted = workingHours
    .map((wh) => `${dayNames[wh.dayOfWeek]}: ${wh.startTime} - ${wh.endTime}`)
    .join("\n");

  const dentistsInfo = dentists
    .map((d) => {
      const txNames = d.treatments.map((t) => t.treatmentType.name).join(", ");
      return `- ${d.name}${d.specialty ? ` (${d.specialty})` : ""}${txNames ? `: ${txNames}` : ""}`;
    })
    .join("\n");

  const treatmentsInfo = treatments
    .map((t) => {
      const price = t.price ? `$${parseFloat(t.price.toString()).toLocaleString("es-AR")}` : "consultar";
      return `- ${t.name}: ${price} (${t.durationMin} min)`;
    })
    .join("\n");

  const faqsFormatted = faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  return {
    clinicName: tenantName,
    clinicAddress: tenantAddress ?? undefined,
    workingHoursFormatted: workingHoursFormatted || "No configurados",
    dentistsInfo: dentistsInfo || "No hay dentistas configurados",
    treatmentsInfo: treatmentsInfo || "No hay tratamientos configurados",
    faqsFormatted,
  };
}

// ─── Build patient context for chatbot ────────────────────────────────────────

async function buildPatientContext(
  tenantId: string,
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    pipelineEntry?: { stage: { name: string }; interestTreatment?: string | null } | null;
  }
): Promise<PatientContext> {
  const nextAppt = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      tenantId,
      startTime: { gte: new Date() },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    orderBy: { startTime: "asc" },
    include: {
      dentist: { select: { name: true } },
      treatmentType: { select: { name: true } },
    },
  });

  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    pipelineStageName: patient.pipelineEntry?.stage.name,
    interestTreatment: patient.pipelineEntry?.interestTreatment ?? undefined,
    nextAppointment: nextAppt
      ? {
          date: nextAppt.startTime.toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          time: nextAppt.startTime.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          dentistName: nextAppt.dentist.name,
          treatmentName: nextAppt.treatmentType?.name ?? "Consulta general",
        }
      : null,
  };
}

// ─── Get conversation history for chatbot context ─────────────────────────────

async function getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
  const msgs = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { sentAt: "desc" },
    take: 10,
    select: { direction: true, content: true },
  });

  // Reverse to get chronological order
  return msgs.reverse().map((m) => ({
    role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));
}

// ─── Handle tool calls from chatbot ───────────────────────────────────────────

async function handleToolCalls(
  toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>,
  tenantId: string,
  patientId: string,
  conversationId: string,
  log: FastifyBaseLogger
): Promise<string[]> {
  const responses: string[] = [];

  for (const tool of toolCalls) {
    switch (tool.toolName) {
      case "book_appointment": {
        const treatmentType = (tool.args.treatmentType as string) ?? "";
        log.info({ patientId, treatmentType }, "Chatbot: book_appointment tool called");

        // Save interest treatment in pipeline
        await prisma.patientPipeline.updateMany({
          where: { patientId },
          data: { interestTreatment: treatmentType },
        });

        // Find available slots (simplified — returns next 3 available slots)
        const slots = await findAvailableSlots(tenantId, treatmentType, log);

        if (slots.length === 0) {
          responses.push(
            `No encontré horarios disponibles para ${treatmentType} en los próximos días. Voy a conectarte con el equipo para que te ayuden. 😊`
          );
        } else {
          const slotText = slots
            .map(
              (s, i) =>
                `${i + 1}. ${s.date} a las ${s.time} con ${s.dentistName}`
            )
            .join("\n");
          responses.push(
            `Tenemos estos horarios disponibles para ${treatmentType}:\n\n${slotText}\n\n¿Cuál te queda mejor? 📅`
          );
        }
        break;
      }

      case "cancel_appointment": {
        log.info({ patientId }, "Chatbot: cancel_appointment tool called");
        const nextAppt = await prisma.appointment.findFirst({
          where: {
            patientId,
            tenantId,
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { gte: new Date() },
          },
          orderBy: { startTime: "asc" },
        });

        if (nextAppt) {
          await prisma.appointment.update({
            where: { id: nextAppt.id },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              cancelReason: (tool.args.reason as string) ?? "Cancelada por paciente vía WhatsApp",
            },
          });

          // Move patient to "Interesado - No Agendó" stage
          await movePipelineToStage(tenantId, patientId, "Interesado - No Agendó", log);

          responses.push("Tu cita ha sido cancelada. ¿Te gustaría agendar otra fecha? 📅");
        } else {
          responses.push("No encontré una cita próxima para cancelar. ¿Puedo ayudarte en algo más?");
        }
        break;
      }

      case "reschedule_appointment": {
        log.info({ patientId }, "Chatbot: reschedule_appointment tool called");
        responses.push(
          "Para reagendar tu cita, necesito que me digas qué día y horario te queda mejor. ¿Preferís mañana o tarde? 📅"
        );
        break;
      }

      case "check_appointment": {
        log.info({ patientId }, "Chatbot: check_appointment tool called");
        const appt = await prisma.appointment.findFirst({
          where: {
            patientId,
            tenantId,
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { gte: new Date() },
          },
          orderBy: { startTime: "asc" },
          include: {
            dentist: { select: { name: true } },
            treatmentType: { select: { name: true } },
          },
        });

        if (appt) {
          const date = appt.startTime.toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          const time = appt.startTime.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          responses.push(
            `Tu próxima cita es el ${date} a las ${time} con ${appt.dentist.name}${
              appt.treatmentType ? ` para ${appt.treatmentType.name}` : ""
            }. ✅`
          );
        } else {
          responses.push("No tenés citas agendadas actualmente. ¿Querés agendar una? 😊");
        }
        break;
      }

      case "transfer_to_human": {
        log.info({ patientId, reason: tool.args.reason }, "Chatbot: transfer_to_human");
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: "HUMAN_NEEDED", aiEnabled: false },
        });
        responses.push("Dejame comunicarte con nuestro equipo para ayudarte mejor. Te van a responder a la brevedad. 😊");
        break;
      }

      case "answer_faq": {
        // The chatbot should include the answer in its text response.
        // This tool is mainly for classification — no extra action needed.
        break;
      }

      default:
        log.warn({ toolName: tool.toolName }, "Unknown chatbot tool call");
    }
  }

  return responses;
}

// ─── Find available appointment slots (simplified) ────────────────────────────

interface AvailableSlot {
  date: string;
  time: string;
  dentistName: string;
  dentistId: string;
  startTime: Date;
  endTime: Date;
}

async function findAvailableSlots(
  tenantId: string,
  treatmentName: string,
  log: FastifyBaseLogger
): Promise<AvailableSlot[]> {
  // Find treatment type
  const treatment = await prisma.treatmentType.findFirst({
    where: {
      tenantId,
      isActive: true,
      name: { contains: treatmentName, mode: "insensitive" },
    },
  });

  const durationMin = treatment?.durationMin ?? 30;

  // Find dentists that can do this treatment
  let dentistIds: string[] | undefined;
  if (treatment) {
    const dentistTreatments = await prisma.dentistTreatment.findMany({
      where: { tenantId, treatmentTypeId: treatment.id },
      select: { dentistId: true },
    });
    if (dentistTreatments.length > 0) {
      dentistIds = dentistTreatments.map((dt) => dt.dentistId);
    }
  }

  const dentists = await prisma.dentist.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(dentistIds ? { id: { in: dentistIds } } : {}),
    },
    include: {
      workingHours: { where: { isActive: true } },
    },
  });

  if (dentists.length === 0) return [];

  const slots: AvailableSlot[] = [];
  const now = new Date();

  // Search next 7 business days
  for (let dayOffset = 0; dayOffset < 14 && slots.length < 3; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dow = date.getDay(); // 0=Sun

    for (const dentist of dentists) {
      if (slots.length >= 3) break;

      const wh = dentist.workingHours.find((h) => h.dayOfWeek === dow);
      if (!wh) continue;

      const [startH, startM] = wh.startTime.split(":").map(Number);
      const [endH, endM] = wh.endTime.split(":").map(Number);

      // Try hourly slots
      for (let hour = startH; hour < endH && slots.length < 3; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, hour === startH ? startM : 0, 0, 0);

        // Skip past slots
        if (slotStart <= now) continue;

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMin);

        // Check slot doesn't exceed working hours
        const endMinutes = endH * 60 + endM;
        const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
        if (slotEndMinutes > endMinutes) continue;

        // Check for conflicts
        const conflict = await prisma.appointment.findFirst({
          where: {
            tenantId,
            dentistId: dentist.id,
            status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
            startTime: { lt: slotEnd },
            endTime: { gt: slotStart },
          },
        });

        if (!conflict) {
          slots.push({
            date: slotStart.toLocaleDateString("es-AR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
            time: slotStart.toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            dentistName: dentist.name,
            dentistId: dentist.id,
            startTime: slotStart,
            endTime: slotEnd,
          });
        }
      }
    }
  }

  return slots;
}

// ─── Move patient in pipeline by stage name ───────────────────────────────────

async function movePipelineToStage(
  tenantId: string,
  patientId: string,
  stageName: string,
  log: FastifyBaseLogger
) {
  const stage = await prisma.pipelineStage.findFirst({
    where: {
      tenantId,
      name: { contains: stageName, mode: "insensitive" },
    },
  });

  if (!stage) {
    log.warn({ stageName }, "Pipeline stage not found for auto-move");
    return;
  }

  await prisma.patientPipeline.upsert({
    where: { patientId },
    update: { stageId: stage.id, movedAt: new Date() },
    create: { patientId, stageId: stage.id, movedAt: new Date() },
  });

  log.info({ patientId, stageName: stage.name }, "Patient moved in pipeline");
}

// ─── MAIN: Process incoming WhatsApp message ──────────────────────────────────

export async function processIncomingMessage(
  msg: IncomingMessage,
  phoneNumberId: string,
  log: FastifyBaseLogger
): Promise<void> {
  // 1. Resolve tenant from phone_number_id
  const tenant = await resolveTenant(phoneNumberId);
  if (!tenant) {
    log.warn({ phoneNumberId }, "No tenant found for WhatsApp phone number ID");
    return;
  }

  // (credentials are guaranteed by resolveTenant — no extra check needed)

  // 2. Idempotency check — skip if we already processed this waMessageId
  const existingMsg = await prisma.message.findFirst({
    where: { whatsappMessageId: msg.waMessageId },
  });
  if (existingMsg) {
    log.debug({ waMessageId: msg.waMessageId }, "Duplicate message — skipping");
    return;
  }

  // 3. Find or create patient
  const patient = await findOrCreatePatient(tenant.id, msg.from, msg.profileName, log);

  // 4. Find or create conversation
  const conversation = await findOrCreateConversation(tenant.id, patient.id, log);

  // 5. Save inbound message
  const messageContent = msg.text ?? `[${msg.type}]`;
  const now = new Date();

  const savedMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      type: msg.type === "text" ? "TEXT" : msg.type === "image" ? "IMAGE" : msg.type === "audio" ? "AUDIO" : "TEXT",
      content: messageContent,
      whatsappMessageId: msg.waMessageId,
      mediaUrl: msg.mediaUrl,
      metadata: {
        waTimestamp: msg.timestamp,
        profileName: msg.profileName,
        interactiveReplyId: msg.interactiveReplyId,
        interactiveReplyTitle: msg.interactiveReplyTitle,
      },
      sentAt: new Date(msg.timestamp * 1000),
    },
  });

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: now,
      lastMessagePreview: messageContent.slice(0, 100),
      // If conversation was closed, reopen it
      ...(conversation.status === "CLOSED" ? { status: "AI_HANDLING", aiEnabled: true } : {}),
    },
  });

  // Mark the incoming message as read in WhatsApp
  markWhatsAppMessageAsRead({
    phoneNumberId: tenant.resolvedPhoneNumberId,
    accessToken: tenant.resolvedAccessToken,
    messageId: msg.waMessageId,
  }).catch((err) => log.warn({ err }, "Failed to mark message as read"));

  log.info(
    { messageId: savedMessage.id, patientId: patient.id, conversationId: conversation.id },
    "Inbound message saved"
  );

  // 6. Handle audio messages — reply with a fixed text (0 tokens, 0 cost)
  // WhatsApp sends voice notes as type "audio"
  if (msg.type === "audio") {
    log.info({ conversationId: conversation.id, type: msg.type }, "Audio message received — sending text-only notice");

    if (conversation.aiEnabled && conversation.status !== "HUMAN_NEEDED") {
      const audioReply = AUDIO_REPLIES[tenant.botConfig.botLanguage] ?? AUDIO_REPLIES.es;
      const waAudioReplyId = await sendWhatsAppTextMessage({
        phoneNumberId: tenant.resolvedPhoneNumberId,
        accessToken: tenant.resolvedAccessToken,
        to: msg.from,
        message: audioReply,
      });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          type: "TEXT",
          content: audioReply,
          whatsappMessageId: waAudioReplyId,
          metadata: { sentBy: "bot", audioNotice: true },
          sentAt: new Date(),
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastMessagePreview: audioReply.slice(0, 100) },
      });
      // Track WhatsApp message but NOT AI interaction (no tokens used)
      recordUsage(tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound", conversationId: conversation.id }).catch(() => {});
    }
    return; // Do NOT process audio through chatbot
  }

  // 7. If AI is enabled → run chatbot (with debounce)
  if (conversation.aiEnabled && conversation.status !== "HUMAN_NEEDED") {
    // Ensure conversation is in AI_HANDLING status
    if (conversation.status !== "AI_HANDLING") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "AI_HANDLING" },
      });
    }

    // ─── Layer 1: Intent Router (0 tokens) — check for immediate actions ────
    const routerResult = routeIntent(messageContent, tenant.botConfig.botLanguage);
    log.info({ intent: routerResult.intent, confidence: routerResult.confidence }, "Intent router result");

    // FRUSTRATION and HUMAN intents bypass debounce — respond immediately
    if (routerResult.intent === "FRUSTRATION" || (routerResult.intent === "HUMAN" && routerResult.confidence === "high")) {
      // Clear any pending debounce for this conversation
      clearDebounce(conversation.id);

      const isFrustration = routerResult.intent === "FRUSTRATION";
      log.info({ patientId: patient.id }, `${isFrustration ? "Frustration" : "Human request"} detected — transferring`);

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "HUMAN_NEEDED", aiEnabled: false },
      });

      const transferMsgs: Record<string, Record<string, string>> = {
        FRUSTRATION: {
          es: "Entiendo tu frustración. Dejame comunicarte con nuestro equipo para ayudarte mejor. 😊",
          pt: "Entendo sua frustração. Vou conectá-lo com nossa equipe para ajudá-lo melhor. 😊",
          en: "I understand your frustration. Let me connect you with our team to help you better. 😊",
        },
        HUMAN: {
          es: "¡Claro! Dejame comunicarte con nuestro equipo. Te van a responder a la brevedad. 😊",
          pt: "Claro! Vou conectá-lo com nossa equipe. Eles responderão em breve. 😊",
          en: "Sure! Let me connect you with our team. They'll get back to you shortly. 😊",
        },
      };
      const intentKey = isFrustration ? "FRUSTRATION" : "HUMAN";
      const transferMsg = transferMsgs[intentKey][tenant.botConfig.botLanguage] ?? transferMsgs[intentKey].es;

      const waTransferId = await sendWhatsAppTextMessage({
        phoneNumberId: tenant.resolvedPhoneNumberId,
        accessToken: tenant.resolvedAccessToken,
        to: msg.from,
        message: transferMsg,
      });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          type: "TEXT",
          content: transferMsg,
          whatsappMessageId: waTransferId,
          metadata: { sentBy: "bot", intent: intentKey },
          sentAt: new Date(),
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastMessagePreview: transferMsg.slice(0, 100) },
      });
      return;
    }

    // ─── Debounce: accumulate messages, process after pause ─────────────────
    const convId = conversation.id;
    const debounceMs = tenant.messageDebounceSeconds * 1000;

    // Accumulate the message text
    if (!pendingMessages.has(convId)) {
      pendingMessages.set(convId, []);
    }
    pendingMessages.get(convId)!.push(messageContent);

    // Store/update context (always use latest patient data)
    pendingContexts.set(convId, {
      tenant,
      conversationId: convId,
      patientId: patient.id,
      patientFirstName: patient.firstName,
      patientLastName: patient.lastName,
      pipelineEntry: patient.pipelineEntry ?? null,
      recipientPhone: msg.from,
    });

    // If a batch is currently being processed by the AI, just accumulate — no timer needed.
    // The processing function will pick up these messages when it finishes.
    if (processingLock.get(convId)) {
      log.info(
        { conversationId: convId, pendingCount: pendingMessages.get(convId)!.length },
        "Message queued — AI processing in progress, will be included in next batch"
      );
      return;
    }

    // Clear existing timer and set a new one
    if (debounceTimers.has(convId)) {
      clearTimeout(debounceTimers.get(convId)!);
    }

    log.info(
      { conversationId: convId, pendingCount: pendingMessages.get(convId)!.length, debounceMs },
      "Message debounced — waiting for more"
    );

    const timer = setTimeout(() => {
      processDebouncedMessages(convId, log).catch((err) => {
        log.error({ err, conversationId: convId }, "Error processing debounced messages");
      });
    }, debounceMs);

    debounceTimers.set(convId, timer);
  } else {
    // AI disabled or HUMAN_NEEDED — make sure status reflects it
    if (conversation.status !== "HUMAN_NEEDED") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "HUMAN_NEEDED" },
      });
    }
    log.info({ conversationId: conversation.id }, "AI disabled — waiting for human response");
  }
}

// ─── Clear debounce state for a conversation ─────────────────────────────────

function clearDebounce(conversationId: string): void {
  if (debounceTimers.has(conversationId)) {
    clearTimeout(debounceTimers.get(conversationId)!);
    debounceTimers.delete(conversationId);
  }
  pendingMessages.delete(conversationId);
  pendingContexts.delete(conversationId);
  processingLock.delete(conversationId);
}

// ─── Process accumulated debounced messages ──────────────────────────────────

async function processDebouncedMessages(
  conversationId: string,
  log: FastifyBaseLogger
): Promise<void> {
  // Drain pending messages and acquire processing lock
  const messages = pendingMessages.get(conversationId);
  const ctx = pendingContexts.get(conversationId);

  // Clean up debounce state but KEEP context (may be needed for follow-up batch)
  debounceTimers.delete(conversationId);
  pendingMessages.delete(conversationId);
  // Don't delete pendingContexts yet — new messages arriving during processing will re-set it

  if (!messages || messages.length === 0 || !ctx) {
    log.warn({ conversationId }, "Debounce fired but no pending messages — skipping");
    processingLock.delete(conversationId);
    return;
  }

  // Acquire processing lock — new messages arriving will queue instead of starting a new timer
  processingLock.set(conversationId, true);

  // Concatenate all accumulated messages
  const combinedMessage = messages.join("\n");
  log.info(
    { conversationId, messageCount: messages.length, combinedLength: combinedMessage.length },
    "Processing debounced messages as single input"
  );

  try {
    // ─── Layer 2/3: AI (Haiku → Sonnet escalation) ───────────────────────
    const limitCheck = await checkPlanLimit(ctx.tenant.id, "AI_INTERACTION", log);
    if (limitCheck.atWarning) {
      log.warn(
        { tenantId: ctx.tenant.id, percentUsed: limitCheck.percentUsed },
        `AI usage at ${limitCheck.percentUsed}% — approaching plan limit`
      );
    }
    if (limitCheck.overLimit) {
      log.warn(
        { tenantId: ctx.tenant.id, usage: limitCheck.usage, limit: limitCheck.limit },
        "AI usage OVER plan limit — continuing (overage billing)"
      );
    }

    const [clinicCtx, patientCtx, history] = await Promise.all([
      buildClinicContext(ctx.tenant.id, ctx.tenant.name, ctx.tenant.address),
      buildPatientContext(ctx.tenant.id, {
        id: ctx.patientId,
        firstName: ctx.patientFirstName,
        lastName: ctx.patientLastName,
        pipelineEntry: ctx.pipelineEntry,
      }),
      getConversationHistory(conversationId),
    ]);

    const chatbotResult = await generateChatbotResponse(
      clinicCtx,
      patientCtx,
      history,
      combinedMessage,
      ctx.tenant.botConfig
    );

    // Track AI interaction usage
    const usageCount = chatbotResult.escalatedToSonnet ? SONNET_USAGE_MULTIPLIER : 1;
    recordUsage(ctx.tenant.id, "AI_INTERACTION", usageCount, {
      conversationId,
      overLimit: limitCheck.overLimit,
      extraBlock: limitCheck.overLimit ? limitCheck.extraBlocksUsed : 0,
      escalatedToSonnet: chatbotResult.escalatedToSonnet ?? false,
      debouncedMessages: messages.length,
    }).catch(() => {});

    if (chatbotResult.escalatedToSonnet) {
      log.info({ conversationId }, "Response escalated to Sonnet (3x usage)");
    }

    // Handle tool calls
    let responseText = chatbotResult.text;
    if (chatbotResult.toolCalls.length > 0) {
      const toolResponses = await handleToolCalls(
        chatbotResult.toolCalls,
        ctx.tenant.id,
        ctx.patientId,
        conversationId,
        log
      );
      if (toolResponses.length > 0) {
        responseText = responseText
          ? `${responseText}\n\n${toolResponses.join("\n\n")}`
          : toolResponses.join("\n\n");
      }
    }

    if (!responseText) {
      log.warn({ conversationId }, "Chatbot returned empty response");
      return;
    }

    // Send the response via WhatsApp
    const waMessageId = await sendWhatsAppTextMessage({
      phoneNumberId: ctx.tenant.resolvedPhoneNumberId,
      accessToken: ctx.tenant.resolvedAccessToken,
      to: ctx.recipientPhone,
      message: responseText,
    });

    // Track outbound WhatsApp usage
    recordUsage(ctx.tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound", conversationId }).catch(() => {});

    // Save outbound message
    await prisma.message.create({
      data: {
        conversationId,
        direction: "OUTBOUND",
        type: "TEXT",
        content: responseText,
        whatsappMessageId: waMessageId,
        metadata: { sentBy: "bot", debouncedMessages: messages.length },
        sentAt: new Date(),
      },
    });

    // Update conversation preview
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: responseText.slice(0, 100),
      },
    });

    log.info({ conversationId, waMessageId, debouncedCount: messages.length }, "Bot response sent (debounced)");
  } catch (err) {
    log.error({ err, conversationId }, "Chatbot error — marking as HUMAN_NEEDED");
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "HUMAN_NEEDED" },
    });
  } finally {
    // Release processing lock
    processingLock.delete(conversationId);

    // Check if new messages arrived during processing — if so, start a short
    // debounce to catch any trailing messages, then process the new batch
    const followUpMessages = pendingMessages.get(conversationId);
    if (followUpMessages && followUpMessages.length > 0) {
      log.info(
        { conversationId, queuedCount: followUpMessages.length },
        "New messages arrived during AI processing — scheduling follow-up batch"
      );

      // Short debounce (2s) for trailing messages, then process
      const followUpDebounceMs = Math.min((ctx.tenant.messageDebounceSeconds * 1000), 2000);
      if (debounceTimers.has(conversationId)) {
        clearTimeout(debounceTimers.get(conversationId)!);
      }
      const timer = setTimeout(() => {
        processDebouncedMessages(conversationId, log).catch((err) => {
          log.error({ err, conversationId }, "Error processing follow-up debounced messages");
        });
      }, followUpDebounceMs);
      debounceTimers.set(conversationId, timer);
    } else {
      // No follow-up messages — clean up context
      pendingContexts.delete(conversationId);
    }
  }
}

// ─── Process WhatsApp status updates ──────────────────────────────────────────

export async function processStatusUpdate(
  status: StatusUpdate,
  log: FastifyBaseLogger
): Promise<void> {
  const message = await prisma.message.findFirst({
    where: { whatsappMessageId: status.waMessageId },
  });

  if (!message) {
    // Also check CampaignSend for campaign messages
    const campaignSend = await prisma.campaignSend.findFirst({
      where: { whatsappMessageId: status.waMessageId },
    });

    if (campaignSend) {
      const updateData: Record<string, unknown> = {};
      const now = new Date(status.timestamp * 1000);

      if (status.status === "sent") {
        updateData.status = "SENT";
        updateData.sentAt = now;
      } else if (status.status === "delivered") {
        updateData.status = "DELIVERED";
        updateData.deliveredAt = now;
      } else if (status.status === "read") {
        updateData.status = "READ";
        updateData.readAt = now;
      } else if (status.status === "failed") {
        updateData.status = "FAILED";
        updateData.errorMessage = status.errorTitle ?? `Error code: ${status.errorCode}`;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.campaignSend.update({
          where: { id: campaignSend.id },
          data: updateData,
        });
        log.debug({ campaignSendId: campaignSend.id, status: status.status }, "Campaign send status updated");
      }
      return;
    }

    log.debug({ waMessageId: status.waMessageId }, "Status update for unknown message — skipping");
    return;
  }

  const updateData: Record<string, Date> = {};
  const ts = new Date(status.timestamp * 1000);

  if (status.status === "delivered" && !message.deliveredAt) {
    updateData.deliveredAt = ts;
  }
  if (status.status === "read" && !message.readAt) {
    updateData.readAt = ts;
    if (!message.deliveredAt) updateData.deliveredAt = ts; // delivered implies delivered
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.message.update({
      where: { id: message.id },
      data: updateData,
    });
    log.debug({ messageId: message.id, status: status.status }, "Message status updated");
  }
}

// ─── Send outbound message from dashboard (human) via WhatsApp ────────────────

export async function sendHumanMessageViaWhatsApp(
  conversationId: string,
  content: string,
  log: FastifyBaseLogger
): Promise<string | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      tenant: {
        select: {
          id: true,
          whatsappPhoneNumberId: true,
          whatsappAccessToken: true,
          whatsappStatus: true,
        },
      },
      patient: {
        select: { phone: true },
      },
    },
  });

  if (!conversation) {
    log.warn({ conversationId }, "Cannot send WhatsApp — conversation not found");
    return null;
  }

  const { whatsappPhoneNumberId, whatsappAccessToken } = conversation.tenant;
  if (!whatsappPhoneNumberId || !whatsappAccessToken) {
    log.warn({ conversationId }, "Cannot send WhatsApp — missing credentials");
    return null;
  }

  // Decrypt token
  let plainToken: string;
  try {
    plainToken = decryptToken(whatsappAccessToken);
  } catch {
    plainToken = whatsappAccessToken; // fallback for unencrypted
  }

  try {
    const waMessageId = await sendWhatsAppTextMessage({
      phoneNumberId: whatsappPhoneNumberId,
      accessToken: plainToken,
      to: conversation.patient.phone,
      message: content,
    });

    // Track usage
    recordUsage(conversation.tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound_human", conversationId }).catch(() => {});

    log.info({ conversationId, waMessageId }, "Human message sent via WhatsApp");
    return waMessageId;
  } catch (err) {
    log.error({ err, conversationId }, "Failed to send WhatsApp message");
    return null;
  }
}
