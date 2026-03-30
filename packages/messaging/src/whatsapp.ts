import { createHmac } from "crypto";
import { WHATSAPP_API_VERSION } from "@dentiqa/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

interface SendTextParams extends WhatsAppCredentials {
  to: string;
  message: string;
}

interface SendTemplateParams extends WhatsAppCredentials {
  to: string;
  templateName: string;
  language?: string;
  components?: unknown[];
}

interface InteractiveButton {
  id: string;
  title: string;
}

interface SendInteractiveButtonsParams extends WhatsAppCredentials {
  to: string;
  bodyText: string;
  buttons: InteractiveButton[];
}

interface ListSection {
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

interface SendInteractiveListParams extends WhatsAppCredentials {
  to: string;
  bodyText: string;
  buttonText: string;
  sections: ListSection[];
}

interface MarkReadParams extends WhatsAppCredentials {
  messageId: string;
}

interface WhatsAppApiResponse {
  messages: Array<{ id: string }>;
}

interface WhatsAppApiError {
  error: { message: string; type: string; code: number; fbtrace_id: string };
}

// ─── Feature flag ─────────────────────────────────────────────────────────────

function isWhatsAppEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === "true";
}

// ─── Base API call ────────────────────────────────────────────────────────────

async function whatsappApiCall(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>
): Promise<string> {
  if (!isWhatsAppEnabled()) {
    const fakeId = `wamid.fake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log("[WhatsApp DRY-RUN] Would send:", JSON.stringify(payload, null, 2));
    return fakeId;
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = (await response.json()) as WhatsAppApiError;
    const code = err.error?.code ?? response.status;
    throw new WhatsAppApiCallError(
      `WhatsApp API error (${code}): ${err.error?.message ?? "Unknown error"}`,
      code,
      response.status
    );
  }

  const data = (await response.json()) as WhatsAppApiResponse;
  return data.messages[0].id;
}

export class WhatsAppApiCallError extends Error {
  constructor(
    message: string,
    public readonly apiCode: number,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "WhatsAppApiCallError";
  }

  get isRateLimited(): boolean {
    return this.httpStatus === 429 || this.apiCode === 130429;
  }

  get isInvalidNumber(): boolean {
    return this.apiCode === 131026;
  }

  get isTemplateNotApproved(): boolean {
    return this.apiCode === 132012;
  }

  get isOutsideWindow(): boolean {
    // Session message outside 24h window
    return this.apiCode === 131047;
  }
}

// ─── Send text message (only within 24h window) ──────────────────────────────

export async function sendWhatsAppTextMessage({
  phoneNumberId,
  accessToken,
  to,
  message,
}: SendTextParams): Promise<string> {
  return whatsappApiCall(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: message },
  });
}

// ─── Send template (works outside 24h window) ────────────────────────────────

export async function sendWhatsAppTemplate({
  phoneNumberId,
  accessToken,
  to,
  templateName,
  language = "es",
  components = [],
}: SendTemplateParams): Promise<string> {
  return whatsappApiCall(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}

// ─── Send interactive buttons (max 3 buttons) ────────────────────────────────

export async function sendWhatsAppInteractiveButtons({
  phoneNumberId,
  accessToken,
  to,
  bodyText,
  buttons,
}: SendInteractiveButtonsParams): Promise<string> {
  return whatsappApiCall(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

// ─── Send interactive list (sections with rows) ──────────────────────────────

export async function sendWhatsAppInteractiveList({
  phoneNumberId,
  accessToken,
  to,
  bodyText,
  buttonText,
  sections,
}: SendInteractiveListParams): Promise<string> {
  return whatsappApiCall(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: r.description?.slice(0, 72),
          })),
        })),
      },
    },
  });
}

// ─── Mark message as read ─────────────────────────────────────────────────────

export async function markWhatsAppMessageAsRead({
  phoneNumberId,
  accessToken,
  messageId,
}: MarkReadParams): Promise<void> {
  if (!isWhatsAppEnabled()) return;

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

// ─── Webhook signature verification ──────────────────────────────────────────

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  const expectedSignature = createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");
  return `sha256=${expectedSignature}` === signature;
}

// ─── Parse incoming webhook payload ──────────────────────────────────────────

export interface IncomingMessage {
  waMessageId: string;
  from: string; // phone number
  timestamp: number;
  type: "text" | "image" | "audio" | "document" | "interactive" | "button" | "unknown";
  text?: string;
  mediaId?: string;
  mediaUrl?: string;
  caption?: string;
  profileName?: string;
  // Interactive reply payload
  interactiveReplyId?: string;
  interactiveReplyTitle?: string;
}

export interface StatusUpdate {
  waMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
  recipientPhone: string;
  errorCode?: number;
  errorTitle?: string;
}

export interface ParsedWebhook {
  phoneNumberId: string;
  messages: IncomingMessage[];
  statuses: StatusUpdate[];
}

export function parseWebhookPayload(body: Record<string, unknown>): ParsedWebhook[] {
  const results: ParsedWebhook[] = [];

  if (body.object !== "whatsapp_business_account") return results;

  const entry = (body.entry as Array<Record<string, unknown>>) ?? [];

  for (const e of entry) {
    const changes = (e.changes as Array<Record<string, unknown>>) ?? [];

    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      if (!value) continue;

      const metadata = value.metadata as { phone_number_id?: string } | undefined;
      const phoneNumberId = metadata?.phone_number_id ?? "";

      const parsed: ParsedWebhook = { phoneNumberId, messages: [], statuses: [] };

      // Parse messages
      const rawMessages = (value.messages as Array<Record<string, unknown>>) ?? [];
      const contacts = (value.contacts as Array<{ profile?: { name?: string } }>) ?? [];

      for (const msg of rawMessages) {
        const type = msg.type as string;

        // Skip system messages (e.g., Meta setup notifications, account prompts)
        if (type === "system") continue;

        const incoming: IncomingMessage = {
          waMessageId: msg.id as string,
          from: msg.from as string,
          timestamp: Number(msg.timestamp),
          type: (["text", "image", "audio", "document", "interactive", "button"].includes(type)
            ? type
            : "unknown") as IncomingMessage["type"],
          profileName: contacts[0]?.profile?.name,
        };

        if (type === "text") {
          incoming.text = (msg.text as { body: string })?.body;
        } else if (type === "image" || type === "audio" || type === "document") {
          const media = msg[type] as { id?: string; mime_type?: string; caption?: string } | undefined;
          incoming.mediaId = media?.id;
          incoming.caption = media?.caption;
          incoming.text = media?.caption ?? `[${type}]`;
        } else if (type === "interactive") {
          const interactive = msg.interactive as {
            type?: string;
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string };
          } | undefined;
          if (interactive?.type === "button_reply") {
            incoming.interactiveReplyId = interactive.button_reply?.id;
            incoming.interactiveReplyTitle = interactive.button_reply?.title;
            incoming.text = interactive.button_reply?.title;
          } else if (interactive?.type === "list_reply") {
            incoming.interactiveReplyId = interactive.list_reply?.id;
            incoming.interactiveReplyTitle = interactive.list_reply?.title;
            incoming.text = interactive.list_reply?.title;
          }
        } else if (type === "button") {
          const button = msg.button as { payload?: string; text?: string } | undefined;
          incoming.text = button?.text ?? button?.payload;
          incoming.interactiveReplyId = button?.payload;
          incoming.interactiveReplyTitle = button?.text;
        }

        parsed.messages.push(incoming);
      }

      // Parse status updates
      const rawStatuses = (value.statuses as Array<Record<string, unknown>>) ?? [];
      for (const s of rawStatuses) {
        const errors = (s.errors as Array<{ code?: number; title?: string }>) ?? [];
        parsed.statuses.push({
          waMessageId: s.id as string,
          status: s.status as StatusUpdate["status"],
          timestamp: Number(s.timestamp),
          recipientPhone: s.recipient_id as string,
          errorCode: errors[0]?.code,
          errorTitle: errors[0]?.title,
        });
      }

      results.push(parsed);
    }
  }

  return results;
}
