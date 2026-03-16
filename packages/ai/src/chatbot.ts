import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL, CHATBOT_MAX_TOKENS, CHATBOT_TEMPERATURE } from "@dentalflow/shared";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClinicContext {
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  workingHoursFormatted: string;
  dentistsInfo: string;
  treatmentsInfo: string;
  faqsFormatted: string;
}

export interface PatientContext {
  firstName: string;
  lastName: string;
  pipelineStageName?: string;
  interestTreatment?: string;
  nextAppointment?: {
    date: string;
    time: string;
    dentistName: string;
    treatmentName: string;
  } | null;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolResult {
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
}

export interface ChatbotResponse {
  text: string;
  toolCalls: ToolResult[];
}

// ─── Tool definitions for Anthropic ───────────────────────────────────────────

const CHATBOT_TOOLS: Anthropic.Tool[] = [
  {
    name: "book_appointment",
    description:
      "Book a new dental appointment for the patient. Use when the patient wants to schedule a visit. You must ask what treatment they need first.",
    input_schema: {
      type: "object" as const,
      properties: {
        treatmentType: {
          type: "string",
          description: "The type of dental treatment requested (e.g., limpieza, ortodoncia, extracción)",
        },
        preferredDate: {
          type: "string",
          description: "Preferred date in YYYY-MM-DD format, if mentioned by patient",
        },
        preferredTimeOfDay: {
          type: "string",
          enum: ["morning", "afternoon", "any"],
          description: "Preferred time of day",
        },
      },
      required: ["treatmentType"],
    },
  },
  {
    name: "cancel_appointment",
    description:
      "Cancel the patient's next upcoming appointment. Use when the patient explicitly says they want to cancel.",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: {
          type: "string",
          description: "Reason for cancellation if provided by patient",
        },
      },
      required: [],
    },
  },
  {
    name: "reschedule_appointment",
    description:
      "Reschedule the patient's next appointment to a different date/time.",
    input_schema: {
      type: "object" as const,
      properties: {
        newDate: {
          type: "string",
          description: "New preferred date in YYYY-MM-DD format",
        },
        newTimeOfDay: {
          type: "string",
          enum: ["morning", "afternoon", "any"],
          description: "Preferred time of day for the new appointment",
        },
      },
      required: [],
    },
  },
  {
    name: "check_appointment",
    description:
      "Check the patient's next upcoming appointment details.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "answer_faq",
    description:
      "Answer a frequently asked question about the clinic (prices, hours, location, treatments, parking, etc.).",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "The topic the patient is asking about",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "transfer_to_human",
    description:
      "Transfer the conversation to a human team member. Use when: (1) you cannot resolve the patient's request, (2) the patient explicitly asks to speak with a person, or (3) the situation requires human judgment (complaints, complex clinical questions, billing issues).",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: {
          type: "string",
          description: "Brief internal note about why the transfer is needed",
        },
      },
      required: [],
    },
  },
];

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(clinic: ClinicContext, patient: PatientContext): string {
  const appointmentInfo = patient.nextAppointment
    ? `Próxima cita: ${patient.nextAppointment.date} a las ${patient.nextAppointment.time} con ${patient.nextAppointment.dentistName} (${patient.nextAppointment.treatmentName})`
    : "No tiene cita agendada";

  return `Sos el asistente virtual de ${clinic.clinicName}, una clínica dental${clinic.clinicAddress ? ` ubicada en ${clinic.clinicAddress}` : ""}.
Tu rol es ayudar a los pacientes a agendar citas, responder consultas, y brindar información sobre la clínica.

Horarios de atención:
${clinic.workingHoursFormatted}

Dentistas disponibles:
${clinic.dentistsInfo}

Tratamientos que ofrecemos:
${clinic.treatmentsInfo}

Información del paciente actual:
- Nombre: ${patient.firstName} ${patient.lastName}
- ${appointmentInfo}
- Estado en pipeline: ${patient.pipelineStageName ?? "No asignado"}
${patient.interestTreatment ? `- Tratamiento de interés: ${patient.interestTreatment}` : ""}

${clinic.faqsFormatted ? `Preguntas frecuentes de la clínica:\n${clinic.faqsFormatted}` : ""}

REGLAS ESTRICTAS:
1. Respondé SIEMPRE en español, de forma amigable y profesional.
2. Usá emojis moderadamente (😊, ✅, 📅, 🦷).
3. Respuestas CORTAS: máximo 3 oraciones por mensaje.
4. Si el paciente quiere agendar, usá la herramienta book_appointment con el tratamiento que necesita.
5. Si no podés resolver algo, usá transfer_to_human y decí: "Dejame comunicarte con nuestro equipo para ayudarte mejor 😊"
6. NUNCA inventés información sobre precios o tratamientos que no estén en la lista.
7. Si el paciente confirma una cita, respondé con los datos completos: fecha, hora, dentista, dirección.
8. Tratá al paciente por su nombre (${patient.firstName}).
9. Si el paciente solo saluda, respondé amablemente y preguntá en qué podés ayudarlo.`;
}

// ─── Main chatbot function ────────────────────────────────────────────────────

export async function generateChatbotResponse(
  clinic: ClinicContext,
  patient: PatientContext,
  conversationHistory: ConversationMessage[],
  userMessage: string
): Promise<ChatbotResponse> {
  const systemPrompt = buildSystemPrompt(clinic, patient);

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: CHATBOT_MAX_TOKENS,
    temperature: CHATBOT_TEMPERATURE,
    system: systemPrompt,
    tools: CHATBOT_TOOLS,
    messages,
  });

  let text = "";
  const toolCalls: ToolResult[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        toolName: block.name,
        args: block.input as Record<string, unknown>,
      });
    }
  }

  // If the model only returned tool calls with no text, we need to do a second
  // pass with tool results to get the actual response text. For now, if there are
  // tool calls we handle them in the caller and let it decide the response text.

  return { text, toolCalls };
}
