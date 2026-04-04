/**
 * Smoke tests — verify public endpoints respond correctly.
 * No database or external services required for most tests.
 *
 * Run: npx vitest run
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("Health & Status", () => {
  it("GET /api/v1/status returns 200 with version", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/status" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBeDefined();
  });

  it("GET /health returns 200 with checks", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.uptime).toBeTypeOf("number");
    expect(body.version).toBeDefined();
  });
});

describe("Auth", () => {
  it("POST /api/v1/auth/login with invalid credentials returns 401 or 500 (no DB)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "fake@test.com", password: "wrong-password" },
    });
    // 401 = correct rejection, 500 = DB unavailable (acceptable in CI without DB)
    expect([401, 500]).toContain(res.statusCode);
    if (res.statusCode === 401) {
      const body = res.json();
      expect(body.code).toBe("INVALID_CREDENTIALS");
    }
  });
});

describe("Pricing (public)", () => {
  it("GET /api/v1/pricing?country=AR returns 200 with plans", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/pricing?country=AR",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.plans).toBeDefined();
    expect(body.plans.STARTER).toBeDefined();
    expect(body.plans.STARTER.usd).toBe(89);
    expect(body.plans.PROFESSIONAL.usd).toBe(149);
    expect(body.plans.ENTERPRISE.usd).toBe(249);
    expect(body.currency).toBeDefined();
    expect(body.exchangeRate).toBeTypeOf("number");
  });

  it("GET /api/v1/pricing/countries returns country list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/pricing/countries",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.countries).toBeDefined();
    expect(body.countries.AR).toBeDefined();
    expect(body.countries.AR.code).toBe("ARS");
  });
});

describe("WhatsApp webhook verification", () => {
  it("GET with valid verify_token returns challenge", async () => {
    const token = process.env.WHATSAPP_VERIFY_TOKEN ?? "test-token";
    // Temporarily set the env var for this test
    const original = process.env.WHATSAPP_VERIFY_TOKEN;
    process.env.WHATSAPP_VERIFY_TOKEN = token;

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=test_challenge_123`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("test_challenge_123");

    process.env.WHATSAPP_VERIFY_TOKEN = original;
  });

  it("GET with invalid verify_token returns 403", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test",
    });
    expect(res.statusCode).toBe(403);
  });
});
