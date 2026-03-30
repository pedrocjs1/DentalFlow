export const MAX_CAMPAIGNS_STARTER = 5;
export const MAX_CAMPAIGNS_PROFESSIONAL = 50;
export const REMINDER_HOURS_BEFORE = 24;
export const REACTIVATION_MONTHS = 12;
export const MAINTENANCE_REMINDER_MONTHS = 6;
export const BIRTHDAY_DISCOUNT_PERCENT = 15;
export const BIRTHDAY_DISCOUNT_DAYS_VALID = 30;
export const CHATBOT_MAX_TOKENS = 300;
export const CHATBOT_TEMPERATURE = 0.3;
export const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
export const WHATSAPP_API_VERSION = "v21.0";

// Plan pricing (USD/month)
export const PLAN_PRICES: Record<string, number> = {
  STARTER: 89,
  PROFESSIONAL: 149,
  ENTERPRISE: 249,
};

// -1 means unlimited
export const PLAN_LIMITS: Record<string, { whatsappMessages: number; aiInteractions: number; users: number }> = {
  STARTER:      { whatsappMessages: 2000,  aiInteractions: 2000,  users: 5   },
  PROFESSIONAL: { whatsappMessages: 5000,  aiInteractions: 5000,  users: 10  },
  ENTERPRISE:   { whatsappMessages: 10000, aiInteractions: 10000, users: -1  },
};

// Extra block pricing
export const AI_EXTRA_BLOCK_SIZE = 1000;  // calls per block
export const AI_EXTRA_BLOCK_PRICE = 20;   // USD per block

// Usage thresholds for notifications
export const USAGE_WARNING_THRESHOLD = 0.8;  // 80%
export const USAGE_LIMIT_THRESHOLD = 1.0;    // 100%
export const WHATSAPP_MAX_BUTTONS = 3;
export const WHATSAPP_MAX_LIST_ROWS = 10;
export const CHATBOT_CONTEXT_MESSAGES = 10;
export const SONNET_MODEL = "claude-sonnet-4-20250514";

// Bot tone options
export const BOT_TONES = ["formal", "friendly", "casual"] as const;
export type BotTone = (typeof BOT_TONES)[number];

// Bot language options
export const BOT_LANGUAGES = ["es", "pt", "en"] as const;
export type BotLanguage = (typeof BOT_LANGUAGES)[number];

// Lead recontact options (hours)
export const LEAD_RECONTACT_OPTIONS = [0, 2, 4, 12, 24] as const;

// Sonnet costs 3x Haiku for usage tracking
export const SONNET_USAGE_MULTIPLIER = 3;
