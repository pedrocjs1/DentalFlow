"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Send,
  Bot,
  User,
  Phone,
  Calendar,
  ChevronRight,
  X,
  Plus,
  RefreshCw,
  CheckCheck,
  Check,
  MessageSquare,
  Tag,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Clock,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationStatus = "OPEN" | "AI_HANDLING" | "HUMAN_NEEDED" | "CLOSED";

interface PatientInConv {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  tags: string[];
  email?: string;
  pipelineEntry?: {
    stageId: string;
    stage: { id: string; name: string; color: string };
  } | null;
}

interface Conversation {
  id: string;
  patientId: string;
  channel: string;
  status: ConversationStatus;
  aiEnabled: boolean;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastPatientMessageAt: string | null;
  aiPausedAt: string | null;
  unreadCount: number;
  patient: PatientInConv;
}

interface NextAppointment {
  id: string;
  startTime: string;
  status: string;
  treatmentType: { name: string } | null;
  dentist: { name: string } | null;
}

interface ConversationDetail extends Conversation {
  nextAppointment: NextAppointment | null;
  windowOpen: boolean;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  displayName: string | null;
  category: string;
  bodyText: string | null;
  language: string;
}

interface Message {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  metadata: { sentBy?: "bot" | "human" } | null;
}

interface MessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_TABS: { value: ConversationStatus | "ALL"; label: string; dot?: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "OPEN", label: "Abiertas", dot: "bg-green-400" },
  { value: "AI_HANDLING", label: "IA", dot: "bg-blue-400" },
  { value: "HUMAN_NEEDED", label: "Urgente", dot: "bg-red-400" },
  { value: "CLOSED", label: "Cerradas", dot: "bg-gray-400" },
];

const STATUS_COLORS: Record<ConversationStatus, string> = {
  OPEN: "bg-green-400",
  AI_HANDLING: "bg-blue-400",
  HUMAN_NEEDED: "bg-red-400",
  CLOSED: "bg-gray-300",
};

const STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: "Abierta",
  AI_HANDLING: "IA Atendiendo",
  HUMAN_NEEDED: "Necesita Humano",
  CLOSED: "Cerrada",
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Ayer";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("es-AR", { weekday: "short" });
  } else {
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  }
}

function getInitials(firstName: string, lastName: string): string {
  return (`${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`).toUpperCase() || "?";
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-primary-500", "bg-blue-500", "bg-purple-500",
    "bg-pink-500", "bg-orange-500", "bg-emerald-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const name = `${conv.patient.firstName} ${conv.patient.lastName}`;
  const initials = getInitials(conv.patient.firstName, conv.patient.lastName);
  const avatarColor = getAvatarColor(name);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors relative ${
        isActive ? "bg-primary-50 border-l-[3px] border-l-primary-500" : ""
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-semibold`}
        >
          {initials}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${STATUS_COLORS[conv.status]}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-sm font-semibold truncate ${isActive ? "text-primary-700" : "text-gray-900"}`}>
            {name}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-gray-500 truncate">
            {conv.lastMessagePreview ?? "Sin mensajes"}
          </p>
          {conv.unreadCount > 0 && (
            <span className="flex-shrink-0 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
            </span>
          )}
        </div>
        {conv.status === "AI_HANDLING" && (
          <div className="flex items-center gap-1 mt-0.5">
            <Bot className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-500">IA atendiendo</span>
          </div>
        )}
        {conv.status === "HUMAN_NEEDED" && (
          <div className="flex items-center gap-1 mt-0.5">
            <User className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-500">Necesita atención</span>
          </div>
        )}
      </div>
    </button>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isInbound = message.direction === "INBOUND";
  const isBotMessage = !isInbound && message.metadata?.sentBy === "bot";

  return (
    <div className={`flex ${isInbound ? "justify-start" : "justify-end"} mb-2`}>
      <div className={`max-w-[70%] ${isInbound ? "" : "items-end flex flex-col"}`}>
        {isBotMessage && (
          <div className="flex items-center gap-1 mb-0.5 justify-end">
            <Bot className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">IA</span>
          </div>
        )}
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
            isInbound
              ? "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
              : isBotMessage
              ? "bg-blue-600 text-white rounded-tr-sm shadow-sm"
              : "bg-primary-600 text-white rounded-tr-sm shadow-sm"
          }`}
        >
          {message.content}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 ${isInbound ? "justify-start" : "justify-end"}`}>
          <span className="text-xs text-gray-400">
            {new Date(message.sentAt).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {!isInbound && (
            <>
              {message.readAt ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              ) : message.deliveredAt ? (
                <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-gray-400" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Conversation Modal ───────────────────────────────────────────────────

function NewConversationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch<PatientSearchResult[]>(
          `/api/v1/conversations/patient-search?q=${encodeURIComponent(query)}`
        );
        setResults(data);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleSelect(patient: PatientSearchResult) {
    setCreating(true);
    try {
      const conv = await apiFetch<Conversation>("/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({ patientId: patient.id, channel: "WHATSAPP" }),
      });
      onCreated(conv);
      onClose();
    } catch { /* ignore */ }
    finally { setCreating(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Nueva conversación</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente por nombre o teléfono..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto">
            {results.length === 0 && query.length >= 2 && !searching && (
              <p className="text-center text-sm text-gray-400 py-6">No se encontraron pacientes</p>
            )}
            {results.map((p) => (
              <button
                key={p.id}
                disabled={creating}
                onClick={() => handleSelect(p)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <div className={`w-9 h-9 rounded-full ${getAvatarColor(p.firstName + p.lastName)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                  {getInitials(p.firstName, p.lastName)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                  <p className="text-xs text-gray-400">{p.phone}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template Selector Modal ─────────────────────────────────────────────

function TemplateSelector({
  open,
  onClose,
  onSelect,
  conversationId,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (template: WhatsAppTemplate) => void;
  conversationId: string;
}) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<{ templates: WhatsAppTemplate[] }>(`/api/v1/conversations/${conversationId}/templates`)
      .then((data) => setTemplates(data.templates))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open, conversationId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Enviar template</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Cargando templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay templates aprobados disponibles</p>
              <p className="text-xs mt-1">Creá y aprobá templates en Configuración &gt; Integraciones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelect(t);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {t.displayName ?? t.name}
                    </span>
                    <span className="text-xs text-gray-400 uppercase">{t.category}</span>
                  </div>
                  {t.bodyText && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.bodyText}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bot Paused Alert ────────────────────────────────────────────────────────

function BotPausedAlert({
  aiPausedAt,
  onReactivate,
}: {
  aiPausedAt: string | null;
  onReactivate: () => void;
}) {
  if (!aiPausedAt) return null;

  const pausedMs = Date.now() - new Date(aiPausedAt).getTime();
  const pausedHours = Math.round(pausedMs / (1000 * 60 * 60));

  // Only show alert if paused for more than 24h
  if (pausedHours < 24) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
      <span className="text-amber-700">
        El bot está pausado hace {pausedHours}hs.
      </span>
      <button
        onClick={onReactivate}
        className="text-amber-700 font-medium hover:text-amber-800 underline"
      >
        ¿Reactivar?
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConversacionesClient() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const autoSelectedRef = useRef(false);

  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);

  const [newConvOpen, setNewConvOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "ALL") qs.set("status", statusFilter);
      if (debouncedSearch) qs.set("search", debouncedSearch);
      const data = await apiFetch<Conversation[]>(`/api/v1/conversations?${qs.toString()}`);
      setConversations(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Auto-select conversation from URL ?id= param (e.g. from notifications)
  useEffect(() => {
    if (autoSelectedRef.current || loading || conversations.length === 0) return;
    const targetId = searchParams.get("id");
    if (!targetId) return;
    const conv = conversations.find((c) => c.id === targetId);
    if (conv) {
      autoSelectedRef.current = true;
      selectConversation(conv);
    }
  }, [conversations, loading, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll conversation list every 10 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const qs = new URLSearchParams();
        if (statusFilter !== "ALL") qs.set("status", statusFilter);
        if (debouncedSearch) qs.set("search", debouncedSearch);
        const data = await apiFetch<Conversation[]>(`/api/v1/conversations?${qs.toString()}`);
        setConversations(data);
      } catch { /* ignore polling errors */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, debouncedSearch]);

  // Poll active conversation messages every 5 seconds
  const activeConvIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConvIdRef.current = activeConv?.id ?? null;
  }, [activeConv?.id]);

  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      const convId = activeConvIdRef.current;
      if (!convId) return;
      try {
        const data = await apiFetch<MessagesResponse>(
          `/api/v1/conversations/${convId}/messages?page=1&limit=50`
        );
        setMessages(data.messages);
        setTotalPages(data.totalPages);
        setCurrentPage(1);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string, page = 1) => {
    setMessagesLoading(true);
    try {
      const data = await apiFetch<MessagesResponse>(
        `/api/v1/conversations/${convId}/messages?page=${page}&limit=50`
      );
      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...data.messages, ...prev]);
      }
      setTotalPages(data.totalPages);
      setCurrentPage(page);
    } catch { /* ignore */ }
    finally { setMessagesLoading(false); }
  }, []);

  async function selectConversation(conv: Conversation) {
    try {
      const detail = await apiFetch<ConversationDetail>(`/api/v1/conversations/${conv.id}`);
      setActiveConv(detail);
      setMessages([]);
      setCurrentPage(1);
      await loadMessages(conv.id, 1);
      // Mark as read in list
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch { /* ignore */ }
  }

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    if (currentPage === 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentPage]);

  async function sendMessage() {
    if (!activeConv || !messageInput.trim() || sending) return;
    const content = messageInput.trim();
    setMessageInput("");
    setSending(true);

    // Optimistic update
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      conversationId: activeConv.id,
      direction: "OUTBOUND",
      type: "TEXT",
      content,
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      metadata: { sentBy: "human" },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const msg = await apiFetch<Message>(`/api/v1/conversations/${activeConv.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      // Replace optimistic with real message
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? msg : m)));
      // Update preview in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, lastMessageAt: msg.sentAt, lastMessagePreview: content.slice(0, 100) }
            : c
        )
      );
      // Refresh active conv status if it changed from AI_HANDLING to OPEN
      if (activeConv.status === "AI_HANDLING") {
        setActiveConv((prev) => prev ? { ...prev, status: "OPEN" } : prev);
      }
    } catch {
      // Remove optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessageInput(content); // restore input
    } finally {
      setSending(false);
    }
  }

  async function sendTemplate(template: WhatsAppTemplate) {
    if (!activeConv || sending) return;
    setSending(true);

    const content = `[Template: ${template.displayName ?? template.name}]`;
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      conversationId: activeConv.id,
      direction: "OUTBOUND",
      type: "TEMPLATE",
      content,
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      metadata: { sentBy: "human" },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const msg = await apiFetch<Message>(`/api/v1/conversations/${activeConv.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content,
          type: "template",
          templateId: template.id,
          templateName: template.displayName ?? template.name,
        }),
      });
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? msg : m)));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, lastMessageAt: msg.sentAt, lastMessagePreview: content.slice(0, 100) }
            : c
        )
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  async function updateConversation(patch: { status?: ConversationStatus; aiEnabled?: boolean }) {
    if (!activeConv || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const updated = await apiFetch<ConversationDetail>(`/api/v1/conversations/${activeConv.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setActiveConv(updated);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, status: updated.status, aiEnabled: updated.aiEnabled }
            : c
        )
      );
    } catch { /* ignore */ }
    finally { setUpdatingStatus(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="flex h-full bg-white rounded-xl border overflow-hidden">
      {/* ── LEFT PANEL — Conversation List ── */}
      <div className={`w-full md:w-64 lg:w-80 flex-shrink-0 flex flex-col border-r ${activeConv ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">Conversaciones</h2>
              {totalUnread > 0 && (
                <span className="bg-primary-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={loadConversations}
                disabled={loading}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                title="Actualizar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setNewConvOpen(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                title="Nueva conversación"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex border-b overflow-x-auto scrollbar-thin">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors relative ${
                statusFilter === tab.value
                  ? "text-primary-600 border-b-2 border-primary-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.dot && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${tab.dot} mr-1`} />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 px-4 text-center">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={activeConv?.id === conv.id}
                onClick={() => selectConversation(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — Chat ── */}
      {!activeConv ? (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-gray-400">
          <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Seleccioná una conversación</p>
          <p className="text-xs mt-1 opacity-70">o creá una nueva con el botón +</p>
        </div>
      ) : (
        <div className={`flex-1 flex flex-col min-w-0 ${!activeConv ? "hidden md:flex" : "flex"}`}>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
            {/* Mobile back button */}
            <button
              onClick={() => setActiveConv(null)}
              className="md:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Volver a conversaciones"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-full ${getAvatarColor(activeConv.patient.firstName + activeConv.patient.lastName)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
              {getInitials(activeConv.patient.firstName, activeConv.patient.lastName)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">
                  {activeConv.patient.firstName} {activeConv.patient.lastName}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  activeConv.status === "OPEN" ? "bg-green-100 text-green-700" :
                  activeConv.status === "AI_HANDLING" ? "bg-blue-100 text-blue-700" :
                  activeConv.status === "HUMAN_NEEDED" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {STATUS_LABELS[activeConv.status]}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Phone className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{activeConv.patient.phone}</span>
                {activeConv.patient.tags.length > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <Tag className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {activeConv.patient.tags.slice(0, 2).join(", ")}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* AI toggle */}
              <button
                onClick={() => updateConversation({ aiEnabled: !activeConv.aiEnabled })}
                disabled={updatingStatus}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeConv.aiEnabled
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={activeConv.aiEnabled ? "Desactivar IA" : "Activar IA"}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{activeConv.aiEnabled ? "IA activa" : "IA inactiva"}</span>
              </button>

              {/* Take control / transfer */}
              {activeConv.status !== "CLOSED" && (
                <>
                  {activeConv.status === "AI_HANDLING" || activeConv.status === "HUMAN_NEEDED" ? (
                    <button
                      onClick={() => updateConversation({ status: "OPEN", aiEnabled: false })}
                      disabled={updatingStatus}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Tomar control</span>
                    </button>
                  ) : null}
                  <button
                    onClick={() => updateConversation({ status: "CLOSED" })}
                    disabled={updatingStatus}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    title="Cerrar conversación"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              {activeConv.status === "CLOSED" && (
                <button
                  onClick={() => updateConversation({ status: "OPEN" })}
                  disabled={updatingStatus}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reabrir</span>
                </button>
              )}
            </div>
          </div>

          {/* Bot paused alert */}
          {!activeConv.aiEnabled && (
            <BotPausedAlert
              aiPausedAt={activeConv.aiPausedAt}
              onReactivate={() => updateConversation({ aiEnabled: true })}
            />
          )}

          {/* 24h window banner */}
          {activeConv.channel === "WHATSAPP" && activeConv.status !== "CLOSED" && (
            activeConv.windowOpen ? (
              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-green-50 border-b border-green-100 text-xs text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Ventana abierta — podés enviar mensajes libremente
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                <AlertTriangle className="w-3 h-3" />
                La ventana de 24hs está cerrada. Solo podés enviar templates.
              </div>
            )
          )}

          {/* Patient info bar — next appointment + pipeline */}
          {(activeConv.nextAppointment || activeConv.patient.pipelineEntry) && (
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b text-xs text-gray-500 overflow-x-auto">
              {activeConv.nextAppointment && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-primary-500" />
                  <span>
                    Próxima cita:{" "}
                    <span className="font-medium text-gray-700">
                      {new Date(activeConv.nextAppointment.startTime).toLocaleDateString("es-AR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {new Date(activeConv.nextAppointment.startTime).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {activeConv.nextAppointment.treatmentType && (
                      <span className="text-gray-400">
                        {" — "}
                        {activeConv.nextAppointment.treatmentType.name}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {activeConv.patient.pipelineEntry && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeConv.patient.pipelineEntry.stage.color }}
                  />
                  <span>
                    Pipeline:{" "}
                    <span className="font-medium text-gray-700">
                      {activeConv.patient.pipelineEntry.stage.name}
                    </span>
                  </span>
                </div>
              )}
              <a
                href={`/pacientes/${activeConv.patientId}`}
                className="flex items-center gap-1 text-primary-600 hover:text-primary-700 ml-auto flex-shrink-0"
              >
                <span>Ver ficha</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#f0f4f8]">
            {/* Load more button */}
            {currentPage < totalPages && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => loadMessages(activeConv.id, currentPage + 1)}
                  disabled={messagesLoading}
                  className="text-xs text-primary-600 hover:text-primary-700 bg-white px-3 py-1.5 rounded-full border shadow-sm"
                >
                  {messagesLoading ? "Cargando..." : "Cargar mensajes anteriores"}
                </button>
              </div>
            )}

            {messagesLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Cargando mensajes...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No hay mensajes aún</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t bg-white">
            {activeConv.status === "CLOSED" ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400">
                <span>Esta conversación está cerrada.</span>
                <button
                  onClick={() => updateConversation({ status: "OPEN" })}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Reabrir
                </button>
              </div>
            ) : activeConv.channel === "WHATSAPP" && !activeConv.windowOpen ? (
              /* Window closed — only template sending */
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed">
                  Ventana de 24hs cerrada
                </div>
                <button
                  onClick={() => setTemplateSelectorOpen(true)}
                  disabled={sending}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Enviar template</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
                  rows={1}
                  className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent max-h-28 overflow-y-auto"
                  style={{ height: "auto" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(target.scrollHeight, 112)}px`;
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                  className="flex-shrink-0 w-9 h-9 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <NewConversationModal
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onCreated={(conv) => {
          setConversations((prev) => [conv as unknown as Conversation, ...prev]);
          selectConversation(conv as unknown as Conversation);
        }}
      />

      {activeConv && (
        <TemplateSelector
          open={templateSelectorOpen}
          onClose={() => setTemplateSelectorOpen(false)}
          onSelect={sendTemplate}
          conversationId={activeConv.id}
        />
      )}
    </div>
  );
}
