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
  type ClinicContext,
  type PatientContext,
  type ConversationMessage,
} from "@dentalflow/ai";
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
}

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

  // 6. If AI is enabled → run chatbot
  if (conversation.aiEnabled && conversation.status !== "HUMAN_NEEDED") {
    // Ensure conversation is in AI_HANDLING status
    if (conversation.status !== "AI_HANDLING") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "AI_HANDLING" },
      });
    }

    try {
      // Check AI usage limit BEFORE calling Anthropic
      const limitCheck = await checkPlanLimit(tenant.id, "AI_INTERACTION", log);
      if (limitCheck.atWarning) {
        log.warn(
          { tenantId: tenant.id, percentUsed: limitCheck.percentUsed, usage: limitCheck.usage, limit: limitCheck.limit },
          `AI usage at ${limitCheck.percentUsed}% — tenant approaching plan limit`
        );
      }
      if (limitCheck.overLimit) {
        log.warn(
          { tenantId: tenant.id, usage: limitCheck.usage, limit: limitCheck.limit, extraBlocks: limitCheck.extraBlocksUsed, extraCost: limitCheck.extraCostUSD },
          "AI usage OVER plan limit — continuing (overage billing applies)"
        );
      }
      // NOTE: We NEVER block the chatbot response — patients must always get a reply.
      // Overage is tracked and billed separately.

      const [clinicCtx, patientCtx, history] = await Promise.all([
        buildClinicContext(tenant.id, tenant.name, tenant.address),
        buildPatientContext(tenant.id, {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          pipelineEntry: patient.pipelineEntry,
        }),
        getConversationHistory(conversation.id),
      ]);

      const chatbotResult = await generateChatbotResponse(
        clinicCtx,
        patientCtx,
        history,
        messageContent
      );

      // Track AI interaction usage AFTER successful call
      recordUsage(tenant.id, "AI_INTERACTION", 1, {
        conversationId: conversation.id,
        overLimit: limitCheck.overLimit,
        extraBlock: limitCheck.overLimit ? limitCheck.extraBlocksUsed : 0,
      }).catch(() => {});

      // Handle tool calls first
      let responseText = chatbotResult.text;
      if (chatbotResult.toolCalls.length > 0) {
        const toolResponses = await handleToolCalls(
          chatbotResult.toolCalls,
          tenant.id,
          patient.id,
          conversation.id,
          log
        );
        // If chatbot gave text + tool calls, append tool responses
        // If chatbot only gave tool calls, use tool responses as the text
        if (toolResponses.length > 0) {
          responseText = responseText
            ? `${responseText}\n\n${toolResponses.join("\n\n")}`
            : toolResponses.join("\n\n");
        }
      }

      if (!responseText) {
        log.warn({ conversationId: conversation.id }, "Chatbot returned empty response");
        return;
      }

      // Send the response via WhatsApp
      const waMessageId = await sendWhatsAppTextMessage({
        phoneNumberId: tenant.resolvedPhoneNumberId,
        accessToken: tenant.resolvedAccessToken,
        to: msg.from,
        message: responseText,
      });

      // Track outbound WhatsApp message usage
      recordUsage(tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound", conversationId: conversation.id }).catch(() => {});

      // Save outbound message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          type: "TEXT",
          content: responseText,
          whatsappMessageId: waMessageId,
          metadata: { sentBy: "bot" },
          sentAt: new Date(),
        },
      });

      // Update conversation preview
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: responseText.slice(0, 100),
        },
      });

      log.info(
        { conversationId: conversation.id, waMessageId },
        "Bot response sent"
      );
    } catch (err) {
      log.error({ err, conversationId: conversation.id }, "Chatbot error — marking as HUMAN_NEEDED");
      // On chatbot error, mark conversation as needing human attention
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "HUMAN_NEEDED" },
      });
    }
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
