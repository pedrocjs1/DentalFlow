/**
 * Mercado Pago Service
 *
 * Handles subscription creation, plan changes, and cancellation.
 * Graceful degradation: if MP_ACCESS_TOKEN is not set, all operations return null.
 */

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_API_BASE = "https://api.mercadopago.com";

export function isMercadoPagoConfigured(): boolean {
  return !!(MP_ACCESS_TOKEN && MP_ACCESS_TOKEN !== "APP_USR-...");
}

const PLANS: Record<string, { title: string; price: number; currency: string }> = {
  STARTER: { title: "DentalFlow Starter", price: 99, currency: "USD" },
  PROFESSIONAL: { title: "DentalFlow Professional", price: 199, currency: "USD" },
  ENTERPRISE: { title: "DentalFlow Enterprise", price: 299, currency: "USD" },
};

export function getPlanDetails(plan: string) {
  return PLANS[plan] ?? PLANS.PROFESSIONAL;
}

async function mpFetch(path: string, options: RequestInit = {}) {
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

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[mercadopago] API error ${response.status}: ${errorBody}`);
    throw new Error(`MP API error: ${response.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.json() as Promise<any>;
}

/**
 * Create a subscription preapproval (recurring payment).
 * Returns the init_point URL for the checkout.
 */
export async function createSubscription(params: {
  tenantId: string;
  tenantName: string;
  payerEmail: string;
  plan: string;
  backUrl: string;
}): Promise<{ checkoutUrl: string; mpSubscriptionId: string }> {
  const planDetails = getPlanDetails(params.plan);

  const body = {
    reason: planDetails.title,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: planDetails.price,
      currency_id: planDetails.currency,
    },
    payer_email: params.payerEmail,
    back_url: params.backUrl,
    external_reference: params.tenantId,
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
export async function getSubscriptionStatus(mpSubscriptionId: string) {
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
 * Update subscription amount (plan change).
 */
export async function updateSubscriptionPlan(
  mpSubscriptionId: string,
  newPlan: string
) {
  const planDetails = getPlanDetails(newPlan);

  return mpFetch(`/preapproval/${mpSubscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({
      reason: planDetails.title,
      auto_recurring: {
        transaction_amount: planDetails.price,
        currency_id: planDetails.currency,
      },
    }),
  });
}
