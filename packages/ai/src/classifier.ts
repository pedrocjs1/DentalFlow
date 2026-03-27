import Anthropic from "@anthropic-ai/sdk";
import type { Intent } from "@dentiqa/shared";
import { ANTHROPIC_MODEL, CHATBOT_TEMPERATURE } from "@dentiqa/shared";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a dental clinic WhatsApp chatbot.
Classify the user's message into exactly one of these intents:
- BOOK_APPOINTMENT: wants to book a new appointment
- CANCEL_APPOINTMENT: wants to cancel an existing appointment
- RESCHEDULE_APPOINTMENT: wants to change date/time of their appointment
- CHECK_APPOINTMENT: asking about their next appointment
- FAQ: general question (prices, hours, location, treatments)
- TALK_TO_HUMAN: requesting to speak with a person
- GREETING: simple greeting
- OTHER: cannot be classified

Respond with ONLY the intent name, nothing else.`;

export async function classifyIntent(message: string): Promise<Intent> {
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 50,
    temperature: CHATBOT_TEMPERATURE,
    system: INTENT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: message }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const validIntents: Intent[] = [
    "BOOK_APPOINTMENT",
    "CANCEL_APPOINTMENT",
    "RESCHEDULE_APPOINTMENT",
    "CHECK_APPOINTMENT",
    "FAQ",
    "TALK_TO_HUMAN",
    "GREETING",
    "OTHER",
  ];

  return validIntents.includes(text as Intent) ? (text as Intent) : "OTHER";
}
