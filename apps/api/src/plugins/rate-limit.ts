import type { FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";

export async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    }),
  });
}
