"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignType =
  | "MANUAL"
  | "BIRTHDAY"
  | "REMINDER_6M"
  | "REMINDER_24H"
  | "REACTIVATION"
  | "PROMO"
  | "WELCOME"
  | "POST_VISIT"
  | "CUSTOM";

type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED";

type Channel = "WHATSAPP" | "EMAIL" | "SMS";

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  channel: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalReplied: number;
  totalClicked: number;
  messageContent: string | null;
  subject: string | null;
  segmentFilter: unknown;
  triggerType: string | null;
  triggerConfig: unknown;
  createdAt: string;
  _count: { sends: number };
}

interface PipelineStage {
  id: string;
  name: string;
}

interface WizardData {
  // Step 1
  type: CampaignType | "";
  name: string;
  // Step 2
  channel: Channel;
  messageContent: string;
  subject: string;
  // Step 3
  filterTags: string[];
  filterTagInput: string;
  filterLastVisitGt: string;
  filterLastVisitLt: string;
  filterPipelineStageId: string;
  filterAgeMin: string;
  filterAgeMax: string;
  filterGender: string;
  // Step 4
  sendNow: boolean;
  scheduledAt: string;
  triggerEnabled: boolean;
  allowedHoursStart: string;
  allowedHoursEnd: string;
}

const INITIAL_WIZARD: WizardData = {
  type: "",
  name: "",
  channel: "WHATSAPP",
  messageContent: "",
  subject: "",
  filterTags: [],
  filterTagInput: "",
  filterLastVisitGt: "",
  filterLastVisitLt: "",
  filterPipelineStageId: "",
  filterAgeMin: "",
  filterAgeMax: "",
  filterGender: "",
  sendNow: true,
  scheduledAt: "",
  triggerEnabled: false,
  allowedHoursStart: "9",
  allowedHoursEnd: "20",
};

// ─── Campaign type config ─────────────────────────────────────────────────────

interface TypeConfig {
  label: string;
  icon: string;
  description: string;
  isAutomatic: boolean;
  triggerDescription?: string;
  defaultName: string;
  defaultMessage: string;
}

const TYPE_CONFIG: Record<CampaignType, TypeConfig> = {
  MANUAL: {
    label: "Manual",
    icon: "📢",
    description: "Enviá manualmente a pacientes filtrados",
    isAutomatic: false,
    defaultName: "Campaña Manual",
    defaultMessage: "¡Hola {nombre}! 😊 Queremos contarte sobre las novedades de {clinica}.",
  },
  BIRTHDAY: {
    label: "Cumpleaños",
    icon: "🎂",
    description: "Se envía el día del cumpleaños del paciente",
    isAutomatic: true,
    triggerDescription:
      "Se envía automáticamente el día del cumpleaños del paciente, dentro del horario de envío configurado.",
    defaultName: "Feliz Cumpleaños + 15% Descuento",
    defaultMessage:
      "¡Feliz cumpleaños {nombre}! 🎂🦷 En *{clinica}* te regalamos un *15% de descuento* en tu próxima consulta. ¡Válido por 30 días!",
  },
  REMINDER_6M: {
    label: "Recordatorio 6 Meses",
    icon: "🦷",
    description: "Recuerda hacer el control a los 6 meses de la última cita",
    isAutomatic: true,
    triggerDescription:
      "Se envía automáticamente 6 meses después de la última cita completada del paciente.",
    defaultName: "Recordatorio Control 6 Meses",
    defaultMessage:
      "¡Hola {nombre}! 😊 Han pasado 6 meses desde tu última visita a *{clinica}*. ¿Agendamos tu control? Tu salud bucal es nuestra prioridad.",
  },
  REMINDER_24H: {
    label: "Recordatorio 24h",
    icon: "📅",
    description: "Recuerda la cita 24 horas antes",
    isAutomatic: true,
    triggerDescription:
      "Se envía automáticamente 24 horas antes de cada cita agendada en el sistema.",
    defaultName: "Recordatorio de Cita 24h",
    defaultMessage:
      "¡Hola {nombre}! 📅 Te recordamos tu cita mañana en *{clinica}*. Si necesitás reprogramar, escribinos. ¡Te esperamos! 😊",
  },
  REACTIVATION: {
    label: "Reactivación",
    icon: "🔄",
    description: "Reactiva pacientes inactivos por más de 12 meses",
    isAutomatic: false,
    defaultName: "Reactivación de Inactivos",
    defaultMessage:
      "¡Hola {nombre}! 😊 Hace tiempo que no sabemos de vos en *{clinica}*. ¿Cómo estás? ¿Te gustaría agendar un control? Tu sonrisa nos importa 🦷",
  },
  PROMO: {
    label: "Promoción",
    icon: "✨",
    description: "Promos y ofertas especiales para tus pacientes",
    isAutomatic: false,
    defaultName: "Promo Especial",
    defaultMessage:
      "¡Hola {nombre}! 🦷✨ Tenemos una promo especial en *{clinica}*: {descuento} de descuento este mes. ¡No te la perdás!",
  },
  WELCOME: {
    label: "Bienvenida",
    icon: "👋",
    description: "Se envía al registrar un nuevo paciente",
    isAutomatic: true,
    triggerDescription:
      "Se envía automáticamente cuando se registra un nuevo paciente en el sistema.",
    defaultName: "Bienvenida Nuevo Paciente",
    defaultMessage:
      "¡Bienvenido/a a *{clinica}*, {nombre}! 😊🦷 Estamos muy felices de tenerte como paciente. Cualquier consulta, escribinos. ¡Nos vemos pronto!",
  },
  POST_VISIT: {
    label: "Post-Visita",
    icon: "💬",
    description: "Se envía 2h después de completar una cita",
    isAutomatic: true,
    triggerDescription:
      "Se envía automáticamente 2 horas después de que una cita es marcada como completada.",
    defaultName: "Agradecimiento Post-Visita",
    defaultMessage:
      "¡Gracias por visitarnos, {nombre}! 😊 Esperamos que tu cita en *{clinica}* haya sido de tu agrado. Si tenés alguna consulta, escribinos. ¡Hasta pronto! 🦷",
  },
  CUSTOM: {
    label: "Personalizada",
    icon: "⚙️",
    description: "Creá tu propia campaña con trigger y audiencia personalizada",
    isAutomatic: false,
    defaultName: "Campaña Personalizada",
    defaultMessage: "¡Hola {nombre}! 😊 Tenemos algo especial para vos en *{clinica}*.",
  },
};

// ─── Template catalog ─────────────────────────────────────────────────────────

interface CatalogTemplate {
  id: string;
  name: string;
  type: CampaignType;
  category: string;
  preview: string;
  message: string;
}

const CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    id: "tpl-reminder-friendly",
    name: "Recordatorio amigable",
    type: "REMINDER_24H",
    category: "Recordatorios",
    preview: "¡Hola {nombre}! Te recordamos tu cita mañana en {clinica} 📅",
    message:
      "¡Hola {nombre}! 📅 Te recordamos tu cita mañana en *{clinica}*. ¡Te esperamos! Si necesitás reprogramar, escribinos con anticipación. 😊",
  },
  {
    id: "tpl-reminder-formal",
    name: "Recordatorio formal",
    type: "REMINDER_24H",
    category: "Recordatorios",
    preview: "Estimado/a {nombre}, le recordamos su cita de mañana.",
    message:
      "Estimado/a {nombre}, le recordamos su cita programada para mañana en *{clinica}*. Ante cualquier inconveniente, comuníquese con nosotros. Gracias.",
  },
  {
    id: "tpl-birthday-discount",
    name: "Cumpleaños con descuento",
    type: "BIRTHDAY",
    category: "Fidelización",
    preview: "¡Feliz cumpleaños {nombre}! 🎂 Te regalamos 15% de descuento",
    message:
      "¡Feliz cumpleaños {nombre}! 🎂🦷 En *{clinica}* celebramos tu día con un *15% de descuento* en tu próxima consulta. ¡Válido por 30 días! Reservá tu turno escribiéndonos.",
  },
  {
    id: "tpl-birthday-warm",
    name: "Cumpleaños cariñoso",
    type: "BIRTHDAY",
    category: "Fidelización",
    preview: "¡Muchas felicidades {nombre}! 🌟 Un abrazo de {clinica}",
    message:
      "¡Muchas felicidades, {nombre}! 🌟🎉 Todo el equipo de *{clinica}* te desea un hermoso cumpleaños lleno de salud y sonrisas 🦷 ¡Gracias por confiar en nosotros!",
  },
  {
    id: "tpl-6m-casual",
    name: "Control 6 meses casual",
    type: "REMINDER_6M",
    category: "Recordatorios",
    preview: "¡Hola {nombre}! Pasaron 6 meses, ¿agendamos tu control?",
    message:
      "¡Hola {nombre}! 😊 Han pasado 6 meses desde tu última visita a *{clinica}*. ¿Agendamos tu control de rutina? Tu salud bucal es muy importante. ¡Escribinos para coordinar!",
  },
  {
    id: "tpl-6m-professional",
    name: "Control 6 meses profesional",
    type: "REMINDER_6M",
    category: "Recordatorios",
    preview: "Es tiempo de tu control semestral en {clinica}",
    message:
      "Hola {nombre}, desde *{clinica}* queremos recordarle que es momento de realizar su control dental semestral. La prevención es la mejor protección para su salud bucal. ¿Le agendamos?",
  },
  {
    id: "tpl-promo-cleaning",
    name: "2x1 Limpieza dental",
    type: "PROMO",
    category: "Promociones",
    preview: "¡2x1 en limpieza! Traé un amigo y los dos pagan uno 🦷",
    message:
      "¡Hola {nombre}! 🦷✨ Promo especial en *{clinica}* solo este mes: ¡*2x1 en limpieza dental*! Traé un familiar o amigo y los dos pagan una sola consulta. ¡Cupos limitados, reservá ya!",
  },
  {
    id: "tpl-promo-whitening",
    name: "Blanqueamiento con descuento",
    type: "PROMO",
    category: "Promociones",
    preview: "¡Sonrisa perfecta! Blanqueamiento con 20% off este mes ✨",
    message:
      "¡Hola {nombre}! ✨ ¿Querés una sonrisa más brillante? Este mes en *{clinica}* tenemos *20% de descuento en blanqueamiento dental*. ¡Consultanos para más info y reservar tu turno!",
  },
  {
    id: "tpl-promo-ortho",
    name: "Consulta de ortodoncia",
    type: "PROMO",
    category: "Promociones",
    preview: "¡Consultá por nuestros planes de ortodoncia sin interés!",
    message:
      "¡Hola {nombre}! 😁 ¿Estás pensando en mejorar tu sonrisa? En *{clinica}* tenemos planes de ortodoncia *sin interés en 12 cuotas*. Agendá tu consulta gratuita y te asesoramos sin compromiso.",
  },
  {
    id: "tpl-welcome-warm",
    name: "Bienvenida amigable",
    type: "WELCOME",
    category: "Fidelización",
    preview: "¡Bienvenido/a a {clinica}, {nombre}! 😊🦷",
    message:
      "¡Bienvenido/a a *{clinica}*, {nombre}! 😊🦷 Estamos muy felices de tenerte como paciente. Estamos acá para cuidar tu sonrisa. Cualquier consulta o para agendar, escribinos. ¡Nos vemos pronto!",
  },
  {
    id: "tpl-welcome-formal",
    name: "Bienvenida formal",
    type: "WELCOME",
    category: "Fidelización",
    preview: "Estimado/a {nombre}, bienvenido/a a {clinica}",
    message:
      "Estimado/a {nombre}, es un placer darle la bienvenida a *{clinica}*. Nuestro equipo está a su disposición para brindarle la mejor atención odontológica. Ante cualquier consulta, no dude en comunicarse con nosotros.",
  },
  {
    id: "tpl-post-visit-warm",
    name: "Post-visita cariñoso",
    type: "POST_VISIT",
    category: "Fidelización",
    preview: "¡Gracias por visitarnos, {nombre}! Esperamos verte pronto 🦷",
    message:
      "¡Gracias por visitarnos hoy, {nombre}! 😊 Esperamos que tu cita en *{clinica}* haya sido cómoda. Seguí las indicaciones del doctor y ante cualquier molestia, escribinos sin dudar. ¡Hasta la próxima! 🦷",
  },
  {
    id: "tpl-survey",
    name: "Encuesta de satisfacción",
    type: "CUSTOM",
    category: "Fidelización",
    preview: "¿Cómo fue tu experiencia en {clinica}? Del 1 al 5 🌟",
    message:
      "¡Hola {nombre}! 🌟 ¿Cómo calificarías tu experiencia en *{clinica}*? Tu opinión nos ayuda a seguir mejorando 😊\n\n1️⃣ Muy mala\n2️⃣ Mala\n3️⃣ Regular\n4️⃣ Buena\n5️⃣ Excelente\n\n¡Muchas gracias por tu tiempo!",
  },
  {
    id: "tpl-reactivation-soft",
    name: "Reactivación suave",
    type: "REACTIVATION",
    category: "Reactivación",
    preview: "¡Hola {nombre}! Hace tiempo que no te vemos por {clinica} 😊",
    message:
      "¡Hola {nombre}! 😊 Hace un tiempo que no sabemos de vos en *{clinica}* y quisiéramos saber cómo estás. ¿Te gustaría agendar un control dental? Estamos acá para cuidar tu sonrisa 🦷",
  },
  {
    id: "tpl-reactivation-discount",
    name: "Reactivación con descuento",
    type: "REACTIVATION",
    category: "Reactivación",
    preview: "¡{nombre}, te extrañamos! Volvé con 10% de descuento 🦷",
    message:
      "¡Hola {nombre}! 💙 Te extrañamos en *{clinica}*. Como gesto especial, te ofrecemos un *10% de descuento* en tu próxima consulta si la agendás este mes. ¡Escribinos para reservar!",
  },
];

// ─── Status & channel config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; color: string; bg: string }
> = {
  DRAFT: {
    label: "Borrador",
    color: "text-gray-600",
    bg: "bg-gray-100",
  },
  SCHEDULED: {
    label: "Programada",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  SENDING: {
    label: "Enviando",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  COMPLETED: {
    label: "Completada",
    color: "text-green-700",
    bg: "bg-green-100",
  },
  PAUSED: {
    label: "Pausada",
    color: "text-orange-700",
    bg: "bg-orange-100",
  },
  CANCELLED: {
    label: "Cancelada",
    color: "text-red-700",
    bg: "bg-red-100",
  },
};

const CHANNEL_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  WHATSAPP: { label: "WhatsApp", icon: "💬", color: "text-green-600" },
  EMAIL: { label: "Email", icon: "📧", color: "text-blue-600" },
  SMS: { label: "SMS", icon: "📱", color: "text-purple-600" },
  WEB_CHAT: { label: "Web Chat", icon: "🌐", color: "text-gray-600" },
};

// ─── Preview variables ────────────────────────────────────────────────────────

const PREVIEW_VARS: Record<string, string> = {
  "{nombre}": "María García",
  "{clinica}": "Clínica Demo",
  "{tratamiento}": "Limpieza",
  "{fecha}": "15/04/2026",
  "{hora}": "10:30",
  "{descuento}": "15%",
};

function renderPreview(text: string): string {
  let result = text;
  for (const [variable, value] of Object.entries(PREVIEW_VARS)) {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  // WhatsApp bold
  result = result.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
  // Line breaks
  result = result.replace(/\n/g, "<br/>");
  return result;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return { toast, showToast: setToast };
}

function Toast({
  toast,
}: {
  toast: { type: "success" | "error"; message: string } | null;
}) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
        toast.type === "success" ? "bg-primary-600" : "bg-red-500"
      }`}
    >
      {toast.type === "success" ? "✓ " : "✕ "}
      {toast.message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CampanasClient() {
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"list" | "templates">("list");

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardData, setWizardData] = useState<WizardData>(INITIAL_WIZARD);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Segment filter helpers
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [segmentCount, setSegmentCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  // Action menu
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Setup defaults state
  const [settingUpDefaults, setSettingUpDefaults] = useState(false);

  // ── Load campaigns ──────────────────────────────────────────────────────────

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await apiFetch<Campaign[]>("/api/v1/campaigns");
      setCampaigns(data);
    } catch {
      showToast({ type: "error", message: "Error al cargar campañas" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Polling: refresh campaigns every 30s when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) loadCampaigns();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadCampaigns]);

  // ── Close action menu on outside click ────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      ) {
        setActionMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Load pipeline stages for segment filter ─────────────────────────────

  useEffect(() => {
    if (wizardOpen && wizardStep === 3) {
      apiFetch<{ stages: PipelineStage[] }>("/api/v1/pipeline/stages")
        .then((d) => setPipelineStages(d.stages ?? []))
        .catch(() => {});
    }
  }, [wizardOpen, wizardStep]);

  // ── Segment count ───────────────────────────────────────────────────────────

  const fetchSegmentCount = useCallback(async () => {
    const params = new URLSearchParams();
    if (wizardData.filterTags.length > 0)
      params.set("tags", wizardData.filterTags.join(","));
    if (wizardData.filterLastVisitGt)
      params.set("lastVisitMoreThanMonths", wizardData.filterLastVisitGt);
    if (wizardData.filterLastVisitLt)
      params.set("lastVisitLessThanMonths", wizardData.filterLastVisitLt);
    if (wizardData.filterPipelineStageId)
      params.set("pipelineStageId", wizardData.filterPipelineStageId);
    if (wizardData.filterAgeMin) params.set("ageMin", wizardData.filterAgeMin);
    if (wizardData.filterAgeMax) params.set("ageMax", wizardData.filterAgeMax);
    if (wizardData.filterGender) params.set("gender", wizardData.filterGender);

    setCountLoading(true);
    try {
      const { count } = await apiFetch<{ count: number }>(
        `/api/v1/campaigns/segment-count?${params.toString()}`
      );
      setSegmentCount(count);
    } catch {
      setSegmentCount(null);
    } finally {
      setCountLoading(false);
    }
  }, [wizardData]);

  // ── Wizard helpers ──────────────────────────────────────────────────────────

  function openCreateWizard() {
    setWizardData(INITIAL_WIZARD);
    setEditingId(null);
    setWizardStep(1);
    setSegmentCount(null);
    setWizardOpen(true);
  }

  function openEditWizard(campaign: Campaign) {
    const seg = (campaign.segmentFilter as Record<string, unknown>) ?? {};
    const trig = (campaign.triggerConfig as Record<string, unknown>) ?? {};
    setWizardData({
      type: campaign.type,
      name: campaign.name,
      channel: (campaign.channel as Channel) ?? "WHATSAPP",
      messageContent: campaign.messageContent ?? "",
      subject: campaign.subject ?? "",
      filterTags: (seg.tags as string[]) ?? [],
      filterTagInput: "",
      filterLastVisitGt: seg.lastVisitMoreThanMonths?.toString() ?? "",
      filterLastVisitLt: seg.lastVisitLessThanMonths?.toString() ?? "",
      filterPipelineStageId: (seg.pipelineStageId as string) ?? "",
      filterAgeMin: seg.ageMin?.toString() ?? "",
      filterAgeMax: seg.ageMax?.toString() ?? "",
      filterGender: (seg.gender as string) ?? "",
      sendNow: !campaign.scheduledAt,
      scheduledAt: campaign.scheduledAt
        ? new Date(campaign.scheduledAt).toISOString().slice(0, 16)
        : "",
      triggerEnabled: campaign.status !== "DRAFT",
      allowedHoursStart: (trig.allowedHoursStart as number)?.toString() ?? "9",
      allowedHoursEnd: (trig.allowedHoursEnd as number)?.toString() ?? "20",
    });
    setEditingId(campaign.id);
    setWizardStep(1);
    setSegmentCount(null);
    setWizardOpen(true);
  }

  function applyTemplate(template: CatalogTemplate) {
    setWizardData({
      ...INITIAL_WIZARD,
      type: template.type,
      name: template.name,
      messageContent: template.message,
    });
    setEditingId(null);
    setWizardStep(2);
    setWizardOpen(true);
    setActiveView("list");
  }

  function setField<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setWizardData((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed(): boolean {
    if (wizardStep === 1) return wizardData.type !== "" && wizardData.name.trim() !== "";
    if (wizardStep === 2) return wizardData.messageContent.trim() !== "";
    return true;
  }

  async function saveWizard() {
    if (!wizardData.type) return;
    setSaving(true);
    try {
      const isAutomatic = TYPE_CONFIG[wizardData.type as CampaignType]?.isAutomatic;

      const segmentFilter =
        !isAutomatic && wizardData.type === "MANUAL"
          ? {
              ...(wizardData.filterTags.length > 0 && {
                tags: wizardData.filterTags,
              }),
              ...(wizardData.filterLastVisitGt && {
                lastVisitMoreThanMonths: Number(wizardData.filterLastVisitGt),
              }),
              ...(wizardData.filterLastVisitLt && {
                lastVisitLessThanMonths: Number(wizardData.filterLastVisitLt),
              }),
              ...(wizardData.filterPipelineStageId && {
                pipelineStageId: wizardData.filterPipelineStageId,
              }),
              ...(wizardData.filterAgeMin && {
                ageMin: Number(wizardData.filterAgeMin),
              }),
              ...(wizardData.filterAgeMax && {
                ageMax: Number(wizardData.filterAgeMax),
              }),
              ...(wizardData.filterGender && {
                gender: wizardData.filterGender,
              }),
            }
          : undefined;

      const triggerConfig = {
        allowedHoursStart: Number(wizardData.allowedHoursStart),
        allowedHoursEnd: Number(wizardData.allowedHoursEnd),
      };

      const scheduledAt =
        !isAutomatic && !wizardData.sendNow && wizardData.scheduledAt
          ? wizardData.scheduledAt
          : undefined;

      const status = isAutomatic
        ? wizardData.triggerEnabled
          ? "SCHEDULED"
          : "DRAFT"
        : scheduledAt
        ? "SCHEDULED"
        : "DRAFT";

      const payload = {
        name: wizardData.name.trim(),
        type: wizardData.type,
        channel: wizardData.channel,
        messageContent: wizardData.messageContent,
        subject: wizardData.subject || undefined,
        segmentFilter: segmentFilter ?? undefined,
        triggerConfig,
        scheduledAt,
        status,
      };

      if (editingId) {
        await apiFetch(`/api/v1/campaigns/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast({ type: "success", message: "Campaña actualizada" });
      } else {
        await apiFetch("/api/v1/campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast({ type: "success", message: "Campaña creada" });
      }

      setWizardOpen(false);
      await loadCampaigns();
    } catch (err) {
      showToast({
        type: "error",
        message: (err as Error).message ?? "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  }

  // ── Campaign actions ────────────────────────────────────────────────────────

  async function pauseResumeCampaign(campaign: Campaign) {
    const newStatus =
      campaign.status === "PAUSED" ||
      campaign.status === "SCHEDULED" ||
      campaign.status === "SENDING"
        ? campaign.status === "PAUSED"
          ? "SCHEDULED"
          : "PAUSED"
        : null;
    if (!newStatus) return;
    try {
      await apiFetch(`/api/v1/campaigns/${campaign.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      showToast({
        type: "success",
        message:
          newStatus === "PAUSED" ? "Campaña pausada" : "Campaña reanudada",
      });
      await loadCampaigns();
    } catch {
      showToast({ type: "error", message: "Error al actualizar estado" });
    }
    setActionMenu(null);
  }

  async function duplicateCampaign(id: string) {
    try {
      await apiFetch(`/api/v1/campaigns/${id}/duplicate`, { method: "POST" });
      showToast({ type: "success", message: "Campaña duplicada" });
      await loadCampaigns();
    } catch {
      showToast({ type: "error", message: "Error al duplicar" });
    }
    setActionMenu(null);
  }

  async function deleteCampaign(id: string, name: string) {
    if (!confirm(`¿Eliminar la campaña "${name}"? Esta acción no se puede deshacer.`))
      return;
    try {
      await apiFetch(`/api/v1/campaigns/${id}`, { method: "DELETE" });
      showToast({ type: "success", message: "Campaña eliminada" });
      await loadCampaigns();
    } catch {
      showToast({ type: "error", message: "Error al eliminar" });
    }
    setActionMenu(null);
  }

  async function setupDefaultCampaigns() {
    setSettingUpDefaults(true);
    try {
      const result = await apiFetch<{ created: number }>(
        "/api/v1/campaigns/setup-defaults",
        { method: "POST" }
      );
      showToast({
        type: "success",
        message:
          result.created > 0
            ? `${result.created} campañas default creadas`
            : "Las campañas default ya existen",
      });
      await loadCampaigns();
    } catch {
      showToast({ type: "error", message: "Error al crear campañas default" });
    } finally {
      setSettingUpDefaults(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mensajes automáticos y manuales para tus pacientes
          </p>
        </div>
        <div className="flex gap-3">
          {campaigns.length === 0 && !loading && (
            <button
              onClick={setupDefaultCampaigns}
              disabled={settingUpDefaults}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {settingUpDefaults ? "Creando..." : "✨ Campañas default"}
            </button>
          )}
          <button
            onClick={openCreateWizard}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Nueva Campaña
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            { key: "list", label: `Mis Campañas (${campaigns.length})` },
            { key: "templates", label: "Templates WhatsApp" },
          ] as { key: "list" | "templates"; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeView === key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Campaigns list ─────────────────────────────────────────────────── */}
      {activeView === "list" && (
        <>
          {loading ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <div className="animate-spin text-3xl mb-3">⏳</div>
              <p>Cargando campañas...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="text-5xl mb-4">📢</div>
              <p className="text-gray-900 font-semibold text-lg mb-2">
                Todavía no tenés campañas
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Creá tu primera campaña o cargá las 8 campañas default que
                incluye DentalFlow.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={setupDefaultCampaigns}
                  disabled={settingUpDefaults}
                  className="px-5 py-2.5 border border-primary-600 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-50"
                >
                  {settingUpDefaults ? "Creando..." : "✨ Cargar campañas default"}
                </button>
                <button
                  onClick={openCreateWizard}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                >
                  + Nueva campaña
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Campaña
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Canal
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Fecha
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Enviados
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Entregados
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Leídos
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Respondidos
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => {
                    const typeConf = TYPE_CONFIG[c.type];
                    const statusConf = STATUS_CONFIG[c.status];
                    const channelConf =
                      CHANNEL_CONFIG[c.channel] ?? CHANNEL_CONFIG.WHATSAPP;
                    const date = c.scheduledAt
                      ? new Date(c.scheduledAt)
                      : c.sentAt
                      ? new Date(c.sentAt)
                      : null;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/campanas/${c.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{typeConf?.icon}</span>
                            <div>
                              <p className="font-medium text-gray-900">
                                {c.name}
                              </p>
                              <span className="text-xs text-gray-400">
                                {typeConf?.label}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`flex items-center gap-1 ${channelConf.color}`}
                          >
                            <span>{channelConf.icon}</span>
                            <span className="text-xs">{channelConf.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.color}`}
                          >
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {date
                            ? date.toLocaleDateString("es-AR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-gray-700">
                          {c.totalSent || "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-gray-700">
                          {c.totalSent > 0 ? (
                            <span className="text-green-700">
                              {c.totalDelivered}
                              <span className="text-gray-400 text-xs ml-1">
                                ({Math.round((c.totalDelivered / c.totalSent) * 100)}%)
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-gray-700">
                          {c.totalSent > 0 ? (
                            <span className="text-blue-700">
                              {c.totalRead}
                              <span className="text-gray-400 text-xs ml-1">
                                ({Math.round((c.totalRead / c.totalSent) * 100)}%)
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-gray-700">
                          {c.totalSent > 0 ? (
                            <span className="text-primary-700">
                              {c.totalReplied}
                              <span className="text-gray-400 text-xs ml-1">
                                ({Math.round((c.totalReplied / c.totalSent) * 100)}%)
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative" ref={actionMenu === c.id ? actionMenuRef : undefined}>
                            <button
                              onClick={() =>
                                setActionMenu(
                                  actionMenu === c.id ? null : c.id
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            >
                              ⋮
                            </button>
                            {actionMenu === c.id && (
                              <div className="absolute right-0 top-8 w-44 bg-white border rounded-xl shadow-lg z-10 py-1">
                                <button
                                  onClick={() => {
                                    setActionMenu(null);
                                    openEditWizard(c);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                >
                                  ✏️ Editar
                                </button>
                                {(c.status === "SCHEDULED" ||
                                  c.status === "SENDING" ||
                                  c.status === "PAUSED") && (
                                  <button
                                    onClick={() => pauseResumeCampaign(c)}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                  >
                                    {c.status === "PAUSED"
                                      ? "▶️ Reanudar"
                                      : "⏸️ Pausar"}
                                  </button>
                                )}
                                <button
                                  onClick={() => duplicateCampaign(c.id)}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                >
                                  📋 Duplicar
                                </button>
                                <div className="border-t my-1" />
                                <button
                                  onClick={() =>
                                    deleteCampaign(c.id, c.name)
                                  }
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  🗑️ Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Template catalog ───────────────────────────────────────────────── */}
      {activeView === "templates" && (
        <TemplatesManager />
      )}

      {/* ── Create / Edit wizard ───────────────────────────────────────────── */}
      {wizardOpen && (
        <CampaignWizard
          step={wizardStep}
          data={wizardData}
          editingId={editingId}
          saving={saving}
          pipelineStages={pipelineStages}
          segmentCount={segmentCount}
          countLoading={countLoading}
          onClose={() => setWizardOpen(false)}
          onNext={() => setWizardStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
          onBack={() => setWizardStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
          onSave={saveWizard}
          canProceed={canProceed()}
          setField={setField}
          fetchSegmentCount={fetchSegmentCount}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

// ─── Template catalog component ───────────────────────────────────────────────

function TemplateCatalog({
  onApply,
}: {
  onApply: (t: CatalogTemplate) => void;
}) {
  const categories = [
    "Recordatorios",
    "Fidelización",
    "Promociones",
    "Reactivación",
  ];

  return (
    <div className="space-y-8">
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-sm text-primary-800">
        <strong>💡 Catálogo de templates recomendados.</strong> Seleccioná un
        template y lo cargamos directo en el wizard para que solo personalices el
        mensaje.
      </div>
      {categories.map((category) => {
        const templates = CATALOG_TEMPLATES.filter(
          (t) => t.category === category
        );
        if (templates.length === 0) return null;
        return (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => {
                const typeConf = TYPE_CONFIG[tpl.type];
                return (
                  <div
                    key={tpl.id}
                    className="bg-white border rounded-xl p-4 hover:border-primary-400 hover:shadow-sm transition-all flex flex-col"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-2xl">{typeConf?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {tpl.name}
                        </p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                          {typeConf?.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 flex-1 leading-relaxed mb-4 line-clamp-2">
                      {tpl.preview}
                    </p>
                    <button
                      onClick={() => onApply(tpl)}
                      className="w-full px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 border border-primary-200"
                    >
                      Usar este template →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Campaign wizard modal ────────────────────────────────────────────────────

interface WizardProps {
  step: 1 | 2 | 3 | 4;
  data: WizardData;
  editingId: string | null;
  saving: boolean;
  pipelineStages: PipelineStage[];
  segmentCount: number | null;
  countLoading: boolean;
  canProceed: boolean;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
  setField: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
  fetchSegmentCount: () => void;
}

function CampaignWizard({
  step,
  data,
  editingId,
  saving,
  pipelineStages,
  segmentCount,
  countLoading,
  canProceed,
  onClose,
  onNext,
  onBack,
  onSave,
  setField,
  fetchSegmentCount,
}: WizardProps) {
  const typeConf = data.type ? TYPE_CONFIG[data.type as CampaignType] : null;
  const isAutomatic = typeConf?.isAutomatic ?? false;

  const STEPS = ["Tipo", "Contenido", "Audiencia", "Programación"];
  const VARIABLES = [
    "{nombre}",
    "{clinica}",
    "{tratamiento}",
    "{fecha}",
    "{hora}",
    "{descuento}",
  ];

  function insertVariable(variable: string) {
    setField("messageContent", data.messageContent + variable);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? "Editar Campaña" : "Nueva Campaña"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Paso {step} de 4</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
          >
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-4 border-b">
          {STEPS.map((label, i) => {
            const stepNum = i + 1;
            const done = step > stepNum;
            const active = step === stepNum;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done
                        ? "bg-primary-600 text-white"
                        : active
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {done ? "✓" : stepNum}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      active ? "text-primary-700" : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${
                      done ? "bg-primary-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <Step1
              data={data}
              setField={setField}
              typeConf={typeConf}
            />
          )}
          {step === 2 && (
            <Step2
              data={data}
              setField={setField}
              variables={VARIABLES}
              onInsertVariable={insertVariable}
            />
          )}
          {step === 3 && (
            <Step3
              data={data}
              isAutomatic={isAutomatic}
              typeConf={typeConf}
              pipelineStages={pipelineStages}
              segmentCount={segmentCount}
              countLoading={countLoading}
              setField={setField}
              fetchSegmentCount={fetchSegmentCount}
            />
          )}
          {step === 4 && (
            <Step4
              data={data}
              isAutomatic={isAutomatic}
              setField={setField}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={step === 1 ? onClose : onBack}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            {step === 1 ? "Cancelar" : "← Atrás"}
          </button>
          {step < 4 ? (
            <button
              onClick={onNext}
              disabled={!canProceed}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={onSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40"
            >
              {saving
                ? "Guardando..."
                : editingId
                ? "Guardar cambios"
                : "Crear campaña"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Tipo y nombre ────────────────────────────────────────────────────

function Step1({
  data,
  setField,
  typeConf,
}: {
  data: WizardData;
  setField: WizardProps["setField"];
  typeConf: TypeConfig | null;
}) {
  const types = Object.keys(TYPE_CONFIG) as CampaignType[];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tipo de campaña
        </label>
        <div className="grid grid-cols-3 gap-2">
          {types.map((type) => {
            const conf = TYPE_CONFIG[type];
            const selected = data.type === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setField("type", type);
                  if (!data.name || data.name === typeConf?.defaultName) {
                    setField("name", conf.defaultName);
                  }
                  if (!data.messageContent) {
                    setField("messageContent", conf.defaultMessage);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selected
                    ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="text-2xl mb-1">{conf.icon}</div>
                <div className="text-xs font-semibold text-gray-800">
                  {conf.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 leading-tight">
                  {conf.description}
                </div>
                {conf.isAutomatic && (
                  <div className="mt-1.5">
                    <span className="text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                      Automática
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nombre de la campaña
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Ej: Promo verano 2026"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  );
}

// ─── Step 2: Contenido ────────────────────────────────────────────────────────

function Step2({
  data,
  setField,
  variables,
  onInsertVariable,
}: {
  data: WizardData;
  setField: WizardProps["setField"];
  variables: string[];
  onInsertVariable: (v: string) => void;
}) {
  const preview = renderPreview(data.messageContent);

  return (
    <div className="space-y-5">
      {/* Channel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Canal de envío
        </label>
        <div className="flex gap-2">
          {(["WHATSAPP", "EMAIL", "SMS"] as Channel[]).map((ch) => {
            const conf = CHANNEL_CONFIG[ch];
            return (
              <button
                key={ch}
                onClick={() => setField("channel", ch)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  data.channel === ch
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{conf.icon}</span> {conf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject for email */}
      {data.channel === "EMAIL" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Asunto del email
          </label>
          <input
            type="text"
            value={data.subject}
            onChange={(e) => setField("subject", e.target.value)}
            placeholder="Ej: Tu cita en {clinica} es mañana 📅"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Variables */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Variables disponibles
        </label>
        <div className="flex flex-wrap gap-1.5">
          {variables.map((v) => (
            <button
              key={v}
              onClick={() => onInsertVariable(v)}
              className="px-2.5 py-1 bg-gray-100 hover:bg-primary-100 text-gray-600 hover:text-primary-700 rounded-lg text-xs font-mono transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Mensaje
          <span className="text-gray-400 font-normal ml-2">
            ({data.messageContent.length} caracteres)
          </span>
        </label>
        <textarea
          value={data.messageContent}
          onChange={(e) => setField("messageContent", e.target.value)}
          rows={5}
          placeholder="Escribí el mensaje aquí. Usá las variables de arriba para personalizar."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">
          WhatsApp: usá *texto* para negrita. Máx. recomendado: 1024 caracteres.
        </p>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vista previa
        </label>
        <div className="bg-gray-100 rounded-xl p-4">
          <div className="bg-white rounded-xl shadow-sm p-3 max-w-xs ml-auto">
            <div
              className="text-sm text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: preview || "<em class='text-gray-400'>El mensaje aparecerá acá...</em>" }}
            />
            <p className="text-right text-xs text-gray-400 mt-2">
              {new Date().toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Audiencia ────────────────────────────────────────────────────────

function Step3({
  data,
  isAutomatic,
  typeConf,
  pipelineStages,
  segmentCount,
  countLoading,
  setField,
  fetchSegmentCount,
}: {
  data: WizardData;
  isAutomatic: boolean;
  typeConf: TypeConfig | null;
  pipelineStages: PipelineStage[];
  segmentCount: number | null;
  countLoading: boolean;
  setField: WizardProps["setField"];
  fetchSegmentCount: () => void;
}) {
  if (isAutomatic) {
    return (
      <div className="space-y-4">
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{typeConf?.icon}</span>
            <div>
              <p className="font-semibold text-primary-800 text-sm">
                Campaña automática
              </p>
              <p className="text-primary-700 text-sm mt-1">
                {typeConf?.triggerDescription}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-2">
            ¿Quién recibe este mensaje?
          </p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Todos los pacientes activos del tenant</li>
            <li>Se envía cuando se cumple la condición del trigger</li>
            <li>
              Solo dentro del horario de envío configurado en el Paso 4
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Filtrá los pacientes que van a recibir esta campaña. Sin filtros, se
        envía a todos los pacientes activos.
      </p>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Tags de pacientes
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={data.filterTagInput}
            onChange={(e) => setField("filterTagInput", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && data.filterTagInput.trim()) {
                e.preventDefault();
                setField("filterTags", [
                  ...data.filterTags,
                  data.filterTagInput.trim(),
                ]);
                setField("filterTagInput", "");
              }
            }}
            placeholder="Escribí un tag y presioná Enter"
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {data.filterTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.filterTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs"
              >
                {tag}
                <button
                  onClick={() =>
                    setField(
                      "filterTags",
                      data.filterTags.filter((t) => t !== tag)
                    )
                  }
                  className="hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Last visit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Última visita
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Hace más de (meses)
            </label>
            <input
              type="number"
              min={1}
              value={data.filterLastVisitGt}
              onChange={(e) => setField("filterLastVisitGt", e.target.value)}
              placeholder="Ej: 6"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Hace menos de (meses)
            </label>
            <input
              type="number"
              min={1}
              value={data.filterLastVisitLt}
              onChange={(e) => setField("filterLastVisitLt", e.target.value)}
              placeholder="Ej: 12"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Pipeline stage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Etapa en el pipeline
        </label>
        <select
          value={data.filterPipelineStageId}
          onChange={(e) => setField("filterPipelineStageId", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas las etapas</option>
          {pipelineStages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Age & gender */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Edad mínima
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={data.filterAgeMin}
            onChange={(e) => setField("filterAgeMin", e.target.value)}
            placeholder="Ej: 18"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Edad máxima
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={data.filterAgeMax}
            onChange={(e) => setField("filterAgeMax", e.target.value)}
            placeholder="Ej: 65"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Género
        </label>
        <select
          value={data.filterGender}
          onChange={(e) => setField("filterGender", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los géneros</option>
          <option value="MALE">Masculino</option>
          <option value="FEMALE">Femenino</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Pacientes que recibirán la campaña</p>
          {segmentCount !== null && (
            <p className="text-2xl font-bold text-primary-700 mt-0.5">
              {segmentCount.toLocaleString()}
            </p>
          )}
          {segmentCount === null && !countLoading && (
            <p className="text-sm text-gray-400 mt-0.5">
              Hacé clic en "Contar" para ver el resultado
            </p>
          )}
        </div>
        <button
          onClick={fetchSegmentCount}
          disabled={countLoading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {countLoading ? "Contando..." : "Contar pacientes"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Programación ─────────────────────────────────────────────────────

function Step4({
  data,
  isAutomatic,
  setField,
}: {
  data: WizardData;
  isAutomatic: boolean;
  setField: WizardProps["setField"];
}) {
  return (
    <div className="space-y-6">
      {isAutomatic ? (
        /* Automatic campaign: toggle + allowed hours */
        <>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
            <div>
              <p className="font-medium text-gray-800 text-sm">
                Activar automatización
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Al activar, los mensajes se enviarán automáticamente cuando se
                cumpla el trigger
              </p>
            </div>
            <button
              onClick={() => setField("triggerEnabled", !data.triggerEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                data.triggerEnabled ? "bg-primary-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  data.triggerEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {data.triggerEnabled && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-sm text-primary-700">
              ✅ La campaña se activará al guardar y comenzará a enviar mensajes
              automáticamente.
            </div>
          )}
        </>
      ) : (
        /* Manual campaign: send now vs schedule */
        <>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              ¿Cuándo enviar?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={data.sendNow}
                  onChange={() => setField("sendNow", true)}
                  className="accent-primary-600"
                />
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    Enviar ahora
                  </p>
                  <p className="text-xs text-gray-500">
                    La campaña se pondrá en cola inmediatamente
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={!data.sendNow}
                  onChange={() => setField("sendNow", false)}
                  className="accent-primary-600"
                />
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    Programar fecha y hora
                  </p>
                  <p className="text-xs text-gray-500">
                    Elegí cuándo se enviará la campaña
                  </p>
                </div>
              </label>
            </div>
          </div>

          {!data.sendNow && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha y hora de envío
              </label>
              <input
                type="datetime-local"
                value={data.scheduledAt}
                onChange={(e) => setField("scheduledAt", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </>
      )}

      {/* Allowed send hours (both types) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Horario de envío permitido
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Los mensajes solo se enviarán dentro de este horario para no molestar
          a los pacientes.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Desde</label>
            <select
              value={data.allowedHoursStart}
              onChange={(e) => setField("allowedHoursStart", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i.toString()}>
                  {i.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div className="text-gray-400 pt-5">→</div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
            <select
              value={data.allowedHoursEnd}
              onChange={(e) => setField("allowedHoursEnd", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i.toString()}>
                  {i.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-primary-700 mt-2 bg-primary-50 px-3 py-2 rounded-lg">
          ⏰ Envío permitido de{" "}
          {Number(data.allowedHoursStart).toString().padStart(2, "0")}:00 a{" "}
          {Number(data.allowedHoursEnd).toString().padStart(2, "0")}:00
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
        <p className="font-medium text-gray-800 mb-3">Resumen de la campaña</p>
        <div className="flex justify-between">
          <span className="text-gray-500">Nombre</span>
          <span className="font-medium text-gray-800">{data.name || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Tipo</span>
          <span className="font-medium text-gray-800">
            {data.type ? TYPE_CONFIG[data.type as CampaignType]?.label : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Canal</span>
          <span className="font-medium text-gray-800">
            {CHANNEL_CONFIG[data.channel]?.label}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Estado al guardar</span>
          <span className="font-medium text-gray-800">
            {isAutomatic
              ? data.triggerEnabled
                ? "Programada (activa)"
                : "Borrador"
              : !data.sendNow && data.scheduledAt
              ? "Programada"
              : "Borrador"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Templates Manager (3-level architecture) ────────────────────────────────

interface WATemplate {
  id: string;
  name: string;
  displayName: string;
  category: string;
  bodyText: string;
  status: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  suggestedTrigger: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const TPL_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  SUBMITTED: { label: "En revisión", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Aprobado ✅", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rechazado ❌", color: "bg-red-100 text-red-700" },
  PAUSED: { label: "Pausado", color: "bg-orange-100 text-orange-700" },
};

const TPL_CATEGORY: Record<string, { label: string; color: string }> = {
  UTILITY: { label: "UTILITY", color: "bg-blue-50 text-blue-700" },
  MARKETING: { label: "MARKETING", color: "bg-purple-50 text-purple-700" },
};

function TemplatesManager() {
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"system" | "custom">("system");

  useEffect(() => {
    apiFetch<{ templates: WATemplate[] }>("/api/v1/whatsapp-templates")
      .then((d) => setTemplates(d.templates))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(id: string, isActive: boolean) {
    await apiFetch(`/api/v1/whatsapp-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !isActive }),
    }).catch(() => {});
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: !isActive } : t)));
  }

  const systemTemplates = templates.filter((t) => t.isSystemTemplate);
  const customTemplates = templates.filter((t) => !t.isSystemTemplate);

  if (loading) {
    return <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Cargando templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Arquitectura de 3 niveles.</strong> Los templates del sistema vienen pre-aprobados. Los templates personalizados necesitan aprobación de Meta antes de poder usarse.
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: "system" as const, label: `Templates del sistema (${systemTemplates.length})` },
          { key: "custom" as const, label: `Mis templates (${customTemplates.length})` },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setSubTab(key)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${subTab === key ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {subTab === "system" && (
        <div className="space-y-2">
          {systemTemplates.map((tpl) => (
            <div key={tpl.id} className={`bg-white rounded-xl border p-4 ${!tpl.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900">{tpl.displayName || tpl.name.replace(/_/g, " ")}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TPL_CATEGORY[tpl.category]?.color ?? "bg-gray-100 text-gray-700"}`}>{tpl.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TPL_STATUS[tpl.status]?.color ?? TPL_STATUS.DRAFT.color}`}>{TPL_STATUS[tpl.status]?.label ?? tpl.status}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">🔒 Sistema</span>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 mt-2">
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{tpl.bodyText}</p>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={tpl.isActive} onChange={() => toggleActive(tpl.id, tpl.isActive)} className="w-4 h-4 accent-primary-600" />
                  <span className="text-xs text-gray-500">Activo</span>
                </label>
              </div>
            </div>
          ))}
          {systemTemplates.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay templates del sistema</p>}
        </div>
      )}

      {subTab === "custom" && (
        <div className="space-y-2">
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500 mb-1">Los templates personalizados requieren aprobación de Meta.</p>
            <p className="text-xs text-gray-400">Proximamente: crear y enviar templates para revisión.</p>
          </div>
          {customTemplates.map((tpl) => (
            <div key={tpl.id} className={`bg-white rounded-xl border p-4 ${!tpl.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900">{tpl.displayName || tpl.name.replace(/_/g, " ")}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TPL_CATEGORY[tpl.category]?.color ?? "bg-gray-100 text-gray-700"}`}>{tpl.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TPL_STATUS[tpl.status]?.color ?? TPL_STATUS.DRAFT.color}`}>{TPL_STATUS[tpl.status]?.label ?? tpl.status}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{tpl.bodyText}</p>
                  {tpl.status === "REJECTED" && tpl.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">Motivo: {tpl.rejectionReason}</p>
                  )}
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={tpl.isActive} onChange={() => toggleActive(tpl.id, tpl.isActive)} className="w-4 h-4 accent-primary-600" />
                  <span className="text-xs text-gray-500">Activo</span>
                </label>
              </div>
            </div>
          ))}
          {customTemplates.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No has creado templates personalizados</p>}
        </div>
      )}
    </div>
  );
}
