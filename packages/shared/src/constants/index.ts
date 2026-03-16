export const MAX_CAMPAIGNS_STARTER = 5;
export const MAX_CAMPAIGNS_PRO = 50;
export const REMINDER_HOURS_BEFORE = 24;
export const REACTIVATION_MONTHS = 12;
export const MAINTENANCE_REMINDER_MONTHS = 6;
export const BIRTHDAY_DISCOUNT_PERCENT = 15;
export const BIRTHDAY_DISCOUNT_DAYS_VALID = 30;
export const CHATBOT_MAX_TOKENS = 300;
export const CHATBOT_TEMPERATURE = 0.3;
export const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
export const WHATSAPP_API_VERSION = "v21.0";

// Plan pricing (USD/month)
export const PLAN_PRICES: Record<string, number> = {
  STARTER: 150,
  PRO: 300,
  ENTERPRISE: 500,
};

// -1 means unlimited
export const PLAN_LIMITS: Record<string, { whatsappMessages: number; aiInteractions: number; dentists: number }> = {
  STARTER:    { whatsappMessages: 500,  aiInteractions: 250,  dentists: 1  },
  PRO:        { whatsappMessages: 2000, aiInteractions: 1000, dentists: -1 },
  ENTERPRISE: { whatsappMessages: -1,   aiInteractions: -1,   dentists: -1 },
};
export const WHATSAPP_MAX_BUTTONS = 3;
export const WHATSAPP_MAX_LIST_ROWS = 10;
export const CHATBOT_CONTEXT_MESSAGES = 10;
