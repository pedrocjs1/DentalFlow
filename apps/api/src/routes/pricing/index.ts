import type { FastifyInstance } from "fastify";
import { getPricing, SUPPORTED_CURRENCIES } from "../../services/exchange-rates.js";

export async function pricingRoutes(app: FastifyInstance): Promise<void> {
  // Public endpoint — no auth required
  app.get("/api/v1/pricing", {
    handler: async (request) => {
      const { country = "AR" } = request.query as { country?: string };
      return getPricing(country);
    },
  });

  app.get("/api/v1/pricing/countries", {
    handler: async () => {
      return { countries: SUPPORTED_CURRENCIES };
    },
  });
}
