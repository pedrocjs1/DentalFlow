import type { FastifyInstance } from "fastify";

export async function whatsappWebhookRoutes(app: FastifyInstance): Promise<void> {
  // Webhook verification (GET)
  app.get("/api/v1/webhooks/whatsapp", {
    handler: async (request, reply) => {
      const query = request.query as {
        "hub.mode": string;
        "hub.verify_token": string;
        "hub.challenge": string;
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

  // Receive messages (POST)
  app.post("/api/v1/webhooks/whatsapp", {
    handler: async (request, reply) => {
      const body = request.body as {
        object: string;
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{
                from: string;
                id: string;
                type: string;
                text?: { body: string };
                timestamp: string;
              }>;
              metadata?: { phone_number_id: string };
            };
          }>;
        }>;
      };

      if (body.object !== "whatsapp_business_account") {
        return reply.status(200).send("OK");
      }

      // Process incoming messages asynchronously
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const messages = change.value?.messages ?? [];
          for (const message of messages) {
            app.log.info({ messageId: message.id, from: message.from }, "Incoming WhatsApp message");
            // TODO: dispatch to message processor queue
          }
        }
      }

      return reply.status(200).send("OK");
    },
  });
}
