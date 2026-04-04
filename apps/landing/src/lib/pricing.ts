/**
 * Pricing utility — fetches dynamic prices from backend API.
 * Uses the same exchange rate + roundToNice() logic as Mercado Pago,
 * ensuring the landing page price matches the checkout price exactly.
 *
 * Server-side only (used in Next.js server components).
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://api.dentiqa.app"
    : "http://localhost:3001");

export interface PlanPricing {
  usd: number;
  local: number;
  formatted: string;
}

export interface PricingResult {
  currency: { code: string; symbol: string; name: string; flag: string };
  exchangeRate: number;
  plans: Record<string, PlanPricing>;
  setupFee: { usd: number; local: number; formatted: string };
  lastUpdated: string;
}

/**
 * Fetch pricing from backend API with ISR caching (1 hour).
 * Falls back to null if API is unreachable — callers should provide fallbacks.
 */
export async function fetchPricing(country: string): Promise<PricingResult | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/pricing?country=${country}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PricingResult;
  } catch {
    return null;
  }
}

/** Get formatted local price string for a plan, with fallback */
export function getLocalPrice(
  pricing: PricingResult | null,
  planKey: string,
  fallback: string,
): string {
  const plan = pricing?.plans?.[planKey];
  if (plan?.local) {
    return plan.local.toLocaleString("es-AR");
  }
  return fallback;
}

/** Get formatted price with currency symbol for country landing pages */
export function getFormattedPrice(
  pricing: PricingResult | null,
  planKey: string,
  fallback: string,
): string {
  const plan = pricing?.plans?.[planKey];
  if (plan?.formatted) {
    return plan.formatted;
  }
  return fallback;
}
