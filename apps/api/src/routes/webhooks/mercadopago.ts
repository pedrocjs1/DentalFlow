import type { FastifyInstance } from "fastify";

export async function mercadoPagoWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/webhooks/mercadopago", {
    handler: async (request, reply) => {
      app.log.info("Mercado Pago webhook received");
      // TODO: process Mercado Pago subscription events
      return reply.status(200).send({ received: true });
    },
  });
}
