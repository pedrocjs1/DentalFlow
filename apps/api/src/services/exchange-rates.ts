/**
 * Exchange Rate Service
 * Fetches USD → local currency rates, cached for 6 hours.
 * Graceful fallback to hardcoded rates if API unavailable.
 */

export const SUPPORTED_CURRENCIES: Record<string, { code: string; symbol: string; name: string; flag: string }> = {
  AR: { code: "ARS", symbol: "$", name: "Pesos argentinos", flag: "🇦🇷" },
  CL: { code: "CLP", symbol: "$", name: "Pesos chilenos", flag: "🇨🇱" },
  CO: { code: "COP", symbol: "$", name: "Pesos colombianos", flag: "🇨🇴" },
  MX: { code: "MXN", symbol: "$", name: "Pesos mexicanos", flag: "🇲🇽" },
  UY: { code: "UYU", symbol: "$", name: "Pesos uruguayos", flag: "🇺🇾" },
  BR: { code: "BRL", symbol: "R$", name: "Reales", flag: "🇧🇷" },
  EC: { code: "USD", symbol: "$", name: "Dólares", flag: "🇪🇨" },
  PY: { code: "PYG", symbol: "₲", name: "Guaraníes", flag: "🇵🇾" },
  BO: { code: "BOB", symbol: "Bs", name: "Bolivianos", flag: "🇧🇴" },
  PE: { code: "PEN", symbol: "S/", name: "Soles", flag: "🇵🇪" },
};

// Fallback rates (approximate, updated manually as safety net)
const FALLBACK_RATES: Record<string, number> = {
  ARS: 1390, CLP: 950, COP: 4100, MXN: 17, UYU: 42,
  BRL: 5.1, USD: 1, PYG: 7500, BOB: 6.9, PEN: 3.7,
};

let cachedRates: Record<string, number> | null = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function fetchRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTime < CACHE_TTL) return cachedRates;

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number> };
    if (data.rates) {
      cachedRates = data.rates;
      cacheTime = now;
      return data.rates;
    }
  } catch (err) {
    console.warn("[exchange-rates] API failed, using fallback:", err);
  }

  return FALLBACK_RATES;
}

/** Round to a "nice" number for display */
export function roundToNice(amount: number): number {
  if (amount < 100) return Math.round(amount / 5) * 5;
  if (amount < 1000) return Math.round(amount / 50) * 50;
  if (amount < 10000) return Math.round(amount / 500) * 500;
  if (amount < 100000) return Math.round(amount / 1000) * 1000;
  if (amount < 1000000) return Math.round(amount / 5000) * 5000;
  return Math.round(amount / 10000) * 10000;
}

// USD prices — single source of truth
export const PLAN_PRICES_USD: Record<string, number> = {
  STARTER: 99,
  PROFESSIONAL: 199,
  ENTERPRISE: 299,
};

export const SETUP_FEE_USD = 499;

export interface PricingResult {
  currency: { code: string; symbol: string; name: string; flag: string };
  exchangeRate: number;
  plans: Record<string, { usd: number; local: number; formatted: string }>;
  setupFee: { usd: number; local: number; formatted: string };
  lastUpdated: string;
}

export async function getPricing(countryCode: string): Promise<PricingResult> {
  const cc = countryCode.toUpperCase();
  const currencyInfo = SUPPORTED_CURRENCIES[cc] ?? SUPPORTED_CURRENCIES.AR;
  const rates = await fetchRates();
  const rate = rates[currencyInfo.code] ?? FALLBACK_RATES[currencyInfo.code] ?? 1;

  const plans: PricingResult["plans"] = {};
  for (const [plan, usd] of Object.entries(PLAN_PRICES_USD)) {
    const local = roundToNice(usd * rate);
    plans[plan] = {
      usd,
      local,
      formatted: currencyInfo.code === "USD"
        ? `USD ${usd}`
        : `${currencyInfo.symbol} ${local.toLocaleString("es-AR")}`,
    };
  }

  const setupLocal = roundToNice(SETUP_FEE_USD * rate);

  return {
    currency: currencyInfo,
    exchangeRate: Math.round(rate * 100) / 100,
    plans,
    setupFee: {
      usd: SETUP_FEE_USD,
      local: setupLocal,
      formatted: currencyInfo.code === "USD"
        ? `USD ${SETUP_FEE_USD}`
        : `${currencyInfo.symbol} ${setupLocal.toLocaleString("es-AR")}`,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/** Convert USD to ARS for Mercado Pago (always charges in ARS) */
export async function usdToArs(usdAmount: number): Promise<number> {
  const rates = await fetchRates();
  const arsRate = rates.ARS ?? FALLBACK_RATES.ARS;
  return roundToNice(usdAmount * arsRate);
}
