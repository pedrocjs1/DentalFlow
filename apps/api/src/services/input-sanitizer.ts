/**
 * Input Sanitizer — prevents XSS, HTML injection, and prompt injection.
 */

/**
 * Strip HTML tags from user input to prevent XSS when rendered.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

/**
 * Sanitize text input: strip HTML, limit length, trim.
 */
export function sanitizeText(input: string, maxLength = 5000): string {
  return stripHtml(input).trim().slice(0, maxLength);
}

/**
 * Sanitize a WhatsApp message before passing to the LLM.
 * Strips known prompt injection patterns without destroying the user's message.
 */
export function sanitizeForLLM(input: string): string {
  let sanitized = input;

  // Remove known prompt injection patterns
  const injectionPatterns = [
    /\n\n(Human|Assistant|System|Developer|User):/gi,
    /<\|system\|>/gi,
    /<\|user\|>/gi,
    /<\|assistant\|>/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<<SYS>>/gi,
    /<\/SYS>/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /<\|endoftext\|>/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized.trim();
}

/**
 * Detect likely prompt injection attempts. Returns true if suspicious.
 */
export function detectPromptInjection(input: string): boolean {
  const lower = input.toLowerCase();
  const suspiciousPatterns = [
    "ignor", // "ignorá las instrucciones"
    "system prompt",
    "system:",
    "developer:",
    "actúa como",
    "actua como",
    "sos ahora",
    "pretend you",
    "you are now",
    "ignore previous",
    "ignore above",
    "ignore all",
    "disregard",
    "forget your instructions",
    "new instructions",
    "override",
    "jailbreak",
    "dan mode",
    "developer mode",
  ];

  // Only flag if combined with injection-like context
  let score = 0;
  for (const pattern of suspiciousPatterns) {
    if (lower.includes(pattern)) score++;
  }

  // 2+ matches = likely injection attempt
  return score >= 2;
}

/**
 * Check LLM output for accidental data leaks.
 */
export function sanitizeLLMOutput(output: string): string {
  let sanitized = output;

  // Remove anything that looks like an API key or token
  sanitized = sanitized.replace(/sk-ant-[a-zA-Z0-9_-]+/g, "[REDACTED]");
  sanitized = sanitized.replace(/Bearer [a-zA-Z0-9_-]+/g, "[REDACTED]");
  sanitized = sanitized.replace(/TEST-[a-f0-9-]+/g, "[REDACTED]");
  sanitized = sanitized.replace(/APP_USR-[a-f0-9-]+/g, "[REDACTED]");

  // Remove anything that looks like a cuid
  // Only if surrounded by context like "tenantId: " — don't strip random IDs
  sanitized = sanitized.replace(/(tenantId|userId|patientId):\s*c[a-z0-9]{20,}/gi, "$1: [REDACTED]");

  return sanitized;
}

/**
 * Validate file upload MIME type and magic bytes.
 */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
};

export function validateFileUpload(
  mimeType: string,
  base64Data: string,
  maxSizeBytes = 10 * 1024 * 1024 // 10MB
): { valid: boolean; error?: string } {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Tipo de archivo no permitido: ${mimeType}` };
  }

  // Check size (base64 is ~33% larger than binary)
  const estimatedSize = (base64Data.length * 3) / 4;
  if (estimatedSize > maxSizeBytes) {
    return { valid: false, error: `Archivo demasiado grande (máx ${maxSizeBytes / 1024 / 1024}MB)` };
  }

  // Check magic bytes
  const expectedMagic = MAGIC_BYTES[mimeType];
  if (expectedMagic) {
    try {
      const buffer = Buffer.from(base64Data.slice(0, 20), "base64");
      const matches = expectedMagic.every((byte, i) => buffer[i] === byte);
      if (!matches) {
        return { valid: false, error: "El contenido del archivo no coincide con el tipo declarado" };
      }
    } catch {
      return { valid: false, error: "Datos del archivo inválidos" };
    }
  }

  // Block dangerous extensions embedded in SVG or HTML
  if (mimeType === "image/svg+xml") {
    return { valid: false, error: "Archivos SVG no permitidos por seguridad" };
  }

  return { valid: true };
}
