import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import helmet from "@fastify/helmet";
import rawBody from "fastify-raw-body";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { registerRoutes } from "./routes/index.js";
import { AppError } from "./errors/app-error.js";
import { prisma } from "@dentiqa/db";

const APP_VERSION = "1.2.0";
const startedAt = Date.now();

// ─── Error counter (in-memory, per-hour buckets) ───────────────────────────
const errorCounts: { hour: number; count: number }[] = [];

function recordError500() {
  const hour = Math.floor(Date.now() / 3_600_000);
  const last = errorCounts[errorCounts.length - 1];
  if (last?.hour === hour) {
    last.count++;
  } else {
    errorCounts.push({ hour, count: 1 });
    // Keep only last 24 hours
    while (errorCounts.length > 24) errorCounts.shift();
  }
}

export function getErrorsLastHour(): number {
  const hour = Math.floor(Date.now() / 3_600_000);
  return errorCounts.find((e) => e.hour === hour)?.count ?? 0;
}

// ─── Anthropic API key validation ──────────────────────────────────────────
export async function validateAnthropicKey(): Promise<boolean> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "sk-ant-..." || key.length < 20) {
    console.error("CRITICAL: Anthropic API key is invalid or missing — chatbot will not work");
    return false;
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    // 200 = valid, 401 = invalid key, other = API issue but key format ok
    if (res.status === 401) {
      console.error("CRITICAL: Anthropic API key is invalid — chatbot will not work");
      return false;
    }
    return true;
  } catch {
    // Network error — can't verify but don't block startup
    console.warn("[startup] Could not verify Anthropic API key (network error)");
    return true; // assume valid, don't block
  }
}

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

  // CORS — always include production domains + localhost for dev
  const corsOrigins = [
    'https://dentiqa.app',
    'https://dashboard.dentiqa.app',
    'https://admin.dentiqa.app',
    'http://localhost:3000',
    'http://localhost:3002',
  ];
  if (process.env.APP_URL) corsOrigins.push(process.env.APP_URL);

  await app.register(cors, {
    origin: corsOrigins,
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

  // Global error handler — with structured logging for 500s
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    }

    // Fastify validation / content-type errors have statusCode set
    const err = error as Error & { statusCode?: number; code?: string };
    const statusCode = err.statusCode ?? 500;

    if (statusCode === 500) {
      recordError500();
      app.log.error({
        msg: "Internal Server Error",
        timestamp: new Date().toISOString(),
        endpoint: request.url,
        method: request.method,
        error: err.message,
        stack: err.stack?.split("\n").slice(0, 5).join("\n"),
      });
    } else {
      app.log.error(error);
    }

    return reply.status(statusCode).send({
      statusCode,
      code: statusCode === 500 ? "INTERNAL_ERROR" : err.code ?? "BAD_REQUEST",
      message: statusCode === 500 ? "An internal error occurred" : err.message,
    });
  });

  // ─── Public status endpoint (no auth, for UptimeRobot etc.) ──────────────
  app.get("/api/v1/status", async () => {
    return { status: "ok", version: APP_VERSION };
  });

  // ─── Health check — comprehensive ────────────────────────────────────────
  app.get("/health", async () => {
    const checks = { db: false, redis: false, anthropic: false, whatsapp: false };

    // DB check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = true;
    } catch (err) {
      app.log.error(`Health check DB error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Redis check
    if (process.env.REDIS_URL) {
      try {
        const ioredis = await import("ioredis");
        const IORedis = ioredis.default ?? ioredis;
        const client = new (IORedis as any)(process.env.REDIS_URL, {
          connectTimeout: 2000,
          maxRetriesPerRequest: 0,
          lazyConnect: true,
        });
        await client.connect();
        await client.ping();
        checks.redis = true;
        await client.quit();
      } catch { /* redis down */ }
    }

    // Anthropic check (format validation only — no API call on every health check)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    checks.anthropic = !!(apiKey && apiKey.length >= 20 && apiKey !== "sk-ant-...");

    // WhatsApp check
    const waEnabled = process.env.WHATSAPP_ENABLED === "true";
    if (waEnabled) {
      try {
        const count = await prisma.tenant.count({
          where: { whatsappPhoneNumberId: { not: null } },
        });
        checks.whatsapp = count > 0;
      } catch { /* db issue already caught above */ }
    }

    // Overall status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (!checks.db) {
      status = "unhealthy";
    } else if (!checks.redis || !checks.anthropic || !checks.whatsapp) {
      status = "degraded";
    }

    return {
      status,
      checks: {
        db: checks.db ? "ok" : "fail",
        redis: checks.redis ? "ok" : "fail",
        anthropic: checks.anthropic ? "ok" : "fail",
        whatsapp: checks.whatsapp ? "ok" : "fail",
      },
      errorsLastHour: getErrorsLastHour(),
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      version: APP_VERSION,
    };
  });

  return app;
}
