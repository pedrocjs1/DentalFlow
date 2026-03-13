import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { registerRoutes } from "./routes/index.js";
import { AppError } from "./errors/app-error.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty" }
          : undefined,
    },
  });

  // CORS
  await app.register(cors, {
    origin: process.env.APP_URL ?? "http://localhost:3000",
    credentials: true,
  });

  // JWT — registered at root so it's available in all child scopes
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "change-me-in-production",
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  });

  // Rate limiting
  await app.register(rateLimitPlugin);

  // Routes
  await registerRoutes(app);

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "An internal error occurred",
    });
  });

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  return app;
}
