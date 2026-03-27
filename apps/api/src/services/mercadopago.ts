/**
 * Mercado Pago Service — Suscripciones (preapproval API)
 *
 * Uses the preapproval (subscription) API for Argentina (ARS).
 * Graceful degradation: if MP_ACCESS_TOKEN is not set, all operations throw.
 */

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_API_BASE = "https://api.mercadopago.com";

export function isMercadoPagoConfigured(): boolean {
  return !!(MP_ACCESS_TOKEN && !MP_ACCESS_TOKEN.startsWith("APP_USR-..."));
}

// Prices in USD — source of truth. Converted to ARS at checkout time.
import { PLAN_PRICES_USD, SETUP_FEE_USD, usdToArs } from "./exchange-rates.js";

const PLAN_NAMES: Record<string, string> = {
  STARTER: "Dentiqa Starter",
  PROFESSIONAL: "Dentiqa Professional",
  ENTERPRISE: "Dentiqa Enterprise",
};

export function getPlanDetails(plan: string) {
  const usd = PLAN_PRICES_USD[plan] ?? PLAN_PRICES_USD.PROFESSIONAL;
  return { title: PLAN_NAMES[plan] ?? "Dentiqa", price: usd, currency: "USD" };
}

/** Get the ARS amount for a plan (for MP checkout) */
export async function getPlanAmountArs(plan: string): Promise<number> {
  const usd = PLAN_PRICES_USD[plan] ?? PLAN_PRICES_USD.PROFESSIONAL;
  return usdToArs(usd);
}

/** Get the ARS amount for setup fee */
export async function getSetupFeeAmountArs(): Promise<number> {
  return usdToArs(SETUP_FEE_USD);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mpFetch(path: string, options: RequestInit = {}): Promise<any> {
  if (!isMercadoPagoConfigured()) {
    throw new Error("Mercado Pago not configured");
  }

  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      ...options.headers,
    },
  });

  // MP sometimes returns 201 for creates
  if (!response.ok && response.status !== 201) {
    const errorBody = await response.text();
    console.error(`[mercadopago] API error ${response.status}: ${errorBody}`);
    throw new Error(`MP API error: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Create a preapproval (subscription) directly — no plan needed.
 * Returns the init_point URL for the checkout.
 */
export async function createSubscription(params: {
  tenantId: string;
  tenantName: string;
  payerEmail: string;
  plan: string;
  backUrl: string;
}): Promise<{ checkoutUrl: string; mpSubscriptionId: string }> {
  const planName = PLAN_NAMES[params.plan] ?? "Dentiqa Professional";
  const arsAmount = await getPlanAmountArs(params.plan);

  const body = {
    reason: planName,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: arsAmount,
      currency_id: "ARS",
    },
    payer_email: params.payerEmail,
    back_url: params.backUrl,
    external_reference: params.tenantId,
    status: "pending", // pending until user pays
  };

  const result = await mpFetch("/preapproval", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    checkoutUrl: result.init_point,
    mpSubscriptionId: result.id,
  };
}

/**
 * Get subscription status from Mercado Pago.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSubscriptionStatus(mpSubscriptionId: string): Promise<any> {
  return mpFetch(`/preapproval/${mpSubscriptionId}`);
}

/**
 * Cancel a subscription in Mercado Pago.
 */
export async function cancelMpSubscription(mpSubscriptionId: string) {
  return mpFetch(`/preapproval/${mpSubscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/**
 * Pause a subscription.
 */
export async function pauseMpSubscription(mpSubscriptionId: string) {
  return mpFetch(`/preapproval/${mpSubscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "paused" }),
  });
}

/**
 * Search for a payment by ID to confirm webhook data.
 * Always verify against MP API — never trust webhook payload alone.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPaymentById(paymentId: string): Promise<any> {
  return mpFetch(`/v1/payments/${paymentId}`);
}
