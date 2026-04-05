import { prisma } from "@dentiqa/db";

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface MetaComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: string;
  text?: string;
  example?: { body_text?: string[][]; header_text?: string[] };
  buttons?: MetaButton[];
}

interface MetaButton {
  type: "URL" | "PHONE_NUMBER" | "QUICK_REPLY";
  text: string;
  url?: string;
  phone_number?: string;
}

interface Variable {
  position: number;
  field: string;
  example: string;
}

interface MetaTemplateResponse {
  id?: string;
  status?: string;
  category?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface MetaTemplateListItem {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  quality_score?: { score?: string };
  rejected_reason?: string;
}

interface MetaTemplateListResponse {
  data?: MetaTemplateListItem[];
  paging?: { cursors?: { after?: string }; next?: string };
  error?: { message?: string; code?: number };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function parseVariables(raw: unknown): Variable[] {
  if (!raw) return [];
  // Handle double-stringified JSON from DB
  let parsed = raw;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((v: Record<string, unknown>) => v && typeof v.position === "number")
    .map((v: Record<string, unknown>) => ({
      position: v.position as number,
      field: String(v.field ?? ""),
      example: String(v.example ?? v.exampleValue ?? v.sampleValue ?? `ejemplo`),
    }))
    .sort((a: Variable, b: Variable) => a.position - b.position);
}

function buildComponents(template: {
  headerType?: string | null;
  headerText?: string | null;
  bodyText: string;
  footerText?: string | null;
  buttonsJson?: unknown;
  variablesJson?: unknown;
}): MetaComponent[] {
  const components: MetaComponent[] = [];

  // Parse variables robustly — handles null, string, double-stringified, wrong field names
  const sortedVars = parseVariables(template.variablesJson);
  console.log("[buildComponents] variablesJson raw:", JSON.stringify(template.variablesJson));
  console.log("[buildComponents] parsed sortedVars:", JSON.stringify(sortedVars));

  let headerVarCount = 0;

  // Header
  if (template.headerType && template.headerType !== "NONE" && template.headerText) {
    const headerComponent: MetaComponent = {
      type: "HEADER",
      format: template.headerType,
      text: template.headerText,
    };
    // If header has variables ({{1}} etc.), add example
    const headerMatches = template.headerText.match(/\{\{\d+\}\}/g);
    if (headerMatches && headerMatches.length > 0) {
      headerVarCount = headerMatches.length;
      const headerExamples = sortedVars.length >= headerVarCount
        ? sortedVars.slice(0, headerVarCount).map((v) => v.example)
        : headerMatches.map((_, i) => `ejemplo${i + 1}`);
      headerComponent.example = {
        header_text: headerExamples,
      };
      console.log("[buildComponents] HEADER component:", JSON.stringify(headerComponent));
    }
    components.push(headerComponent);
  }

  // Body (always required)
  const bodyComponent: MetaComponent = {
    type: "BODY",
    text: template.bodyText,
  };

  // If body has variables, add example (Meta REQUIRES this for approval)
  const bodyVarMatches = template.bodyText.match(/\{\{\d+\}\}/g);
  if (bodyVarMatches && bodyVarMatches.length > 0) {
    // Skip header vars — body vars start after headerVarCount
    const bodyVars = sortedVars.slice(headerVarCount);
    const examples: string[] = bodyVarMatches.map((_, i) => {
      const v = bodyVars[i];
      return (v && v.example) ? String(v.example) : `ejemplo${i + 1}`;
    });
    // Meta requires body_text as array of arrays: [["val1","val2",...]]
    bodyComponent.example = { body_text: [examples] };
  }

  console.log("[buildComponents] BODY component:", JSON.stringify(bodyComponent));
  components.push(bodyComponent);

  // Footer
  if (template.footerText) {
    components.push({
      type: "FOOTER",
      text: template.footerText,
    });
  }

  // Buttons
  if (template.buttonsJson) {
    const buttons = template.buttonsJson as MetaButton[];
    if (Array.isArray(buttons) && buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons,
      });
    }
  }

  return components;
}

function mapMetaStatus(metaStatus: string): string {
  // Meta status values → our internal status
  const statusMap: Record<string, string> = {
    APPROVED: "APPROVED",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
    PAUSED: "PAUSED",
    DISABLED: "DISABLED",
    IN_APPEAL: "PENDING",
    PENDING_DELETION: "DISABLED",
    DELETED: "DISABLED",
    LIMIT_EXCEEDED: "DISABLED",
  };
  return statusMap[metaStatus] ?? "PENDING";
}

// ─── Service Functions ──────────────────────────────────────────────────────────

/**
 * Submit a template to Meta for approval.
 */
export async function submitTemplate(
  templateId: string,
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string; metaTemplateId?: string }> {
  const template = await prisma.whatsAppTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return { success: false, error: "Template no encontrado" };
  }

  if (template.status !== "DRAFT" && template.status !== "REJECTED") {
    return { success: false, error: `No se puede enviar un template con estado ${template.status}` };
  }

  const components = buildComponents(template);

  const payload = {
    name: template.name,
    language: template.language,
    category: template.category,
    allow_category_change: true,
    components,
  };

  try {
    console.log(`[TEMPLATE SUBMIT] POST ${META_GRAPH_URL}/${wabaId}/message_templates`);
    console.log("[TEMPLATE SUBMIT] Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(`${META_GRAPH_URL}/${wabaId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as MetaTemplateResponse;
    if (data.error) {
      console.error("[TEMPLATE SUBMIT] Meta error response:", JSON.stringify(data.error, null, 2));
    } else {
      console.log("[TEMPLATE SUBMIT] Success:", JSON.stringify({ id: data.id, status: data.status }));
    }

    if (data.error) {
      const errorMsg = `Meta API error (${data.error.code}): ${data.error.message}`;

      // Log event
      await prisma.templateEvent.create({
        data: {
          templateId,
          event: template.status === "REJECTED" ? "resubmitted" : "submitted",
          details: `Error: ${errorMsg}`,
          metadata: data.error as object,
        },
      });

      // Keep current status on error
      return { success: false, error: errorMsg };
    }

    // Success — update template
    const now = new Date();
    await prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: {
        status: "PENDING",
        metaTemplateId: data.id ?? null,
        metaStatus: data.status ?? "PENDING",
        submittedAt: now,
        lastCheckedAt: now,
        rejectionReason: null,
        rejectedAt: null,
      },
    });

    // Log event
    await prisma.templateEvent.create({
      data: {
        templateId,
        event: template.status === "REJECTED" ? "resubmitted" : "submitted",
        details: `Enviado a Meta. ID: ${data.id ?? "N/A"}`,
        metadata: { metaTemplateId: data.id, status: data.status },
      },
    });

    return { success: true, metaTemplateId: data.id ?? undefined };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido";
    await prisma.templateEvent.create({
      data: {
        templateId,
        event: "submitted",
        details: `Error de red: ${errorMsg}`,
      },
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Check the status of a single template on Meta.
 */
export async function checkTemplateStatus(
  templateId: string,
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  const template = await prisma.whatsAppTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return { success: false, error: "Template no encontrado" };
  }

  if (!template.metaTemplateId && !template.name) {
    return { success: false, error: "Template sin ID de Meta" };
  }

  try {
    const url = `${META_GRAPH_URL}/${wabaId}/message_templates?name=${encodeURIComponent(template.name)}&limit=10`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = (await res.json()) as MetaTemplateListResponse;

    if (data.error) {
      return { success: false, error: `Meta API error: ${data.error.message}` };
    }

    const match = data.data?.find(
      (t) => t.name === template.name && t.language === template.language
    );

    if (!match) {
      await prisma.templateEvent.create({
        data: {
          templateId,
          event: "status_check",
          details: "Template no encontrado en Meta",
        },
      });
      return { success: true, status: template.status };
    }

    const newStatus = mapMetaStatus(match.status);
    const now = new Date();

    const updateData: Record<string, unknown> = {
      metaStatus: match.status,
      metaTemplateId: match.id,
      qualityScore: match.quality_score?.score ?? null,
      lastCheckedAt: now,
    };

    // Update status-specific fields
    if (newStatus !== template.status) {
      updateData.status = newStatus;
      if (newStatus === "APPROVED" && !template.approvedAt) {
        updateData.approvedAt = now;
      }
      if (newStatus === "REJECTED") {
        updateData.rejectedAt = now;
        updateData.rejectionReason = match.rejected_reason ?? null;
      }
    }

    await prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    // Log event
    await prisma.templateEvent.create({
      data: {
        templateId,
        event: newStatus !== template.status ? newStatus.toLowerCase() : "status_check",
        details:
          newStatus !== template.status
            ? `Estado cambió de ${template.status} a ${newStatus}`
            : `Estado: ${newStatus}. Quality: ${match.quality_score?.score ?? "N/A"}`,
        metadata: {
          metaStatus: match.status,
          qualityScore: match.quality_score?.score,
          rejectedReason: match.rejected_reason,
        },
      },
    });

    return { success: true, status: newStatus };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: errorMsg };
  }
}

/**
 * Sync all templates with Meta (bulk status check).
 */
export async function syncAllTemplates(
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    // Get all templates from Meta
    let allMetaTemplates: MetaTemplateListItem[] = [];
    let nextUrl: string | null = `${META_GRAPH_URL}/${wabaId}/message_templates?limit=100`;

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as MetaTemplateListResponse;

      if (data.error) {
        return { success: false, updated: 0, error: `Meta API error: ${data.error.message}` };
      }

      if (data.data) {
        allMetaTemplates = allMetaTemplates.concat(data.data);
      }

      nextUrl = data.paging?.next ?? null;
    }

    // Get our submitted/pending/approved templates
    const ourTemplates = await prisma.whatsAppTemplate.findMany({
      where: {
        status: { in: ["DRAFT", "SUBMITTED", "PENDING", "APPROVED", "PAUSED"] },
      },
    });

    let updated = 0;
    const now = new Date();

    for (const tpl of ourTemplates) {
      const match = allMetaTemplates.find(
        (m) => m.name === tpl.name && m.language === tpl.language
      );

      if (!match) continue;

      const newStatus = mapMetaStatus(match.status);
      if (newStatus === tpl.status && tpl.metaTemplateId === match.id) {
        // Only update lastCheckedAt
        await prisma.whatsAppTemplate.update({
          where: { id: tpl.id },
          data: { lastCheckedAt: now, qualityScore: match.quality_score?.score ?? null },
        });
        continue;
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        metaStatus: match.status,
        metaTemplateId: match.id,
        qualityScore: match.quality_score?.score ?? null,
        lastCheckedAt: now,
      };

      if (newStatus === "APPROVED" && !tpl.approvedAt) {
        updateData.approvedAt = now;
      }
      if (newStatus === "REJECTED") {
        updateData.rejectedAt = now;
        updateData.rejectionReason = match.rejected_reason ?? null;
      }

      await prisma.whatsAppTemplate.update({
        where: { id: tpl.id },
        data: updateData,
      });

      await prisma.templateEvent.create({
        data: {
          templateId: tpl.id,
          event: "status_check",
          details: `Sync: ${tpl.status} → ${newStatus}`,
          metadata: { metaStatus: match.status, qualityScore: match.quality_score?.score },
        },
      });

      updated++;
    }

    return { success: true, updated };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, updated: 0, error: errorMsg };
  }
}

/**
 * Delete a template from Meta.
 */
export async function deleteTemplateFromMeta(
  templateName: string,
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${META_GRAPH_URL}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = (await res.json()) as { success?: boolean; error?: { message?: string; code?: number } };

    if (data.error) {
      return { success: false, error: `Meta API error: ${data.error.message}` };
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: errorMsg };
  }
}
