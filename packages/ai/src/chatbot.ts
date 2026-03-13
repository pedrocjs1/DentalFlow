import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL, CHATBOT_MAX_TOKENS, CHATBOT_TEMPERATURE } from "@dentalflow/shared";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatbotConfig {
  clinicName: string;
  clinicPhone?: string;
  workingHours?: string;
  treatments?: string[];
  faqs?: Array<{ question: string; answer: string }>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function generateChatbotResponse(
  config: ChatbotConfig,
  conversationHistory: Message[],
  userMessage: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(config);

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: CHATBOT_MAX_TOKENS,
    temperature: CHATBOT_TEMPERATURE,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

function buildSystemPrompt(config: ChatbotConfig): string {
  const faqsText =
    config.faqs && config.faqs.length > 0
      ? `\n\nPreguntas frecuentes de la clínica:\n${config.faqs
          .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
          .join("\n\n")}`
      : "";

  const treatmentsText =
    config.treatments && config.treatments.length > 0
      ? `\n\nTratamientos disponibles: ${config.treatments.join(", ")}`
      : "";

  return `Sos el asistente virtual de ${config.clinicName}, una clínica dental.
Tu rol es ayudar a los pacientes por WhatsApp.

Reglas importantes:
- Siempre respondé en español
- Sé amigable pero profesional
- Usá emojis moderadamente 😊
- Respuestas cortas (máximo 3 oraciones)
- Si no podés resolver algo, ofrecé conectar con una persona del equipo
- NUNCA inventes información sobre horarios, precios o disponibilidad${faqsText}${treatmentsText}`;
}
