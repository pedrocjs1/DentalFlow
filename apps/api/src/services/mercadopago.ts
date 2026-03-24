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

// Plans in ARS (Argentine Pesos) for sandbox/production
const PLANS_ARS: Record<
  string,
  { reason: string; amount: number; currency: string }
> = {
  STARTER: { reason: "DentalFlow Starter", amount: 89900, currency: "ARS" },
  PROFESSIONAL: { reason: "DentalFlow Professional", amount: 179900, currency: "ARS" },
  ENTERPRISE: { reason: "DentalFlow Enterprise", amount: 269900, currency: "ARS" },
};

export function getPlanDetails(plan: string) {
  const p = PLANS_ARS[plan] ?? PLANS_ARS.PROFESSIONAL;
  return { title: p.reason, price: p.amount, currency: p.currency };
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
  const planConfig = PLANS_ARS[params.plan] ?? PLANS_ARS.PROFESSIONAL;

  const body = {
    reason: planConfig.reason,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: planConfig.amount,
      currency_id: planConfig.currency,
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
