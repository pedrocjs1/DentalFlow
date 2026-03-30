import type { FastifyInstance } from "fastify";
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  type IncomingMessage,
} from "@dentiqa/messaging";
import {
  processIncomingMessage,
  processStatusUpdate,
} from "../../services/whatsapp-processor.js";

// ─── Meta system message filter ─────────────────────────────────────────────
// Meta/WhatsApp sends internal messages during Embedded Signup and account setup
// (e.g., "Continue setting up your account" from +16465894168). These are not
// real patient messages and should be silently ignored.

const META_SYSTEM_PHONE_NUMBERS = new Set([
  "16465894168",  // Meta/WhatsApp setup assistant
]);

const META_SYSTEM_TEXT_PATTERNS = [
  /continue setting up your account/i,
  /complete your business verification/i,
  /your whatsapp business account/i,
];

function isMetaSystemMessage(msg: IncomingMessage, phoneNumberId: string): boolean {
  const from = msg.from.replace(/^\+/, "");

  // Check if sender is a known Meta system number
  if (META_SYSTEM_PHONE_NUMBERS.has(from)) return true;

  // Check if sender phone matches the business's own phone_number_id
  // (Meta sometimes echoes back from the business number itself)
  if (from === phoneNumberId) return true;

  // Check for known Meta setup message patterns
  if (msg.text) {
    for (const pattern of META_SYSTEM_TEXT_PATTERNS) {
      if (pattern.test(msg.text)) return true;
    }
  }

  return false;
}

export async function whatsappWebhookRoutes(app: FastifyInstance): Promise<void> {
  // ─── GET: Webhook verification (Meta handshake) ─────────────────────────────
  app.get("/api/v1/webhooks/whatsapp", {
    handler: async (request, reply) => {
      const query = request.query as {
        "hub.mode"?: string;
        "hub.verify_token"?: string;
        "hub.challenge"?: string;
      };

      const mode = query["hub.mode"];
      const token = query["hub.verify_token"];
      const challenge = query["hub.challenge"];

      if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        app.log.info("WhatsApp webhook verified");
        return reply.status(200).send(challenge);
      }

      return reply.status(403).send({ error: "Verification failed" });
    },
  });

  // ─── POST: Receive messages & status updates ────────────────────────────────
  app.post("/api/v1/webhooks/whatsapp", {
    config: { rawBody: true },  // opt-in to capture raw body for this route
    handler: async (request, reply) => {
      const body = request.body as Record<string, unknown>;

      // Verify signature if WHATSAPP_APP_SECRET is configured
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (appSecret && appSecret !== "placeholder") {
        const signature = (request.headers["x-hub-signature-256"] as string) ?? "";
        const payload = (request as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(body);
        if (!verifyWebhookSignature(payload, signature, appSecret)) {
          app.log.warn("WhatsApp webhook signature verification failed");
          return reply.status(401).send({ error: "Invalid signature" });
        }
      }

      // Meta expects 200 quickly — process async
      reply.status(200).send("OK");

      // Parse the webhook payload
      const parsed = parseWebhookPayload(body);

      for (const entry of parsed) {
        // Process incoming messages
        for (const message of entry.messages) {
          // Skip Meta/WhatsApp system messages (setup prompts, account notifications)
          if (isMetaSystemMessage(message, entry.phoneNumberId)) {
            app.log.info(
              { from: message.from, type: message.type },
              "Ignoring system/setup message from Meta"
            );
            continue;
          }

          app.log.info(
            { waMessageId: message.waMessageId, from: message.from, type: message.type },
            "Incoming WhatsApp message"
          );

          // Process asynchronously — don't block the webhook response
          processIncomingMessage(message, entry.phoneNumberId, app.log).catch((err) => {
            app.log.error({ err, waMessageId: message.waMessageId }, "Error processing incoming message");
          });
        }

        // Process status updates (sent, delivered, read, failed)
        for (const status of entry.statuses) {
          processStatusUpdate(status, app.log).catch((err) => {
            app.log.error({ err, waMessageId: status.waMessageId }, "Error processing status update");
          });
        }
      }
    },
  });

  // ─── POST: Verify WhatsApp connection (used by configuration page) ──────────
  app.post("/api/v1/webhooks/whatsapp/verify-connection", {
    handler: async (request, reply) => {
      const body = request.body as {
        phoneNumberId: string;
        accessToken: string;
      };

      if (!body.phoneNumberId || !body.accessToken) {
        return reply.status(400).send({ error: "phoneNumberId and accessToken are required" });
      }

      try {
        // Test the credentials by calling the Meta API
        const url = `https://graph.facebook.com/v21.0/${body.phoneNumberId}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${body.accessToken}` },
        });

        if (!response.ok) {
          const err = await response.json();
          return reply.status(400).send({
            connected: false,
            error: (err as { error?: { message?: string } }).error?.message ?? "Invalid credentials",
          });
        }

        const data = (await response.json()) as { verified_name?: string; display_phone_number?: string };

        return {
          connected: true,
          verifiedName: data.verified_name,
          displayPhoneNumber: data.display_phone_number,
        };
      } catch {
        return reply.status(500).send({ connected: false, error: "Connection test failed" });
      }
    },
  });
}
