import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import helmet from "@fastify/helmet";
import rawBody from "fastify-raw-body";
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

  // Security headers (Helmet)
  await app.register(helmet, {
    contentSecurityPolicy: false, // CSP can break embedded scripts; configure per-deploy
    crossOriginEmbedderPolicy: false, // Can break loading external resources
  });

  // CORS — strict origin
  await app.register(cors, {
    origin: process.env.APP_URL ?? "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // JWT — registered at root so it's available in all child scopes
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "change-me-in-production",
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  });

  // Raw body — needed for webhook HMAC-SHA256 signature verification
  await app.register(rawBody, {
    field: "rawBody",
    global: false,              // only attach where explicitly enabled
    runFirst: true,             // capture before JSON parser modifies it
    encoding: "utf8",
  });

  // Rate limiting
  await app.register(rateLimitPlugin);

  // Subscription check — blocks writes for expired trials/cancelled subs
  const { subscriptionCheckMiddleware } = await import("./middleware/subscription-check.js");
  app.addHook("preHandler", subscriptionCheckMiddleware);

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

  // Health check — enhanced
  app.get("/health", async () => {
    let db = false;
    let redis = false;
    const whatsapp = !!process.env.WHATSAPP_ENABLED;

    // Check DB
    try {
      const { prisma } = await import("@dentalflow/db");
      await prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch { /* db down */ }

    // Check Redis — if REDIS_URL is set, assume jobs are running
    // (actual health is tracked by the scheduler)
    redis = !!process.env.REDIS_URL;

    return {
      status: db ? "ok" : "degraded",
      db,
      redis,
      whatsapp,
      version: "0.5.0",
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
