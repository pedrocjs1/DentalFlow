import type { FastifyInstance } from "fastify";

export async function stripeWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/webhooks/stripe", {
    handler: async (request, reply) => {
      const signature = request.headers["stripe-signature"] as string;
      const payload = request.body as string;

      app.log.info({ signature: !!signature }, "Stripe webhook received");

      // TODO: verify signature with Stripe SDK and process events
      // Events: invoice.paid, invoice.payment_failed, customer.subscription.deleted

      return reply.status(200).send({ received: true });
    },
  });
}
