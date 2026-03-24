import type { FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";

export async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    }),
    // Per-route overrides via routeConfig
    keyGenerator: (request) => {
      // Use tenant ID if authenticated, otherwise IP
      const user = request.user as { tenantId?: string } | undefined;
      return user?.tenantId ?? request.ip;
    },
  });

  // Stricter limits for specific routes
  app.addHook("onRoute", (routeOptions) => {
    const url = routeOptions.url;
    if (url === "/api/v1/webhooks/whatsapp") {
      routeOptions.config = { ...routeOptions.config, rateLimit: { max: 100, timeWindow: "1 minute" } };
    } else if (url === "/api/v1/webhooks/mercadopago") {
      routeOptions.config = { ...routeOptions.config, rateLimit: { max: 50, timeWindow: "1 minute" } };
    } else if (url === "/api/v1/auth/login" || url === "/api/v1/admin/auth/login") {
      routeOptions.config = { ...routeOptions.config, rateLimit: { max: 10, timeWindow: "1 minute" } };
    }
  });
}
