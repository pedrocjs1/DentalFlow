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

import { prisma } from "@dentiqa/db";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplate,
  sendWhatsAppInteractiveButtons,
  markWhatsAppMessageAsRead,
  type IncomingMessage,
  type StatusUpdate,
} from "@dentiqa/messaging";
import {
  generateChatbotResponse,
  routeIntent,
  type BotConfig,
  type ClinicContext,
  type PatientContext,
  type ConversationMessage,
} from "@dentiqa/ai";
import { SONNET_USAGE_MULTIPLIER } from "@dentiqa/shared";
import { recordUsage, checkPlanLimit } from "./usage-tracker.js";
import { createNotification } from "./notifications.js";
import { decryptToken } from "./encryption.js";
import { sanitizeForLLM, detectPromptInjection } from "./input-sanitizer.js";
import { logSecurityEvent } from "./security-logger.js";
import type { FastifyBaseLogger } from "fastify";

// ─── Resolved tenant shape ─────────────────────────────────────────────────────

interface ResolvedTenant {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
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

// In-memory dedup: tracks recently processed waMessageIds to avoid race conditions
// where two webhook calls for the same message both pass the DB idempotency check.
const recentlyProcessedIds = new Set<string>();
const DEDUP_TTL_MS = 60_000; // Keep IDs for 60s, then clean up

// Context needed to process the debounced batch — stored when first message arrives
interface DebouncedContext {
  tenant: ResolvedTenant;
  conversationId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientEmail: string | null;
  patientBirthdate: Date | null;
  patientInsurance: string | null;
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

// ─── Sanitize text for WhatsApp formatting ───────────────────────────────────
// WhatsApp uses single asterisks for bold, single underscores for italic.
// Markdown syntax (**, __, ###, ```, - lists) must be converted or stripped.

function sanitizeForWhatsApp(text: string): string {
  return text
    // Remove slot metadata tags [2026-...] (for AI context only, not for patient)
    // Captures any bracket content starting with a 4-digit year
    .replace(/\s*\[\d{4}[^\]]*\]/g, "")
    // Replace **bold** with *bold* (WhatsApp bold)
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    // Replace __italic__ with _italic_ (WhatsApp italic)
    .replace(/__(.+?)__/g, "_$1_")
    // Remove ### headers (and ## and #)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove ``` code blocks (opening and closing)
    .replace(/```[\s\S]*?```/g, (match) => {
      // Keep the content inside, strip the backticks
      return match.replace(/```\w*\n?/g, "").trim();
    })
    // Remove inline backticks
    .replace(/`([^`]+)`/g, "$1")
    // Replace "- item" lists with "• item"
    .replace(/^- /gm, "• ")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n");
}

// ─── Timezone-aware date helper ──────────────────────────────────────────────
// The DB stores dates in UTC. Patient-facing times are in the tenant's timezone.
// This helper creates a UTC Date that represents the given local time in the tenant's timezone.
// Argentina (America/Argentina/Buenos_Aires) is always UTC-3 (no DST).

function localTimeToUTC(year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date {
  // Create a date string in ISO format as if it were UTC, then adjust for timezone offset
  const fakeUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  // Use Intl to get the actual offset for this timezone
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
    // Get what UTC time corresponds to the desired local time:
    // We want: local(result) = year-month-day hour:minute in timezone
    // Strategy: create the date as UTC, then check what local time that is,
    // and adjust by the difference.
    const parts = formatter.formatToParts(fakeUtc);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? "0");
    const localHour = getPart("hour");
    const localDay = getPart("day");
    // Offset in hours = localHour - hour (simplified, works for same-day)
    const offsetMs = ((localHour - hour) * 60 + (localDay !== day ? (localDay > day ? 24 * 60 : -24 * 60) : 0)) * 60 * 1000;
    return new Date(fakeUtc.getTime() - offsetMs);
  } catch {
    // Fallback: assume UTC-3 for Argentina
    return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0, 0));
  }
}

// Format a UTC date to the tenant's local timezone for display
function formatDateInTimezone(date: Date, timezone: string, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("es-AR", { ...options, timeZone: timezone });
}

function formatTimeInTimezone(date: Date, timezone: string): string {
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: timezone });
}

// ─── Pending booking state (in-memory, per conversation) ────────────────────
// Stores slot/dentist data between button interactions so we can resolve
// button presses without calling the AI (Layer 1, 0 tokens).

interface PendingBooking {
  treatmentType: string;
  treatmentId?: string;
  slots?: AvailableSlot[];
  selectedDentistId?: string;
  selectedDentistName?: string;
  selectedSlotIndex?: number;
  // Reschedule support
  isReschedule?: boolean;
  oldAppointmentId?: string;
  // Cancel confirmation support
  pendingCancelAppointmentId?: string;
  expiresAt: number; // timestamp ms
}
const pendingBookings = new Map<string, PendingBooking>();
const BOOKING_TTL_MS = 15 * 60 * 1000; // 15 minutes

function setPendingBooking(conversationId: string, booking: Omit<PendingBooking, "expiresAt">): void {
  pendingBookings.set(conversationId, { ...booking, expiresAt: Date.now() + BOOKING_TTL_MS });
}

function getPendingBooking(conversationId: string): PendingBooking | null {
  const booking = pendingBookings.get(conversationId);
  if (!booking || booking.expiresAt < Date.now()) {
    pendingBookings.delete(conversationId);
    return null;
  }
  return booking;
}

// ─── Registration state machine (in-memory, per conversation) ───────────────
// Tracks step-by-step data collection for new patients (Layer 1, 0 tokens).

type RegistrationStep = "fullName" | "birthDate" | "insurance" | "email" | "address" | "medicalConditions" | "allergies" | "medications" | "habits";

interface RegistrationState {
  currentStep: RegistrationStep;
  pendingSteps: RegistrationStep[];
  expiresAt: number;
}

const registrationStates = new Map<string, RegistrationState>();
const REGISTRATION_TTL_MS = 30 * 60 * 1000; // 30 min

function getRegistrationState(conversationId: string): RegistrationState | null {
  const state = registrationStates.get(conversationId);
  if (!state || state.expiresAt < Date.now()) {
    registrationStates.delete(conversationId);
    return null;
  }
  return state;
}

function buildRegistrationSteps(config: BotConfig): RegistrationStep[] {
  const steps: RegistrationStep[] = [];
  if (config.askFullName) steps.push("fullName");
  if (config.askBirthdate) steps.push("birthDate");
  if (config.askInsurance) steps.push("insurance");
  if (config.askEmail) steps.push("email");
  if (config.askAddress) steps.push("address");
  if (config.askMedicalConditions) steps.push("medicalConditions");
  if (config.askAllergies) steps.push("allergies");
  if (config.askMedications) steps.push("medications");
  if (config.askHabits) steps.push("habits");
  return steps;
}

function getQuestionForStep(step: RegistrationStep): string {
  switch (step) {
    case "fullName": return "¿Me decís tu nombre completo? (nombre y apellido)";
    case "birthDate": return "¿Cuál es tu fecha de nacimiento? (dd/mm/aaaa)";
    case "insurance": return "¿Tenés obra social o seguro dental? Si sí, ¿cuál?";
    case "email": return "¿Cuál es tu email? (para confirmaciones y recordatorios)";
    case "address": return "¿Cuál es tu dirección?";
    case "medicalConditions": return "¿Tenés alguna de estas condiciones? Diabetes, hipertensión, cardiopatía, asma, epilepsia. Podés responder *no* o decirme cuáles.";
    case "allergies": return "¿Tenés alguna alergia a medicamentos u otros? Podés responder *no* si no tenés.";
    case "medications": return "¿Tomás algún medicamento actualmente? Podés responder *no* si no tomás.";
    case "habits": return "¿Tenés alguno de estos hábitos? Bruxismo (apretás los dientes), fumador/a, embarazada. Podés responder *no*.";
  }
}

// Parse and save the patient's response for the current registration step.
// Returns error message if validation fails, null if OK.
async function processRegistrationResponse(
  step: RegistrationStep,
  text: string,
  patientId: string,
  tenantId: string,
  log: FastifyBaseLogger
): Promise<string | null> {
  const t = text.trim();

  switch (step) {
    case "fullName": {
      const parts = t.split(/\s+/);
      if (parts.length < 2 || parts[0].length < 2) {
        return "Necesito tu nombre y apellido. Por ejemplo: *Juan Pérez*";
      }
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ");
      await prisma.patient.update({
        where: { id: patientId },
        data: { firstName, lastName },
      });
      log.info({ patientId, firstName, lastName }, "Registration: name saved");
      return null;
    }

    case "birthDate": {
      let bDay = 0, bMonth = 0, bYear = 0;

      // Spanish month names → month number
      const MESES: Record<string, number> = {
        enero: 1, ene: 1, febrero: 2, feb: 2, marzo: 3, mar: 3,
        abril: 4, abr: 4, mayo: 5, may: 5, junio: 6, jun: 6,
        julio: 7, jul: 7, agosto: 8, ago: 8, septiembre: 9, sep: 9, sept: 9,
        octubre: 10, oct: 10, noviembre: 11, nov: 11, diciembre: 12, dic: 12,
      };

      // Try dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
      const numMatch = t.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
      // Try "10 de mayo de 2000", "10 de mayo del 2000"
      const textMatch = t.match(/(\d{1,2})\s+de\s+(\w+)\s+(?:de|del)\s+(\d{4})/i);
      // Try "mayo 10 2000", "may 10, 2000"
      const invertMatch = t.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
      // Try "10 mayo 2000" (without "de")
      const shortMatch = t.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);

      if (numMatch) {
        bDay = parseInt(numMatch[1]);
        bMonth = parseInt(numMatch[2]);
        bYear = parseInt(numMatch[3]);
        if (bYear < 100) bYear += bYear > 30 ? 1900 : 2000;
      } else if (textMatch) {
        bDay = parseInt(textMatch[1]);
        bMonth = MESES[textMatch[2].toLowerCase()] ?? 0;
        bYear = parseInt(textMatch[3]);
      } else if (invertMatch) {
        bMonth = MESES[invertMatch[1].toLowerCase()] ?? 0;
        bDay = parseInt(invertMatch[2]);
        bYear = parseInt(invertMatch[3]);
      } else if (shortMatch && MESES[shortMatch[2].toLowerCase()]) {
        bDay = parseInt(shortMatch[1]);
        bMonth = MESES[shortMatch[2].toLowerCase()];
        bYear = parseInt(shortMatch[3]);
      }

      if (bMonth >= 1 && bMonth <= 12 && bDay >= 1 && bDay <= 31 && bYear >= 1920 && bYear <= 2025) {
        await prisma.patient.update({
          where: { id: patientId },
          data: { birthdate: new Date(Date.UTC(bYear, bMonth - 1, bDay)) },
        });
        log.info({ patientId, birthDate: `${bYear}-${bMonth}-${bDay}` }, "Registration: birthdate saved");
        return null;
      }
      return "No pude entender la fecha. Podés escribirla como *15/05/1990* o *10 de mayo de 1990*";
    }

    case "insurance": {
      const noMatch = /^(no|no tengo|ninguno|ninguna|particular|nada|sin obra social)$/i.test(t);
      const value = noMatch ? null : t;
      await prisma.patient.update({
        where: { id: patientId },
        data: { insurance: value },
      });
      // Set a tag so we know this was answered (null = particular, vs never asked)
      if (noMatch) {
        await prisma.patient.update({
          where: { id: patientId },
          data: { insurance: "Particular" },
        });
      }
      log.info({ patientId, insurance: value ?? "Particular" }, "Registration: insurance saved");
      return null;
    }

    case "email": {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(t)) {
        return "Ese email no parece correcto. ¿Podés verificarlo? Ejemplo: *pedro@gmail.com*";
      }
      await prisma.patient.update({
        where: { id: patientId },
        data: { email: t.toLowerCase() },
      });
      log.info({ patientId, email: t.toLowerCase() }, "Registration: email saved");
      return null;
    }

    case "address": {
      if (t.length < 3) {
        return "¿Podrías darme una dirección más completa?";
      }
      await prisma.patient.update({
        where: { id: patientId },
        data: { address: t },
      });
      log.info({ patientId }, "Registration: address saved");
      return null;
    }

    case "medicalConditions": {
      const noMatch = /^(no|ninguno|ninguna|nada|no tengo)$/i.test(t);
      if (!noMatch) {
        const lower = t.toLowerCase();
        const conditions: Record<string, string> = {
          diabet: "hasDiabetes", hipertens: "hasHypertension", presion: "hasHypertension",
          cardio: "hasHeartDisease", corazon: "hasHeartDisease", asma: "hasAsthma",
          epilepsi: "hasEpilepsy", vih: "hasHIV", hiv: "hasHIV",
        };
        const updates: Record<string, boolean> = {};
        for (const [keyword, field] of Object.entries(conditions)) {
          if (lower.includes(keyword)) updates[field] = true;
        }
        if (Object.keys(updates).length > 0) {
          await prisma.medicalHistory.upsert({
            where: { patientId },
            update: updates,
            create: { patientId, tenantId, ...updates },
          });
        }
      }
      log.info({ patientId }, "Registration: medical conditions saved");
      return null;
    }

    case "allergies": {
      const noMatch = /^(no|ninguno|ninguna|nada|no tengo)$/i.test(t);
      const allergies = noMatch ? [] : [t];
      await prisma.medicalHistory.upsert({
        where: { patientId },
        update: { allergies },
        create: { patientId, tenantId, allergies },
      });
      log.info({ patientId }, "Registration: allergies saved");
      return null;
    }

    case "medications": {
      const noMatch = /^(no|ninguno|ninguna|nada|no tomo)$/i.test(t);
      const medications = noMatch ? [] : [t];
      await prisma.medicalHistory.upsert({
        where: { patientId },
        update: { medications },
        create: { patientId, tenantId, medications },
      });
      log.info({ patientId }, "Registration: medications saved");
      return null;
    }

    case "habits": {
      const noMatch = /^(no|ninguno|ninguna|nada|no tengo)$/i.test(t);
      if (!noMatch) {
        const lower = t.toLowerCase();
        const updates: Record<string, boolean> = {};
        if (/bruxis/i.test(lower) || /apret/i.test(lower) || /rechina/i.test(lower)) updates.hasBruxism = true;
        if (/fum/i.test(lower)) updates.isSmoker = true;
        if (/embaraz/i.test(lower)) updates.isPregnant = true;
        if (Object.keys(updates).length > 0) {
          await prisma.medicalHistory.upsert({
            where: { patientId },
            update: updates,
            create: { patientId, tenantId, ...updates },
          });
        }
      }
      log.info({ patientId }, "Registration: habits saved");
      return null;
    }
  }
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
      timezone: true,
      whatsappPhoneNumberId: true,
      whatsappAccessToken: true,
      welcomeMessage: true,
      botTone: true,
      botLanguage: true,
      askBirthdate: true,
      askInsurance: true,
      askEmail: true,
      offerDiscounts: true,
      maxDiscountPercent: true,
      proactiveFollowUp: true,
      leadRecontactHours: true,
      messageDebounceSeconds: true,
      registrationEnabled: true,
      askFullName: true,
      askAddress: true,
      askMedicalConditions: true,
      askAllergies: true,
      askMedications: true,
      askHabits: true,
      registrationWelcomeMessage: true,
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
    timezone: tenant.timezone,
    resolvedPhoneNumberId: tenant.whatsappPhoneNumberId,
    resolvedAccessToken: accessToken,
    botConfig: {
      botTone: tenant.botTone as BotConfig["botTone"],
      botLanguage: tenant.botLanguage as BotConfig["botLanguage"],
      welcomeMessage: tenant.welcomeMessage,
      askBirthdate: tenant.askBirthdate,
      askInsurance: tenant.askInsurance,
      askEmail: tenant.askEmail,
      offerDiscounts: tenant.offerDiscounts,
      maxDiscountPercent: tenant.maxDiscountPercent,
      proactiveFollowUp: tenant.proactiveFollowUp,
      leadRecontactHours: tenant.leadRecontactHours,
      registrationEnabled: tenant.registrationEnabled,
      askFullName: tenant.askFullName,
      askAddress: tenant.askAddress,
      askMedicalConditions: tenant.askMedicalConditions,
      askAllergies: tenant.askAllergies,
      askMedications: tenant.askMedications,
      askHabits: tenant.askHabits,
      registrationWelcomeMessage: tenant.registrationWelcomeMessage,
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
    const lastName = nameParts.slice(1).join(" ") || "";

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
    createNotification(tenantId, {
      type: "new_patient",
      title: "Nuevo paciente",
      message: `${firstName} se registró vía WhatsApp`,
      link: `/pacientes/${patient.id}`,
      metadata: { patientId: patient.id },
    }).catch(() => {});
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
    email?: string | null;
    birthdate?: Date | null;
    insurance?: string | null;
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
    hasCompleteName: !!patient.lastName && patient.lastName.trim() !== "",
    hasBirthdate: !!patient.birthdate,
    hasInsurance: !!patient.insurance,
    hasEmail: !!patient.email,
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

  // Reverse to get chronological order and filter out transfer-to-human messages
  // so Haiku doesn't see a prior escalation and decide to escalate again
  return msgs.reverse()
    .map((m) => ({
      role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }))
    .filter((m) => {
      if (m.role !== "assistant") return true;
      const lower = m.content.toLowerCase();
      return !lower.includes("comunicarte con nuestro equipo") && !lower.includes("te van a responder");
    });
}

// ─── Handle tool calls from chatbot ───────────────────────────────────────────

// ─── Tool call response types ────────────────────────────────────────────────
// Responses can be plain text or interactive buttons (WhatsApp reply buttons).

interface ToolResponseText {
  type: "text";
  text: string;
}

interface ToolResponseButtons {
  type: "buttons";
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
  // Raw text for DB (so AI can read it in conversation history)
  rawTextForHistory: string;
}

type ToolResponse = ToolResponseText | ToolResponseButtons;

async function handleToolCalls(
  toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>,
  tenantId: string,
  patientId: string,
  conversationId: string,
  timezone: string,
  log: FastifyBaseLogger
): Promise<ToolResponse[]> {
  const responses: ToolResponse[] = [];

  for (const tool of toolCalls) {
    switch (tool.toolName) {
      case "book_appointment": {
        const treatmentType = (tool.args.treatmentType as string) ?? "";
        const preferredDate = tool.args.preferredDate as string | undefined;
        const preferredTimeOfDay = tool.args.preferredTimeOfDay as string | undefined;
        const preferredDentistId = tool.args.dentistId as string | undefined;
        log.info({ patientId, treatmentType, preferredDate, preferredTimeOfDay, preferredDentistId }, "Chatbot: book_appointment tool called");

        // Check how many dentists can do this treatment
        const treatment = await prisma.treatmentType.findFirst({
          where: { tenantId, isActive: true, name: { contains: treatmentType, mode: "insensitive" } },
        });

        // Save interest treatment in pipeline (with FK if matched)
        await prisma.patientPipeline.updateMany({
          where: { patientId },
          data: {
            interestTreatment: treatmentType,
            ...(treatment ? { interestTreatmentId: treatment.id } : {}),
          },
        });

        if (!preferredDentistId && treatment) {
          const dentistsForTreatment = await prisma.dentistTreatment.findMany({
            where: { tenantId, treatmentTypeId: treatment.id },
            include: { dentist: { select: { id: true, name: true, isActive: true } } },
          });
          const activeDentists = dentistsForTreatment.filter(dt => dt.dentist.isActive);

          // If multiple dentists → ask the patient which one with buttons
          if (activeDentists.length > 1) {
            // Store booking state for button handling
            setPendingBooking(conversationId, { treatmentType, treatmentId: treatment.id });

            const dentistButtons = activeDentists.slice(0, 2).map(dt => ({
              id: `dentist_${dt.dentist.id}`,
              title: dt.dentist.name.slice(0, 20),
            }));
            dentistButtons.push({ id: "dentist_any", title: "Cualquiera" });

            const dentistNames = activeDentists.map(dt => `• ${dt.dentist.name}`).join("\n");
            responses.push({
              type: "buttons",
              bodyText: `¿Con qué profesional preferís atenderte para tu ${treatmentType}?`,
              buttons: dentistButtons,
              rawTextForHistory: `Para ${treatmentType} tenemos estos profesionales:\n${dentistNames}\n\n¿Con quién preferís atenderte?`,
            });
            break;
          }
        }

        // Find available slots with optional date/time filters + dentist filter
        const slots = await findAvailableSlots(tenantId, treatmentType, log, timezone, preferredDate, preferredTimeOfDay, preferredDentistId);

        if (slots.length === 0) {
          const noSlotsMsg = preferredDate
            ? `No encontré horarios disponibles para ${treatmentType} en esa fecha. ¿Querés que busque en otros días? 📅`
            : `No encontré horarios disponibles para ${treatmentType} en los próximos días. Voy a conectarte con el equipo para que te ayuden. 😊`;
          responses.push({ type: "text", text: noSlotsMsg });
        } else {
          // Store slots for button-based selection
          setPendingBooking(conversationId, { treatmentType, treatmentId: treatment?.id, slots });

          // Send as interactive buttons (max 3)
          const slotButtons = slots.slice(0, 3).map((s, i) => ({
            id: `slot_${i}`,
            title: `${s.date} ${s.time}`.slice(0, 20),
          }));

          // Build text with full slot details for body + history
          const slotText = slots
            .map((s, i) => {
              const isoDate = s.startTime.toISOString().split("T")[0];
              const time24 = formatTimeInTimezone(s.startTime, timezone);
              return `${i + 1}. ${s.date} a las ${s.time} con ${s.dentistName} [${isoDate} ${time24}]`;
            })
            .join("\n");

          responses.push({
            type: "buttons",
            bodyText: `Elegí el horario que te quede mejor para tu ${treatmentType}:`,
            buttons: slotButtons,
            rawTextForHistory: `Tenemos estos horarios disponibles para ${treatmentType}:\n\n${slotText}\n\n¿Cuál te queda mejor? 📅`,
          });
        }
        break;
      }

      case "confirm_appointment": {
        const confirmTreatment = (tool.args.treatmentType as string) ?? "";
        const selectedDate = tool.args.selectedDate as string | undefined;
        const selectedTime = tool.args.selectedTime as string | undefined;
        const selectedDentistName = tool.args.dentistName as string | undefined;
        log.info(
          { patientId, confirmTreatment, selectedDate, selectedTime, selectedDentistName },
          "Chatbot: confirm_appointment tool called"
        );

        if (!selectedDate || !selectedTime) {
          responses.push({ type: "text", text: "No pude identificar la fecha y hora que elegiste. ¿Podrías decirme cuál de las opciones preferís? 😊" });
          break;
        }

        try {
          // Parse the selected date/time using timezone-aware helper
          const [year, month, day] = selectedDate.split("-").map(Number);
          const [hour, minute] = selectedTime.split(":").map(Number);
          const startTime = localTimeToUTC(year, month, day, hour, minute, timezone);

          if (isNaN(startTime.getTime()) || startTime <= new Date()) {
            responses.push({ type: "text", text: "Ese horario ya no está disponible. ¿Querés que busque otros turnos? 📅" });
            break;
          }

          const confirmResult = await createAppointmentFromSlot(
            tenantId, patientId, conversationId, confirmTreatment,
            startTime, selectedDentistName, timezone, log
          );
          responses.push({ type: "text", text: confirmResult });
        } catch (err) {
          log.error({ err, patientId }, "Error creating appointment via confirm_appointment");
          responses.push({ type: "text", text: "Hubo un problema al confirmar tu cita. Dejame conectarte con el equipo para ayudarte. 😊" });
        }
        break;
      }

      case "cancel_appointment": {
        log.info({ patientId, reason: tool.args.reason }, "Chatbot: cancel_appointment tool called");
        const nextAppt = await prisma.appointment.findFirst({
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

        if (nextAppt) {
          // Show appointment details and ask for confirmation with buttons
          const cancelDate = formatDateInTimezone(nextAppt.startTime, timezone, { weekday: "long", day: "numeric", month: "long" });
          const cancelTime = formatTimeInTimezone(nextAppt.startTime, timezone);
          const cancelTreatment = nextAppt.treatmentType?.name ?? "Consulta general";

          // Store pending cancel in booking state
          setPendingBooking(conversationId, {
            treatmentType: cancelTreatment,
            pendingCancelAppointmentId: nextAppt.id,
          });

          responses.push({
            type: "buttons",
            bodyText: `Tu próxima cita es el ${cancelDate} a las ${cancelTime} con ${nextAppt.dentist.name} para ${cancelTreatment}. ¿Estás seguro de que querés cancelarla?`,
            buttons: [
              { id: "cancel_confirm", title: "Sí, cancelar" },
              { id: "cancel_keep", title: "No, mantener" },
            ],
            rawTextForHistory: `Tu próxima cita es el ${cancelDate} a las ${cancelTime} con ${nextAppt.dentist.name} para ${cancelTreatment}. ¿Querés cancelarla? Opciones: Sí cancelar / No mantener`,
          });
        } else {
          responses.push({ type: "text", text: "No tenés citas agendadas para cancelar. ¿Puedo ayudarte en algo más?" });
        }
        break;
      }

      case "reschedule_appointment": {
        const preferredDate = tool.args.preferredDate as string | undefined;
        const preferredTimeOfDay = tool.args.preferredTimeOfDay as string | undefined;
        log.info({ patientId, preferredDate, preferredTimeOfDay }, "Chatbot: reschedule_appointment tool called");

        // Find the patient's next upcoming appointment
        const currentAppt = await prisma.appointment.findFirst({
          where: {
            patientId,
            tenantId,
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { gte: new Date() },
          },
          orderBy: { startTime: "asc" },
          include: {
            dentist: { select: { id: true, name: true } },
            treatmentType: { select: { name: true } },
          },
        });

        if (!currentAppt) {
          responses.push({ type: "text", text: "No tenés citas agendadas para reagendar. ¿Querés agendar una nueva? 😊" });
          break;
        }

        const treatmentForReschedule = currentAppt.treatmentType?.name ?? "Consulta general";

        // Search for new available slots
        const rescheduleSlots = await findAvailableSlots(
          tenantId, treatmentForReschedule, log, timezone,
          preferredDate, preferredTimeOfDay, currentAppt.dentist.id
        );

        if (rescheduleSlots.length === 0) {
          // Try without dentist filter
          const anyDentistSlots = await findAvailableSlots(
            tenantId, treatmentForReschedule, log, timezone,
            preferredDate, preferredTimeOfDay
          );

          if (anyDentistSlots.length === 0) {
            const noSlotsMsg = preferredDate
              ? `No encontré horarios disponibles para reagendar en esa fecha. ¿Querés que busque en otros días? 📅`
              : `No encontré horarios disponibles para reagendar en los próximos días. Voy a conectarte con el equipo para que te ayuden. 😊`;
            responses.push({ type: "text", text: noSlotsMsg });
            break;
          }

          // Store slots with reschedule flag
          setPendingBooking(conversationId, {
            treatmentType: treatmentForReschedule,
            treatmentId: currentAppt.treatmentTypeId ?? undefined,
            slots: anyDentistSlots,
            isReschedule: true,
            oldAppointmentId: currentAppt.id,
          });

          const slotButtons = anyDentistSlots.slice(0, 3).map((s, i) => ({
            id: `slot_${i}`,
            title: `${s.date} ${s.time}`.slice(0, 20),
          }));
          const slotText = anyDentistSlots.map((s, i) => {
            const isoDate = s.startTime.toISOString().split("T")[0];
            const time24 = formatTimeInTimezone(s.startTime, timezone);
            return `${i + 1}. ${s.date} a las ${s.time} con ${s.dentistName} [${isoDate} ${time24}]`;
          }).join("\n");

          responses.push({
            type: "buttons",
            bodyText: `Elegí el nuevo horario para tu ${treatmentForReschedule}:`,
            buttons: slotButtons,
            rawTextForHistory: `Horarios disponibles para reagendar tu ${treatmentForReschedule}:\n\n${slotText}\n\n¿Cuál te queda mejor? 📅`,
          });
          break;
        }

        // Store slots with reschedule flag
        setPendingBooking(conversationId, {
          treatmentType: treatmentForReschedule,
          treatmentId: currentAppt.treatmentTypeId ?? undefined,
          slots: rescheduleSlots,
          isReschedule: true,
          oldAppointmentId: currentAppt.id,
        });

        const rescheduleSlotButtons = rescheduleSlots.slice(0, 3).map((s, i) => ({
          id: `slot_${i}`,
          title: `${s.date} ${s.time}`.slice(0, 20),
        }));
        const rescheduleSlotText = rescheduleSlots.map((s, i) => {
          const isoDate = s.startTime.toISOString().split("T")[0];
          const time24 = formatTimeInTimezone(s.startTime, timezone);
          return `${i + 1}. ${s.date} a las ${s.time} con ${s.dentistName} [${isoDate} ${time24}]`;
        }).join("\n");

        responses.push({
          type: "buttons",
          bodyText: `Elegí el nuevo horario para tu ${treatmentForReschedule}:`,
          buttons: rescheduleSlotButtons,
          rawTextForHistory: `Horarios disponibles para reagendar tu ${treatmentForReschedule}:\n\n${rescheduleSlotText}\n\n¿Cuál te queda mejor? 📅`,
        });
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
          const date = formatDateInTimezone(appt.startTime, timezone, { weekday: "long", day: "numeric", month: "long" });
          const time = formatTimeInTimezone(appt.startTime, timezone);
          responses.push({
            type: "text",
            text: `Tu próxima cita es el ${date} a las ${time} con ${appt.dentist.name}${
              appt.treatmentType ? ` para ${appt.treatmentType.name}` : ""
            }. ✅`,
          });
        } else {
          responses.push({ type: "text", text: "No tenés citas agendadas actualmente. ¿Querés agendar una? 😊" });
        }
        break;
      }

      case "transfer_to_human": {
        log.info({ patientId, reason: tool.args.reason }, "Chatbot: transfer_to_human");
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: "HUMAN_NEEDED", aiEnabled: false },
        });
        responses.push({ type: "text", text: "Dejame comunicarte con nuestro equipo para ayudarte mejor. Te van a responder a la brevedad. 😊" });
        // Notify clinic — patient needs human attention
        const patientForHuman = await prisma.patient.findUnique({ where: { id: patientId }, select: { firstName: true, lastName: true } });
        createNotification(tenantId, {
          type: "human_needed",
          title: "Paciente necesita atención",
          message: `${patientForHuman?.firstName ?? ""} ${patientForHuman?.lastName ?? ""} pidió hablar con un humano`,
          link: "/conversaciones",
          metadata: { patientId, conversationId, reason: tool.args.reason },
        }).catch(() => {});
        break;
      }

      case "update_patient_data": {
        log.info({ patientId, args: tool.args }, "Chatbot: update_patient_data tool called");
        const updateData: Record<string, unknown> = {};
        if (tool.args.firstName) updateData.firstName = tool.args.firstName as string;
        if (tool.args.lastName) updateData.lastName = tool.args.lastName as string;
        if (tool.args.email) updateData.email = tool.args.email as string;
        if (tool.args.insurance) updateData.insurance = tool.args.insurance as string;
        if (tool.args.birthDate) {
          const bd = tool.args.birthDate as string;
          const [by, bm, bd2] = bd.split("-").map(Number);
          if (by && bm && bd2) updateData.birthdate = new Date(Date.UTC(by, bm - 1, bd2));
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.patient.update({
            where: { id: patientId },
            data: updateData,
          });
          log.info({ patientId, updatedFields: Object.keys(updateData) }, "Patient data updated via chatbot");
        }
        // No response text needed — the chatbot will continue the conversation naturally
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

// ─── Create appointment from confirmed slot (shared by tool + button handlers) ─

async function createAppointmentFromSlot(
  tenantId: string,
  patientId: string,
  conversationId: string,
  treatmentName: string,
  startTime: Date,
  dentistName: string | undefined,
  timezone: string,
  log: FastifyBaseLogger
): Promise<string> {
  const treatment = await prisma.treatmentType.findFirst({
    where: { tenantId, isActive: true, name: { contains: treatmentName, mode: "insensitive" } },
  });
  const durationMin = treatment?.durationMin ?? 30;

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMin);

  // Find dentist
  let dentist = null;
  if (dentistName) {
    dentist = await prisma.dentist.findFirst({
      where: { tenantId, isActive: true, name: { contains: dentistName, mode: "insensitive" } },
    });
  }
  if (!dentist && treatment) {
    const dt = await prisma.dentistTreatment.findFirst({
      where: { tenantId, treatmentTypeId: treatment.id },
      include: { dentist: true },
    });
    dentist = dt?.dentist ?? null;
  }
  if (!dentist) {
    dentist = await prisma.dentist.findFirst({ where: { tenantId, isActive: true } });
  }
  if (!dentist) {
    return "No encontré un profesional disponible. Dejame conectarte con el equipo para confirmar tu turno. 😊";
  }

  // Check for conflicts
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId,
      dentistId: dentist.id,
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  if (conflict) {
    return "Ese horario acaba de ser reservado por otro paciente. ¿Querés que busque otros turnos disponibles? 📅";
  }

  // Create the appointment
  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      patientId,
      dentistId: dentist.id,
      treatmentTypeId: treatment?.id,
      startTime,
      endTime,
      status: "CONFIRMED",
      source: "CHATBOT",
      confirmedAt: new Date(),
      conversationId,
      notes: `Agendado vía WhatsApp chatbot. Tratamiento: ${treatmentName}`,
    },
  });

  // Create Google Calendar event if dentist has GCal connected
  const dentistGcalToken = await prisma.googleCalendarToken.findFirst({
    where: { dentistId: dentist.id, tenantId, syncEnabled: true },
  });
  if (dentistGcalToken) {
    try {
      const { createCalendarEvent } = await import("./google-calendar.js");
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { firstName: true, lastName: true, phone: true },
      });
      const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "Paciente";
      const gcalEventId = await createCalendarEvent({
        accessToken: dentistGcalToken.accessToken,
        refreshToken: dentistGcalToken.refreshToken,
        calendarId: dentistGcalToken.calendarId,
        summary: `🦷 ${treatment?.name ?? treatmentName} - ${patientName}`,
        description: `Paciente: ${patientName}\nTeléfono: ${patient?.phone ?? ""}\nTratamiento: ${treatment?.name ?? treatmentName}\nAgendado vía WhatsApp chatbot`,
        startTime,
        endTime,
        timezone,
      });
      if (gcalEventId) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { googleEventId: gcalEventId },
        });
        log.info({ appointmentId: appointment.id, gcalEventId }, "GCal event created for chatbot appointment");
      }
    } catch (e) {
      log.warn({ err: e, appointmentId: appointment.id }, "Failed to create GCal event — appointment still valid");
    }
  }

  // Move patient in pipeline + save interest treatment
  await movePipelineToStage(tenantId, patientId, "Primera Cita Agendada", log);
  const matchedTreatment = treatmentName
    ? await prisma.treatmentType.findFirst({
        where: { tenantId, isActive: true, name: { contains: treatmentName, mode: "insensitive" } },
        select: { id: true },
      })
    : null;
  await prisma.patientPipeline.updateMany({
    where: { patientId },
    data: {
      interestTreatment: treatmentName,
      ...(matchedTreatment ? { interestTreatmentId: matchedTreatment.id } : {}),
    },
  });

  // Get clinic address
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { address: true },
  });

  const dateFormatted = formatDateInTimezone(startTime, timezone, { weekday: "long", day: "numeric", month: "long" });
  const timeFormatted = formatTimeInTimezone(startTime, timezone);

  let confirmMsg = `*¡Listo, tu cita está confirmada!* ✅\n\n`;
  confirmMsg += `📅 *Fecha:* ${dateFormatted}\n`;
  confirmMsg += `🕐 *Hora:* ${timeFormatted}\n`;
  confirmMsg += `👨‍⚕️ *Profesional:* ${dentist.name}\n`;
  confirmMsg += `🦷 *Tratamiento:* ${treatment?.name ?? treatmentName}`;
  if (tenant?.address) {
    confirmMsg += `\n📍 *Dirección:* ${tenant.address}`;
  }
  confirmMsg += `\n\nTe esperamos. Si necesitás cancelar o reagendar, avisame por acá. 😊`;

  log.info(
    { appointmentId: appointment.id, patientId, dentistId: dentist.id, startTime: startTime.toISOString() },
    "Appointment created via chatbot"
  );

  // Notification for new appointment
  const patientForNotif = await prisma.patient.findUnique({ where: { id: patientId }, select: { firstName: true, lastName: true } });
  createNotification(tenantId, {
    type: "new_appointment",
    title: "Nueva cita agendada",
    message: `${patientForNotif?.firstName ?? ""} ${patientForNotif?.lastName ?? ""} — ${treatment?.name ?? treatmentName} el ${formatDateInTimezone(startTime, timezone, { day: "numeric", month: "short" })}`,
    link: "/agenda",
    metadata: { appointmentId: appointment.id, patientId },
  }).catch(() => {});

  // Clean up pending booking
  pendingBookings.delete(conversationId);

  return confirmMsg;
}

// ─── Find available appointment slots ────────────────────────────────────────

async function findAvailableSlots(
  tenantId: string,
  treatmentName: string,
  log: FastifyBaseLogger,
  timezone: string,
  preferredDate?: string,
  preferredTimeOfDay?: string,
  dentistIdFilter?: string
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
  if (dentistIdFilter) {
    // Specific dentist requested (from button selection)
    dentistIds = [dentistIdFilter];
  } else if (treatment) {
    const dentistTreatments = await prisma.dentistTreatment.findMany({
      where: { tenantId, treatmentTypeId: treatment.id },
      select: { dentistId: true },
    });
    if (dentistTreatments.length > 0) {
      dentistIds = dentistTreatments.map((dt) => dt.dentistId);
    }
  }

  // Fetch dentists with their own working hours + GCal tokens
  const dentists = await prisma.dentist.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(dentistIds ? { id: { in: dentistIds } } : {}),
    },
    include: {
      workingHours: { where: { isActive: true } },
      googleCalendarToken: true,
    },
  });

  if (dentists.length === 0) return [];

  // Fallback: if dentists don't have their own working hours,
  // use the clinic-wide WorkingHours from the tenant
  const tenantWorkingHours = await prisma.workingHours.findMany({
    where: { tenantId, isActive: true },
  });

  const slots: AvailableSlot[] = [];
  const now = new Date();

  // Pre-fetch Google Calendar blocked slots for dentists that have GCal connected
  // Cache per dentist to avoid repeated API calls
  const gcalBlockedCache = new Map<string, Array<{ start: Date; end: Date }>>();
  for (const dentist of dentists) {
    if (dentist.googleCalendarToken?.syncEnabled) {
      try {
        const { getBlockedSlots: getGCalBlockedSlots } = await import("./google-calendar.js");
        // Fetch blocked slots for the next 14 days
        const searchEnd = new Date(now);
        searchEnd.setDate(searchEnd.getDate() + 15);
        const blocked = await getGCalBlockedSlots({
          accessToken: dentist.googleCalendarToken.accessToken,
          refreshToken: dentist.googleCalendarToken.refreshToken,
          calendarId: dentist.googleCalendarToken.calendarId,
          timeMin: now,
          timeMax: searchEnd,
        });
        gcalBlockedCache.set(dentist.id, blocked);
        log.info({ dentistId: dentist.id, blockedCount: blocked.length }, "GCal blocked slots fetched");
      } catch (e) {
        log.warn({ err: e, dentistId: dentist.id }, "Failed to fetch GCal blocked slots — ignoring");
      }
    }
  }

  // Determine time-of-day filter boundaries
  let timeFilterStartHour = 0;
  let timeFilterEndHour = 24;
  if (preferredTimeOfDay === "morning") {
    timeFilterStartHour = 8;
    timeFilterEndHour = 13; // 8:00 - 12:59
  } else if (preferredTimeOfDay === "afternoon") {
    timeFilterStartHour = 13;
    timeFilterEndHour = 18; // 13:00 - 18:00
  }

  // Determine date range to search
  let searchStartDate: Date;
  let maxDaysToSearch: number;
  // When a specific date is requested, show up to 5 slots; otherwise 3
  let maxSlots: number;

  if (preferredDate) {
    // Parse the preferred date
    const [year, month, day] = preferredDate.split("-").map(Number);
    searchStartDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Validate the date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (searchStartDate < today) {
      log.info({ preferredDate }, "Preferred date is in the past — returning empty");
      return [];
    }

    // Search the requested day + 2 more days if nothing found on that day
    maxDaysToSearch = 3;
    maxSlots = 5;
    log.info({ preferredDate, preferredTimeOfDay }, "Searching slots for specific date");
  } else {
    searchStartDate = now;
    maxDaysToSearch = 14;
    maxSlots = 3;
  }

  log.info(
    { treatmentName, preferredDate, preferredTimeOfDay, dentistIdFilter, maxSlots, maxDaysToSearch, serverNow: now.toISOString() },
    "findAvailableSlots: searching"
  );

  for (let dayOffset = 0; dayOffset < maxDaysToSearch && slots.length < maxSlots; dayOffset++) {
    const date = new Date(searchStartDate);
    date.setDate(date.getDate() + dayOffset);
    const dow = date.getDay(); // 0=Sun

    for (const dentist of dentists) {
      if (slots.length >= maxSlots) break;

      // Use dentist's own hours if available, otherwise fall back to clinic hours
      const wh = dentist.workingHours.find((h) => h.dayOfWeek === dow)
        ?? tenantWorkingHours.find((h) => h.dayOfWeek === dow);
      if (!wh) continue;

      const [startH, startM] = wh.startTime.split(":").map(Number);
      const [endH, endM] = wh.endTime.split(":").map(Number);

      // Apply time-of-day filter: effective range is intersection of working hours and filter
      const effectiveStartH = Math.max(startH, timeFilterStartHour);
      const effectiveEndH = Math.min(endH, timeFilterEndHour);
      if (effectiveStartH >= effectiveEndH) continue;

      // Try hourly slots within the effective range
      for (let hour = effectiveStartH; hour < effectiveEndH && slots.length < maxSlots; hour++) {
        const slotMinute = hour === startH ? startM : 0;
        // Create timezone-aware UTC date for this slot's local time
        const slotStart = localTimeToUTC(
          date.getFullYear(), date.getMonth() + 1, date.getDate(),
          hour, slotMinute, timezone
        );

        // Skip past slots
        if (slotStart <= now) continue;

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMin);

        // Check slot doesn't exceed working hours (in local time terms)
        const endMinutes = endH * 60 + endM;
        const slotEndLocalMinutes = (hour * 60 + slotMinute) + durationMin;
        if (slotEndLocalMinutes > endMinutes) continue;

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
          // Check Google Calendar blocked slots for this dentist
          const gcalBlocked = gcalBlockedCache.get(dentist.id);
          const gcalConflict = gcalBlocked?.some(
            (b) => b.start < slotEnd && b.end > slotStart
          );
          if (gcalConflict) continue;

          slots.push({
            date: formatDateInTimezone(slotStart, timezone, {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
            time: formatTimeInTimezone(slotStart, timezone),
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
  // In-memory dedup catches race conditions where two webhook calls arrive simultaneously
  if (recentlyProcessedIds.has(msg.waMessageId)) {
    log.debug({ waMessageId: msg.waMessageId }, "Duplicate message (in-memory dedup) — skipping");
    return;
  }
  const existingMsg = await prisma.message.findFirst({
    where: { whatsappMessageId: msg.waMessageId },
  });
  if (existingMsg) {
    log.debug({ waMessageId: msg.waMessageId }, "Duplicate message — skipping");
    return;
  }
  // Mark as processed immediately to prevent race with parallel webhook calls
  recentlyProcessedIds.add(msg.waMessageId);
  setTimeout(() => recentlyProcessedIds.delete(msg.waMessageId), DEDUP_TTL_MS);

  // 3. Find or create patient
  const patient = await findOrCreatePatient(tenant.id, msg.from, msg.profileName, log);

  // 3b. Re-engagement: if patient is in a "cold" stage, move back to first stage
  if (patient.pipelineEntry?.stage) {
    const coldStageNames = ["interesado - no agendó", "remarketing", "inactivo"];
    const currentStageName = patient.pipelineEntry.stage.name.toLowerCase();
    if (coldStageNames.some((s) => currentStageName.includes(s))) {
      const firstStage = await prisma.pipelineStage.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { order: "asc" },
      });
      if (firstStage && firstStage.id !== patient.pipelineEntry.stage.id) {
        await prisma.patientPipeline.update({
          where: { patientId: patient.id },
          data: {
            stageId: firstStage.id,
            movedAt: new Date(),
            lastAutoMessageSentAt: null,
            autoMessageAttempts: 0,
          },
        });
        log.info(
          { patientId: patient.id, from: currentStageName, to: firstStage.name },
          "Re-engagement: patient moved back to Nuevo Contacto"
        );
      }
    }
  }

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

  // Update conversation — track last patient message for 24h window
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: now,
      lastMessagePreview: messageContent.slice(0, 100),
      lastPatientMessageAt: now,
      // If conversation was closed, reopen it (and clear pause tracker)
      ...(conversation.status === "CLOSED" ? { status: "AI_HANDLING", aiEnabled: true, aiPausedAt: null } : {}),
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

  // 5b. Registration — first contact detection (immediate welcome, no debounce)
  // If patient is NEW (no lastName) and registration is enabled, start registration.
  // The welcome message is sent immediately. Subsequent registration steps go through debounce.
  if (
    msg.type === "text" &&
    conversation.aiEnabled &&
    conversation.status !== "HUMAN_NEEDED" &&
    tenant.botConfig.registrationEnabled
  ) {
    const isNewPatient = !patient.lastName || patient.lastName.trim() === "";
    const existingRegState = getRegistrationState(conversation.id);

    if (!existingRegState && isNewPatient) {
      // Check for urgent intents first
      const urgentCheck = routeIntent(messageContent, tenant.botConfig.botLanguage);
      if (!(urgentCheck.intent === "FRUSTRATION" || (urgentCheck.intent === "HUMAN" && urgentCheck.confidence === "high"))) {
        // First contact — send welcome + first question immediately
        const steps = buildRegistrationSteps(tenant.botConfig);
        if (steps.length > 0) {
          const state: RegistrationState = {
            currentStep: steps[0],
            pendingSteps: steps.slice(1),
            expiresAt: Date.now() + REGISTRATION_TTL_MS,
          };
          registrationStates.set(conversation.id, state);

          const clinicName = tenant.name;
          const welcomeMsg = tenant.botConfig.registrationWelcomeMessage
            ?? `¡Hola! Bienvenido/a a *${clinicName.trim()}*. 😊`;
          const question = getQuestionForStep(state.currentStep);
          const fullMsg = `${welcomeMsg}\n\nPara brindarte la mejor atención, necesito registrarte. Es rápido.\n\n${question}`;

          const waRegMsgId = await sendWhatsAppTextMessage({
            phoneNumberId: tenant.resolvedPhoneNumberId,
            accessToken: tenant.resolvedAccessToken,
            to: msg.from,
            message: sanitizeForWhatsApp(fullMsg),
          });
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: "OUTBOUND",
              type: "TEXT",
              content: fullMsg,
              whatsappMessageId: waRegMsgId,
              metadata: { sentBy: "bot", registrationStep: state.currentStep },
              sentAt: new Date(),
            },
          });
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date(), lastMessagePreview: sanitizeForWhatsApp(fullMsg).slice(0, 100) },
          });
          recordUsage(tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound", conversationId: conversation.id }).catch(() => {});
          log.info({ conversationId: conversation.id, step: state.currentStep }, "Registration started for new patient");
          return;
        }
      }
    }
    // If existingRegState → fall through to debounce. Registration responses will be
    // processed in processDebouncedMessages after the debounce timer fires.
    // This ensures "Pedro" + "Vega" sent 3s apart get concatenated as "Pedro Vega".
  }

  // 6. Handle audio messages — reply with a fixed text (0 tokens, 0 cost)
  // WhatsApp sends voice notes as type "audio"
  if (msg.type === "audio") {
    log.info({ conversationId: conversation.id, type: msg.type }, "Audio message received — sending text-only notice");

    if (conversation.aiEnabled && conversation.status !== "HUMAN_NEEDED") {
      const audioReply = sanitizeForWhatsApp(AUDIO_REPLIES[tenant.botConfig.botLanguage] ?? AUDIO_REPLIES.es);
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

  // 6b. Handle interactive button replies (Layer 1, 0 tokens)
  // Button presses arrive as type "interactive" with interactiveReplyId
  if (msg.interactiveReplyId && conversation.aiEnabled && conversation.status !== "HUMAN_NEEDED") {
    const replyId = msg.interactiveReplyId;
    log.info({ conversationId: conversation.id, replyId }, "Button reply received — processing in Layer 1");

    const booking = getPendingBooking(conversation.id);
    let responseText: string | null = null;
    let responseButtons: Array<{ id: string; title: string }> | null = null;
    let responseBodyForButtons: string | null = null;
    let rawContentForDb: string | null = null; // Full text for AI history (may differ from button body)

    // ─── Dentist selection button ─────────────────────────────────────
    if (replyId.startsWith("dentist_") && booking) {
      const dentistId = replyId === "dentist_any" ? undefined : replyId.replace("dentist_", "");
      log.info({ conversationId: conversation.id, dentistId }, "Dentist selected via button");

      const slots = await findAvailableSlots(
        tenant.id, booking.treatmentType, log, tenant.timezone,
        undefined, undefined, dentistId
      );

      if (slots.length === 0) {
        responseText = "No encontré horarios disponibles con ese profesional. ¿Querés que busque con otro? 📅";
      } else {
        setPendingBooking(conversation.id, {
          ...booking,
          slots,
          selectedDentistId: dentistId,
          selectedDentistName: dentistId ? slots[0]?.dentistName : undefined,
        });
        const slotButtons = slots.slice(0, 3).map((s, i) => ({
          id: `slot_${i}`,
          title: `${s.date} ${s.time}`.slice(0, 20),
        }));
        const slotText = slots.map((s, i) => {
          const isoDate = s.startTime.toISOString().split("T")[0];
          const time24 = formatTimeInTimezone(s.startTime, tenant.timezone);
          return `${i + 1}. ${s.date} a las ${s.time} con ${s.dentistName} [${isoDate} ${time24}]`;
        }).join("\n");
        responseBodyForButtons = `Elegí el horario que te quede mejor para tu ${booking.treatmentType}:`;
        responseButtons = slotButtons;
        // Save full slot list for AI conversation history
        rawContentForDb = `Horarios disponibles para ${booking.treatmentType}:\n\n${slotText}\n\n¿Cuál te queda mejor?`;
      }
    }
    // ─── Slot selection button ────────────────────────────────────────
    else if (replyId.startsWith("slot_") && booking?.slots) {
      const slotIndex = parseInt(replyId.replace("slot_", ""));
      const selectedSlot = booking.slots[slotIndex];
      if (selectedSlot) {
        log.info({ conversationId: conversation.id, slotIndex, startTime: selectedSlot.startTime.toISOString(), isReschedule: !!booking.isReschedule }, "Slot selected via button");

        // If this is a reschedule → cancel the old appointment first
        if (booking.isReschedule && booking.oldAppointmentId) {
          const oldAppt = await prisma.appointment.findFirst({
            where: { id: booking.oldAppointmentId, tenantId: tenant.id },
            include: { dentist: { select: { googleCalendarToken: true } } },
          });
          if (oldAppt) {
            await prisma.appointment.update({
              where: { id: oldAppt.id },
              data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelReason: "Reagendada por paciente vía WhatsApp",
              },
            });
            // Delete old GCal event if exists
            if (oldAppt.googleEventId && oldAppt.dentist?.googleCalendarToken) {
              const gcalToken = oldAppt.dentist.googleCalendarToken as unknown as { accessToken: string; refreshToken: string; calendarId: string };
              try {
                const { deleteCalendarEvent } = await import("./google-calendar.js");
                await deleteCalendarEvent({
                  accessToken: gcalToken.accessToken,
                  refreshToken: gcalToken.refreshToken,
                  calendarId: gcalToken.calendarId,
                  eventId: oldAppt.googleEventId,
                });
              } catch (e) { log.warn({ err: e }, "Failed to delete old GCal event on reschedule"); }
            }
            log.info({ oldAppointmentId: oldAppt.id }, "Old appointment cancelled for reschedule");
          }
        }

        // Create the new appointment
        responseText = await createAppointmentFromSlot(
          tenant.id, patient.id, conversation.id, booking.treatmentType,
          selectedSlot.startTime, selectedSlot.dentistName, tenant.timezone, log
        );

        // For reschedule, customize the message and DON'T move pipeline down
        if (booking.isReschedule) {
          // Replace "¡Listo, tu cita está confirmada!" with reschedule wording
          responseText = responseText.replace(
            "*¡Listo, tu cita está confirmada!* ✅",
            "*¡Listo, tu cita fue reagendada!* ✅"
          );
        }
      } else {
        responseText = "No pude identificar el horario. ¿Podrías escribirme cuál preferís? 😊";
      }
    }
    // ─── Cancel confirmation button ──────────────────────────────────
    else if (replyId === "cancel_confirm" && booking?.pendingCancelAppointmentId) {
      log.info({ conversationId: conversation.id, appointmentId: booking.pendingCancelAppointmentId }, "Cancel confirmed via button");

      const cancelAppt = await prisma.appointment.findFirst({
        where: { id: booking.pendingCancelAppointmentId, tenantId: tenant.id },
        include: { dentist: { select: { googleCalendarToken: true } } },
      });

      if (cancelAppt) {
        await prisma.appointment.update({
          where: { id: cancelAppt.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "Cancelada por paciente vía WhatsApp",
          },
        });
        await movePipelineToStage(tenant.id, patient.id, "Interesado - No Agendó", log);

        // Delete GCal event if exists
        if (cancelAppt.googleEventId && cancelAppt.dentist?.googleCalendarToken) {
          const gcalToken = cancelAppt.dentist.googleCalendarToken as unknown as { accessToken: string; refreshToken: string; calendarId: string };
          try {
            const { deleteCalendarEvent } = await import("./google-calendar.js");
            await deleteCalendarEvent({
              accessToken: gcalToken.accessToken,
              refreshToken: gcalToken.refreshToken,
              calendarId: gcalToken.calendarId,
              eventId: cancelAppt.googleEventId,
            });
          } catch (e) { log.warn({ err: e }, "Failed to delete GCal event on cancel"); }
        }

        responseText = "Tu cita fue cancelada. Si querés agendar otra, avisame. 😊";
        createNotification(tenant.id, {
          type: "cancelled_appointment",
          title: "Cita cancelada",
          message: `${patient.firstName} ${patient.lastName} canceló su cita`,
          link: "/agenda",
          metadata: { patientId: patient.id },
        }).catch(() => {});
        pendingBookings.delete(conversation.id);
      } else {
        responseText = "No encontré la cita para cancelar. ¿Puedo ayudarte en algo más?";
      }
    }
    else if (replyId === "cancel_keep") {
      log.info({ conversationId: conversation.id }, "Cancel cancelled — keeping appointment");
      responseText = "Perfecto, tu cita sigue en pie. ✅ ¿Puedo ayudarte en algo más?";
      pendingBookings.delete(conversation.id);
    }

    // Send the response
    if (responseText || responseButtons) {
      let waReplyMsgId: string;
      const rawContent = rawContentForDb ?? responseBodyForButtons ?? responseText ?? "";

      if (responseButtons && responseBodyForButtons) {
        waReplyMsgId = await sendWhatsAppInteractiveButtons({
          phoneNumberId: tenant.resolvedPhoneNumberId,
          accessToken: tenant.resolvedAccessToken,
          to: msg.from,
          bodyText: sanitizeForWhatsApp(responseBodyForButtons),
          buttons: responseButtons,
        });
      } else {
        waReplyMsgId = await sendWhatsAppTextMessage({
          phoneNumberId: tenant.resolvedPhoneNumberId,
          accessToken: tenant.resolvedAccessToken,
          to: msg.from,
          message: sanitizeForWhatsApp(responseText!),
        });
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          type: responseButtons ? "INTERACTIVE" : "TEXT",
          content: rawContent,
          whatsappMessageId: waReplyMsgId,
          metadata: { sentBy: "bot", buttonReply: replyId },
          sentAt: new Date(),
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastMessagePreview: sanitizeForWhatsApp(rawContent).slice(0, 100) },
      });
      recordUsage(tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound", conversationId: conversation.id }).catch(() => {});
      log.info({ conversationId: conversation.id, replyId }, "Button reply handled (Layer 1, 0 tokens)");
      return; // Handled without AI
    }
    // If we couldn't handle the button, fall through to AI
    log.info({ conversationId: conversation.id, replyId }, "Button reply not resolved in Layer 1 — passing to AI");
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
      const transferMsg = sanitizeForWhatsApp(transferMsgs[intentKey][tenant.botConfig.botLanguage] ?? transferMsgs[intentKey].es);

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
      patientEmail: patient.email ?? null,
      patientBirthdate: patient.birthdate ?? null,
      patientInsurance: patient.insurance ?? null,
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

  // Concatenate all accumulated messages and sanitize for LLM
  const rawMessage = messages.join("\n");
  const combinedMessage = sanitizeForLLM(rawMessage);
  log.info(
    { conversationId, messageCount: messages.length, combinedLength: combinedMessage.length },
    "Processing debounced messages as single input"
  );

  // Detect prompt injection attempts
  if (detectPromptInjection(rawMessage)) {
    log.warn({ conversationId }, "Possible prompt injection attempt detected");
    logSecurityEvent({
      type: "PROMPT_INJECTION_ATTEMPT",
      tenantId: ctx.tenant.id,
      details: `Conversation ${conversationId}: ${rawMessage.slice(0, 200)}`,
      severity: "HIGH",
    }).catch(() => {});
  }

  try {
    // ─── Registration flow (Layer 1, 0 tokens) ──────────────────────────
    // If patient is in registration mode, process their response here (after debounce)
    const regState = getRegistrationState(conversationId);
    if (regState) {
      // Check for urgent intents that should bypass registration
      const urgentCheck = routeIntent(combinedMessage, ctx.tenant.botConfig.botLanguage);
      if (urgentCheck.intent === "FRUSTRATION" || (urgentCheck.intent === "HUMAN" && urgentCheck.confidence === "high")) {
        registrationStates.delete(conversationId);
        log.info({ conversationId }, "Registration interrupted by urgent intent — passing to AI");
        // Fall through to normal AI flow below
      } else {
        const error = await processRegistrationResponse(
          regState.currentStep,
          combinedMessage,
          ctx.patientId,
          ctx.tenant.id,
          log
        );

        let replyMsg: string;
        if (error) {
          replyMsg = error;
        } else if (regState.pendingSteps.length > 0) {
          const nextStep = regState.pendingSteps[0];
          regState.currentStep = nextStep;
          regState.pendingSteps = regState.pendingSteps.slice(1);
          regState.expiresAt = Date.now() + REGISTRATION_TTL_MS;
          replyMsg = getQuestionForStep(nextStep);
        } else {
          registrationStates.delete(conversationId);
          const updatedPatient = await prisma.patient.findUnique({
            where: { id: ctx.patientId },
            select: { firstName: true },
          });
          const name = updatedPatient?.firstName ?? ctx.patientFirstName;
          replyMsg = `*¡Listo, ${name}!* Ya quedaste registrado/a. 😊\n\n¿En qué puedo ayudarte?`;
          log.info({ conversationId, patientId: ctx.patientId }, "Registration complete");
        }

        const waStepMsgId = await sendWhatsAppTextMessage({
          phoneNumberId: ctx.tenant.resolvedPhoneNumberId,
          accessToken: ctx.tenant.resolvedAccessToken,
          to: ctx.recipientPhone,
          message: sanitizeForWhatsApp(replyMsg),
        });
        await prisma.message.create({
          data: {
            conversationId,
            direction: "OUTBOUND",
            type: "TEXT",
            content: replyMsg,
            whatsappMessageId: waStepMsgId,
            metadata: { sentBy: "bot", registrationStep: regState.currentStep ?? "complete" },
            sentAt: new Date(),
          },
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date(), lastMessagePreview: sanitizeForWhatsApp(replyMsg).slice(0, 100) },
        });
        recordUsage(ctx.tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound", conversationId }).catch(() => {});
        log.info({ conversationId, debouncedCount: messages.length }, "Registration step processed (debounced)");
        return; // Registration handled — don't proceed to AI
      }
    }

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
        email: ctx.patientEmail,
        birthdate: ctx.patientBirthdate,
        insurance: ctx.patientInsurance,
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
    // Handle tool calls — tool responses take priority over AI-generated text
    let toolResponses: ToolResponse[] = [];
    if (chatbotResult.toolCalls.length > 0) {
      log.info({ conversationId, toolCount: chatbotResult.toolCalls.length, hasAiText: !!chatbotResult.text }, "Processing tool calls");
      toolResponses = await handleToolCalls(
        chatbotResult.toolCalls,
        ctx.tenant.id,
        ctx.patientId,
        conversationId,
        ctx.tenant.timezone,
        log
      );
    }

    // Determine what to send: tool response takes priority over AI text
    let waMessageId: string;
    let rawForDb: string;
    let previewText: string;

    const buttonResponse = toolResponses.find((r): r is ToolResponseButtons => r.type === "buttons");
    const textResponses = toolResponses.filter((r): r is ToolResponseText => r.type === "text");

    // IMPORTANT: Only ONE branch executes — buttons OR text OR AI text. Never two sends.
    if (buttonResponse) {
      // Send ONLY interactive buttons — discard any AI text to avoid duplicate messages
      log.info({ conversationId, responseType: "buttons", discardedAiText: !!chatbotResult.text }, "Sending button response");

      const sanitizedBody = sanitizeForWhatsApp(buttonResponse.bodyText);
      waMessageId = await sendWhatsAppInteractiveButtons({
        phoneNumberId: ctx.tenant.resolvedPhoneNumberId,
        accessToken: ctx.tenant.resolvedAccessToken,
        to: ctx.recipientPhone,
        bodyText: sanitizedBody,
        buttons: buttonResponse.buttons,
      });
      rawForDb = buttonResponse.rawTextForHistory;
      previewText = sanitizedBody.slice(0, 100);
    } else if (textResponses.length > 0) {
      // Tool handlers produce the definitive text response
      const responseText = textResponses.map(r => r.text).join("\n\n");
      rawForDb = responseText;
      const whatsappText = sanitizeForWhatsApp(responseText);
      waMessageId = await sendWhatsAppTextMessage({
        phoneNumberId: ctx.tenant.resolvedPhoneNumberId,
        accessToken: ctx.tenant.resolvedAccessToken,
        to: ctx.recipientPhone,
        message: whatsappText,
      });
      previewText = whatsappText.slice(0, 100);
    } else if (chatbotResult.text) {
      // No tool responses — use AI-generated text
      rawForDb = chatbotResult.text;
      const whatsappText = sanitizeForWhatsApp(chatbotResult.text);
      waMessageId = await sendWhatsAppTextMessage({
        phoneNumberId: ctx.tenant.resolvedPhoneNumberId,
        accessToken: ctx.tenant.resolvedAccessToken,
        to: ctx.recipientPhone,
        message: whatsappText,
      });
      previewText = whatsappText.slice(0, 100);
    } else {
      log.warn({ conversationId }, "Chatbot returned empty response");
      return;
    }

    // Track outbound WhatsApp usage
    recordUsage(ctx.tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound", conversationId }).catch(() => {});

    // Save outbound message — raw text with slot metadata so AI can read it in history
    await prisma.message.create({
      data: {
        conversationId,
        direction: "OUTBOUND",
        type: buttonResponse ? "INTERACTIVE" : "TEXT",
        content: rawForDb,
        whatsappMessageId: waMessageId,
        metadata: {
          sentBy: "bot",
          debouncedMessages: messages.length,
          ...(buttonResponse ? { buttons: buttonResponse.buttons } : {}),
        },
        sentAt: new Date(),
      },
    });

    // Update conversation preview
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: previewText,
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
    // Check if new messages arrived during processing BEFORE releasing lock.
    // This prevents a race where a new message sets its own timer between
    // lock release and our follow-up check, causing two timers → two responses.
    const followUpMessages = pendingMessages.get(conversationId);
    if (followUpMessages && followUpMessages.length > 0) {
      // Release lock AFTER scheduling the follow-up timer
      log.info(
        { conversationId, queuedCount: followUpMessages.length },
        "New messages arrived during AI processing — scheduling follow-up batch"
      );

      // Short debounce (2s) for trailing messages, then process
      const followUpDebounceMs = Math.min((ctx.tenant.messageDebounceSeconds * 1000), 2000);
      if (debounceTimers.has(conversationId)) {
        clearTimeout(debounceTimers.get(conversationId)!);
      }
      // Release lock now — the timer will re-acquire it when it fires
      processingLock.delete(conversationId);

      const timer = setTimeout(() => {
        processDebouncedMessages(conversationId, log).catch((err) => {
          log.error({ err, conversationId }, "Error processing follow-up debounced messages");
        });
      }, followUpDebounceMs);
      debounceTimers.set(conversationId, timer);
    } else {
      // No follow-up messages — release lock and clean up context
      processingLock.delete(conversationId);
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
      message: sanitizeForWhatsApp(content),
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

// ─── Send template from dashboard via WhatsApp ───────────────────────────────

export async function sendTemplateViaWhatsApp(
  conversationId: string,
  templateId: string,
  components: unknown[] | undefined,
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
        select: { phone: true, firstName: true },
      },
    },
  });

  if (!conversation) {
    log.warn({ conversationId }, "Cannot send template — conversation not found");
    return null;
  }

  const { whatsappPhoneNumberId, whatsappAccessToken } = conversation.tenant;
  if (!whatsappPhoneNumberId || !whatsappAccessToken) {
    log.warn({ conversationId }, "Cannot send template — missing credentials");
    return null;
  }

  // Get template details
  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: templateId, tenantId: conversation.tenant.id, status: "APPROVED" },
  });
  if (!template) {
    log.warn({ conversationId, templateId }, "Cannot send template — not found or not approved");
    return null;
  }

  let plainToken: string;
  try {
    plainToken = decryptToken(whatsappAccessToken);
  } catch {
    plainToken = whatsappAccessToken;
  }

  try {
    const waMessageId = await sendWhatsAppTemplate({
      phoneNumberId: whatsappPhoneNumberId,
      accessToken: plainToken,
      to: conversation.patient.phone,
      templateName: template.name,
      language: template.language ?? "es",
      components: (components as Record<string, unknown>[]) ?? [],
    });

    recordUsage(conversation.tenant.id, "WHATSAPP_MESSAGE", 1, { direction: "outbound_template", conversationId }).catch(() => {});

    log.info({ conversationId, waMessageId, templateName: template.name }, "Template sent via WhatsApp");
    return waMessageId;
  } catch (err) {
    log.error({ err, conversationId }, "Failed to send WhatsApp template");
    return null;
  }
}
