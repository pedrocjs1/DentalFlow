/**
 * Intent Router — Layer 1 (Code-first, 0 tokens)
 *
 * Detects common intents using regex and keyword matching.
 * Runs BEFORE any AI call to save tokens on simple queries.
 * Also detects frustration/complaints for immediate human escalation.
 */

export type RouterIntent =
  | "GREETING"
  | "HOURS"
  | "CANCEL"
  | "LOCATION"
  | "TREATMENTS"
  | "HUMAN"
  | "FRUSTRATION"
  | null;

export interface RouterResult {
  intent: RouterIntent;
  confidence: "high" | "medium" | "low";
}

// ─── Keyword maps per language ────────────────────────────────────────────────

const GREETING_KEYWORDS: Record<string, RegExp[]> = {
  es: [
    /^(hola|buenas?|buen d[ií]a|buenas (tardes|noches)|hey|qué tal|que tal|saludos)\b/i,
  ],
  pt: [/^(oi|olá|ola|bom dia|boa (tarde|noite)|e a[ií])\b/i],
  en: [/^(hi|hello|hey|good (morning|afternoon|evening)|howdy)\b/i],
};

const HOURS_KEYWORDS: Record<string, RegExp[]> = {
  es: [
    /\b(horario|hora de atenci[oó]n|a qu[eé] hora|cu[aá]ndo atienden|est[aá]n abiertos|abren|cierran|d[ií]as de atenci[oó]n)\b/i,
  ],
  pt: [/\b(hor[aá]rio|que horas|quando abrem|est[aã]o abertos|funcionamento)\b/i],
  en: [/\b(hours|schedule|when.*open|opening times|business hours)\b/i],
};

const CANCEL_KEYWORDS: Record<string, RegExp[]> = {
  es: [/\b(cancelar|anular|cancelar mi cita|no (puedo|voy a) ir)\b/i],
  pt: [/\b(cancelar|anular|cancelar (minha )?consulta)\b/i],
  en: [/\b(cancel|cancel my appointment)\b/i],
};

const LOCATION_KEYWORDS: Record<string, RegExp[]> = {
  es: [
    /\b(direcci[oó]n|d[oó]nde est[aá]n|c[oó]mo llego|ubicaci[oó]n|d[oó]nde queda|mapa)\b/i,
  ],
  pt: [/\b(endere[cç]o|onde fica|como chegar|localiza[cç][aã]o)\b/i],
  en: [/\b(address|where.*located|how.*get there|location|directions)\b/i],
};

const TREATMENTS_KEYWORDS: Record<string, RegExp[]> = {
  es: [
    /\b(qu[eé] tratamientos|qu[eé] servicios|precios?|cu[aá]nto (cuesta|sale|vale)|tarifa|lista de precios)\b/i,
  ],
  pt: [
    /\b(que tratamentos|que servi[cç]os|pre[cç]os?|quanto custa|tabela de pre[cç]os)\b/i,
  ],
  en: [/\b(treatments|services|prices?|how much|cost|rates)\b/i],
};

const HUMAN_KEYWORDS: Record<string, RegExp[]> = {
  es: [
    /\b(hablar con (alguien|una persona|un humano)|operador|persona real|recepci[oó]n|atenci[oó]n al cliente)\b/i,
  ],
  pt: [
    /\b(falar com (algu[eé]m|uma pessoa|um humano)|atendente|pessoa real)\b/i,
  ],
  en: [
    /\b(speak.*(someone|person|human)|operator|real person|customer service|receptionist)\b/i,
  ],
};

// ─── Frustration detection (all languages, runs first) ────────────────────────

const FRUSTRATION_KEYWORDS: RegExp[] = [
  // Spanish
  /\b(queja|reclamo|horrible|p[eé]simo|no sirve|mala atenci[oó]n|mal(a)? servicio|quiero hablar con|gerente|supervisor|directora?|inservible|vergüenza|verg[uü]enza|nunca m[aá]s|los voy a denunciar|denunciar)\b/i,
  // Portuguese
  /\b(reclama[cç][aã]o|p[eé]ssimo|horr[ií]vel|n[aã]o funciona|p[eé]ssimo atendimento|quero falar com|gerente|supervisor)\b/i,
  // English
  /\b(complaint|terrible|awful|worst|horrible|unacceptable|disgusting|sue you|lawyer|manager|supervisor)\b/i,
];

// ─── Router function ─────────────────────────────────────────────────────────

export function routeIntent(
  message: string,
  botLanguage: string = "es"
): RouterResult {
  const trimmed = message.trim();

  // Empty message
  if (!trimmed) {
    return { intent: null, confidence: "low" };
  }

  // 1. FRUSTRATION — always checked first, before any other intent
  for (const re of FRUSTRATION_KEYWORDS) {
    if (re.test(trimmed)) {
      return { intent: "FRUSTRATION", confidence: "high" };
    }
  }

  // 2. HUMAN request — check before other intents
  const humanPatterns = [
    ...(HUMAN_KEYWORDS[botLanguage] ?? []),
    ...(botLanguage !== "es" ? (HUMAN_KEYWORDS.es ?? []) : []),
  ];
  for (const re of humanPatterns) {
    if (re.test(trimmed)) {
      return { intent: "HUMAN", confidence: "high" };
    }
  }

  // 3. Check other intents
  const intentMap: Array<{
    intent: RouterIntent;
    keywords: Record<string, RegExp[]>;
  }> = [
    { intent: "CANCEL", keywords: CANCEL_KEYWORDS },
    { intent: "HOURS", keywords: HOURS_KEYWORDS },
    { intent: "LOCATION", keywords: LOCATION_KEYWORDS },
    { intent: "TREATMENTS", keywords: TREATMENTS_KEYWORDS },
    { intent: "GREETING", keywords: GREETING_KEYWORDS },
  ];

  for (const { intent, keywords } of intentMap) {
    const patterns = [
      ...(keywords[botLanguage] ?? []),
      // Always also check Spanish as fallback (most patients are Spanish-speaking)
      ...(botLanguage !== "es" ? (keywords.es ?? []) : []),
    ];
    for (const re of patterns) {
      if (re.test(trimmed)) {
        // Short messages with exact match → high confidence
        // Longer messages → medium (might need AI for nuance)
        const confidence =
          trimmed.split(/\s+/).length <= 5 ? "high" : "medium";
        return { intent, confidence };
      }
    }
  }

  // No match — needs AI
  return { intent: null, confidence: "low" };
}
