import {
  Calendar,
  Users,
  MessageSquare,
  Bot,
  Megaphone,
  ClipboardList,
  Check,
  X,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Star,
  Instagram,
  Linkedin,
  Phone,
  BarChart3,
  PenTool,
  FileText,
  Image,
  Pill,
  Bell,
  UserCheck,
  Building2,
  Smartphone,
  Lock,
  MessageCircle,
} from "lucide-react";
import { ScrollAnimate } from "@/components/scroll-animate";
import { MobileNav } from "@/components/mobile-nav";
import { FaqAccordion } from "@/components/faq-accordion";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/registro`
  : process.env.NODE_ENV === "production"
    ? "https://dashboard.dentiqa.app/registro"
    : "http://localhost:3000/registro";
const WA_URL = "https://wa.me/5492612312567?text=Hola%2C%20quiero%20info%20sobre%20Dentiqa";

/* ─── Navbar ─────────────────────────────────────────────────────────────── */

function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">DQ</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 tracking-tight leading-none">
              Denti<span className="text-primary-600">qa</span>
            </span>
            <span className="text-[9px] text-gray-400 leading-none">by Violet Wave IA</span>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#funcionalidades" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">Funcionalidades</a>
          <a href="#precios" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">Precios</a>
          <a href="#testimonios" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">Testimonios</a>
          <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">FAQ</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href={APP_URL} className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-5 py-2 rounded-lg transition-colors shadow-sm">
            Probá gratis 14 días
          </a>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */

function DashboardMockup() {
  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200/80 overflow-hidden w-full max-w-lg">
      <div className="bg-gray-50 border-b px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-gray-400 ml-2">dashboard.dentiqa.app</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Citas hoy", value: "12", color: "text-blue-600" },
            { label: "Pacientes", value: "847", color: "text-emerald-600" },
            { label: "IA activa", value: "24/7", color: "text-purple-600" },
          ].map((m) => (
            <div key={m.label} className="bg-white border rounded-lg p-2.5">
              <p className="text-[10px] text-gray-400">{m.label}</p>
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Próximas citas</p>
          {[
            { time: "09:00", name: "María López — Limpieza", color: "#3b82f6" },
            { time: "10:30", name: "Carlos Ruiz — Ortodoncia", color: "#10b981" },
            { time: "11:00", name: "Ana García — Control", color: "#8b5cf6" },
          ].map((a) => (
            <div key={a.time} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-[10px] font-mono text-gray-500 w-10">{a.time}</span>
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="text-xs text-gray-700">{a.name}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[
            { name: "Nuevo", count: 5, color: "#3b82f6" },
            { name: "Interesado", count: 8, color: "#f59e0b" },
            { name: "Agendado", count: 12, color: "#10b981" },
          ].map((s) => (
            <div key={s.name} className="flex-1 bg-gray-50 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[9px] font-medium text-gray-600">{s.name}</span>
              </div>
              <span className="text-xs font-bold text-gray-800">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="pt-24 pb-16 sm:pt-32 sm:pb-24 bg-gradient-to-b from-primary-50/40 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap className="h-3.5 w-3.5" />
              Plataforma todo-en-uno con IA integrada
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-gray-900 leading-[1.1] tracking-tight">
              Software para Clínicas Dentales{" "}
              <span className="text-primary-600">con IA y WhatsApp</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
              Agenda, historial clínico, WhatsApp con chatbot IA, pipeline CRM, estadísticas y
              más — todo en una sola plataforma. Reemplazá 5 herramientas con una.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={APP_URL}
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 text-sm"
              >
                Empezá tu prueba gratis de 14 días
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#funcionalidades"
                className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors text-sm bg-white"
              >
                Ver funcionalidades
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
              <span>🚀 +50 funcionalidades</span>
              <span>🤖 IA integrada</span>
              <span>📱 WhatsApp Business</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Social Proof ────────────────────────────────────────────────────────── */

function SocialProof() {
  return (
    <section className="py-12 border-y border-gray-100 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">
          Confiado por clínicas dentales en Argentina, Chile, Colombia y México
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { label: "8+ módulos", desc: "integrados" },
            { label: "24/7", desc: "chatbot IA" },
            { label: "3 capas", desc: "de inteligencia artificial" },
            { label: "0 papel", desc: "100% digital" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Problem → Solution ──────────────────────────────────────────────────── */

function ProblemSolution() {
  const problems = [
    {
      icon: <TrendingDown className="h-6 w-6 text-red-500" />,
      title: "Perdés pacientes",
      desc: "Te escriben por WhatsApp, les pasás el precio, y después... nada. No tenés seguimiento de los interesados.",
      bg: "bg-red-50",
    },
    {
      icon: <Clock className="h-6 w-6 text-amber-500" />,
      title: "Perdés tiempo",
      desc: "Agendás manual, mandás recordatorios uno por uno, buscás fichas en papel. Horas perdidas todos los días.",
      bg: "bg-amber-50",
    },
    {
      icon: <DollarSign className="h-6 w-6 text-orange-500" />,
      title: "Perdés dinero",
      desc: "Pagás Kommo + Dentalink + ManyChat + herramientas separadas. $300.000/mes en tools que ni se comunican entre sí.",
      bg: "bg-orange-50",
    },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <AlertTriangle className="h-3.5 w-3.5" />
            El problema
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            ¿Usás WhatsApp personal para hablar con pacientes?
          </h2>
          <p className="text-gray-500 mt-3">
            ¿Tenés la agenda en una app, el historial en otra y los cobros en un Excel?
          </p>
        </ScrollAnimate>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {problems.map((p, i) => (
            <ScrollAnimate key={p.title} delay={i * 100}>
              <div className={`${p.bg} rounded-2xl p-6 h-full border border-gray-200/50`}>
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4">
                  {p.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            </ScrollAnimate>
          ))}
        </div>

        <ScrollAnimate className="text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Check className="h-3.5 w-3.5" />
            La solución
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Dentiqa centraliza TODO en una plataforma
          </h3>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            Un chatbot con IA atiende por WhatsApp 24/7, agenda citas automáticamente, envía recordatorios, y vos te concentrás en atender pacientes.
          </p>
        </ScrollAnimate>
      </div>
    </section>
  );
}

/* ─── Feature Mockups ────────────────────────────────────────────────────── */

function WhatsAppChatMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden w-full max-w-md">
      <div className="bg-emerald-600 px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Dental Smile IA</p>
          <p className="text-[10px] text-emerald-200">Escribiendo...</p>
        </div>
      </div>
      <div className="p-3 bg-[#efeae2] space-y-2">
        <div className="flex justify-start">
          <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 max-w-[75%] shadow-sm">
            Hola, quisiera agendar un turno para limpieza dental
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-[#dcf8c6] rounded-xl rounded-tr-sm px-3 py-2 text-xs text-gray-800 max-w-[75%] shadow-sm">
            <p className="text-[10px] text-emerald-600 font-medium mb-1">🤖 IA</p>
            ¡Hola María! Tenemos estos turnos disponibles:
          </div>
        </div>
        <div className="flex justify-end">
          <div className="flex flex-col gap-1.5">
            {["🗓 Mar 17 — 10:00hs", "🗓 Mié 18 — 14:00hs", "🗓 Jue 19 — 09:30hs"].map((s) => (
              <span key={s} className="bg-white text-primary-700 text-[10px] font-medium px-3 py-1.5 rounded-lg border border-primary-200 text-center">{s}</span>
            ))}
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 max-w-[75%] shadow-sm">
            El martes a las 10 me viene perfecto!
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-[#dcf8c6] rounded-xl rounded-tr-sm px-3 py-2 text-xs text-gray-800 max-w-[75%] shadow-sm">
            ¡Listo! Tu cita quedó agendada para el *martes 17 a las 10:00* con la Dra. López. Te envío un recordatorio 24hs antes. 😊
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorialMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="flex items-center gap-3 mb-3 pb-3 border-b">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-sm font-bold text-primary-700">ML</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">María López</p>
          <p className="text-xs text-gray-400">32 años · OSDE 310</p>
        </div>
        <div className="flex gap-1">
          <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Alergia látex</span>
        </div>
      </div>
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {["Resumen", "Odontograma", "Perio", "Tratamiento", "Evoluciones", "Historia", "Imágenes", "Recetas"].map((tab, i) => (
          <span
            key={tab}
            className={`text-[9px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${
              i === 1 ? "bg-primary-50 text-primary-700" : "text-gray-400"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={`w-full aspect-square rounded border text-center flex items-center justify-center text-[7px] font-mono ${
              [2, 5].includes(i) ? "bg-red-100 border-red-300 text-red-600"
              : [8, 11].includes(i) ? "bg-blue-100 border-blue-300 text-blue-600"
              : "bg-gray-50 border-gray-200 text-gray-400"
            }`}
          >
            {i + 11}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[9px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-300" /> Caries</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-300" /> Restauración</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-200" /> Sano</span>
      </div>
    </div>
  );
}

function AgendaMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-700">Marzo 2026 — Semana</span>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Calendar className="h-3 w-3 text-primary-500" />
          <span>Google Calendar sync</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center mb-2">
        {["Lun 16", "Mar 17", "Mié 18", "Jue 19", "Vie 20"].map((d) => (
          <span key={d} className="text-[10px] text-gray-400 font-medium">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {[
          { col: 0, label: "09:00 Limpieza", color: "#3b82f6" },
          { col: 1, label: "10:00 Ortodoncia", color: "#10b981" },
          { col: 0, label: "11:00 Control", color: "#8b5cf6" },
          { col: 2, label: "09:30 Extracción", color: "#f59e0b" },
          { col: 3, label: "14:00 Implante", color: "#3b82f6" },
          { col: 4, label: "10:00 Blanqueo", color: "#10b981" },
        ].map((a, i) => (
          <div
            key={i}
            className="rounded-md px-1.5 py-1 text-[9px] text-white font-medium"
            style={{ backgroundColor: a.color, gridColumn: a.col + 1 }}
          >
            {a.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="flex gap-2 overflow-hidden">
        {[
          { name: "Nuevo Contacto", color: "#6b7280", patients: ["María L.", "Pedro G."], value: "$0" },
          { name: "Interesado", color: "#f59e0b", patients: ["Carlos R.", "Ana M.", "Luis T."], value: "$285.000" },
          { name: "Cita Agendada", color: "#3b82f6", patients: ["Roberto S.", "Laura D."], value: "$140.000" },
        ].map((col) => (
          <div key={col.name} className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-[9px] font-semibold text-gray-700 truncate">{col.name}</span>
            </div>
            <p className="text-[8px] text-gray-400 mb-1.5">{col.value}</p>
            <div className="space-y-1">
              {col.patients.map((p) => (
                <div key={p} className="bg-gray-50 rounded-md p-1.5 border border-gray-100">
                  <span className="text-[10px] font-medium text-gray-700">{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-700">Estadísticas — 30 días</span>
        <BarChart3 className="h-4 w-4 text-primary-500" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: "Citas completadas", value: "156", change: "+12%" },
          { label: "Pacientes nuevos", value: "34", change: "+8%" },
          { label: "Ingresos", value: "$4.2M", change: "+15%" },
          { label: "Tasa asistencia", value: "89%", change: "+3%" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-400">{s.label}</p>
            <p className="text-sm font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-emerald-600">{s.change}</p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1 h-16">
        {[40, 55, 35, 70, 60, 80, 65, 90, 75, 85, 70, 95].map((h, i) => (
          <div key={i} className="flex-1 bg-primary-200 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-gray-400">Ene</span>
        <span className="text-[8px] text-gray-400">Dic</span>
      </div>
    </div>
  );
}

function CampaignsMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <p className="text-xs font-semibold text-gray-700 mb-3">Campañas activas</p>
      {[
        { name: "Recordatorio 24hs", type: "Automática", sent: "234", statusColor: "bg-emerald-100 text-emerald-700" },
        { name: "Feliz Cumpleaños", type: "Automática", sent: "45", statusColor: "bg-emerald-100 text-emerald-700" },
        { name: "Reactivación 6 meses", type: "Programada", sent: "128", statusColor: "bg-blue-100 text-blue-700" },
        { name: "Post-procedimiento", type: "Automática", sent: "67", statusColor: "bg-emerald-100 text-emerald-700" },
      ].map((c) => (
        <div key={c.name} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
          <Megaphone className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
            <p className="text-[10px] text-gray-400">{c.type} · {c.sent} enviados</p>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.statusColor}`}>Activa</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Features ────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <Bot className="h-5 w-5 text-primary-600" />,
    title: "Chatbot IA por WhatsApp",
    subtitle: "Tu recepcionista virtual que nunca duerme",
    desc: "Atiende consultas, agenda citas, registra pacientes nuevos, envía recordatorios — todo por WhatsApp Business. 3 capas de IA: respuestas automáticas → conversación inteligente → escalación a humano.",
    mockup: <WhatsAppChatMockup />,
  },
  {
    icon: <ClipboardList className="h-5 w-5 text-primary-600" />,
    title: "Historial Clínico Profesional",
    subtitle: "8 tabs completas por paciente",
    desc: "Odontograma con versionado (permanente + temporal), periodontograma con métricas BOP/NIC, plan de tratamiento con presupuesto, evoluciones con firma digital, recetas, consentimientos, galería de imágenes y más.",
    mockup: <HistorialMockup />,
  },
  {
    icon: <Calendar className="h-5 w-5 text-primary-600" />,
    title: "Agenda Inteligente",
    subtitle: "Multi-dentista con Google Calendar",
    desc: "Vista semanal/diaria, drag-and-drop, validaciones de horario, conflictos con GCal, recordatorios automáticos 24h antes vía WhatsApp. Sincronización bidireccional con Google Calendar.",
    mockup: <AgendaMockup />,
  },
  {
    icon: <Users className="h-5 w-5 text-primary-600" />,
    title: "Pipeline CRM",
    subtitle: "Convertí cada contacto en un paciente fidelizado",
    desc: "8 etapas configurables con automatizaciones: auto-mensaje WhatsApp, auto-mover, descuentos automáticos. Valor monetario por etapa, drag-and-drop, todo conectado con la agenda.",
    mockup: <PipelineMockup />,
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-primary-600" />,
    title: "Estadísticas y Analytics",
    subtitle: "Sabé exactamente cómo va tu clínica",
    desc: "Gráficos de citas, ingresos, top tratamientos, rendimiento por dentista, mapa de calor de horarios. Filtrable por período. Métricas con comparación vs período anterior.",
    mockup: <StatsMockup />,
  },
  {
    icon: <Megaphone className="h-5 w-5 text-primary-600" />,
    title: "Campañas de Marketing",
    subtitle: "Mantené a tus pacientes activos",
    desc: "Templates prediseñados, segmentación, métricas de envío. Campañas de cumpleaños, reactivación, seguimiento post-tratamiento — TODO automático por WhatsApp.",
    mockup: <CampaignsMockup />,
  },
];

function Features() {
  return (
    <section id="funcionalidades" className="py-20 sm:py-28 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">
            Funcionalidades
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Funcionalidades del Software Dental
          </h2>
          <p className="text-gray-500 mt-4">
            6 módulos principales que trabajan juntos. Sin apps externas, sin copiar datos, sin perder tiempo.
          </p>
        </ScrollAnimate>

        <div className="space-y-20">
          {FEATURES.map((feat, i) => {
            const reversed = i % 2 !== 0;
            return (
              <div
                key={feat.title}
                className={`flex flex-col ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-16`}
              >
                <ScrollAnimate direction={reversed ? "right" : "left"} className="flex-1">
                  <div className="max-w-md">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                      {feat.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{feat.title}</h3>
                    <p className="text-sm font-medium text-primary-600 mb-3">{feat.subtitle}</p>
                    <p className="text-gray-600 leading-relaxed">{feat.desc}</p>
                  </div>
                </ScrollAnimate>
                <ScrollAnimate direction={reversed ? "left" : "right"} className="flex-1 flex justify-center">
                  {feat.mockup}
                </ScrollAnimate>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Additional Features Grid ────────────────────────────────────────────── */

const EXTRA_FEATURES = [
  { icon: <PenTool className="h-5 w-5" />, title: "Firma digital", desc: "En evoluciones y recetas" },
  { icon: <FileText className="h-5 w-5" />, title: "Consentimientos", desc: "Plantillas + firma paciente" },
  { icon: <BarChart3 className="h-5 w-5" />, title: "Periodontograma", desc: "Métricas BOP, NIC, placa" },
  { icon: <ClipboardList className="h-5 w-5" />, title: "Odontograma", desc: "Versionado + pediátrico" },
  { icon: <Image className="h-5 w-5" />, title: "Galería de imágenes", desc: "Radiografías + intraorales" },
  { icon: <Pill className="h-5 w-5" />, title: "Recetas médicas", desc: "Con plantillas pre-armadas" },
  { icon: <Bell className="h-5 w-5" />, title: "Notificaciones", desc: "4 categorías inteligentes" },
  { icon: <UserCheck className="h-5 w-5" />, title: "Multi-usuario", desc: "Dueño, Admin, Dentista, Recep." },
  { icon: <Building2 className="h-5 w-5" />, title: "Multi-clínica", desc: "Próximamente" },
  { icon: <Shield className="h-5 w-5" />, title: "Seguridad", desc: "AES-256 + audit logs" },
  { icon: <Smartphone className="h-5 w-5" />, title: "100% responsive", desc: "Celular, tablet, PC" },
  { icon: <Bot className="h-5 w-5" />, title: "IA personalizable", desc: "Tono y reglas por clínica" },
];

function ExtraFeatures() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Y mucho más...
          </h2>
          <p className="text-gray-500 mt-3">+50 funcionalidades diseñadas para clínicas dentales</p>
        </ScrollAnimate>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {EXTRA_FEATURES.map((f, i) => (
            <ScrollAnimate key={f.title} delay={i * 50}>
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow h-full">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 mb-3">
                  {f.icon}
                </div>
                <h4 className="text-sm font-semibold text-gray-900">{f.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
              </div>
            </ScrollAnimate>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Comparison ──────────────────────────────────────────────────────────── */

function Comparison() {
  const rows = [
    { feature: "Chatbot IA por WhatsApp", df: true, dentalink: false, kommo: false, excel: false },
    { feature: "Odontograma digital", df: true, dentalink: true, kommo: false, excel: false },
    { feature: "Periodontograma", df: true, dentalink: true, kommo: false, excel: false },
    { feature: "Pipeline CRM", df: true, dentalink: false, kommo: true, excel: false },
    { feature: "Firma digital", df: true, dentalink: true, kommo: false, excel: false },
    { feature: "Recordatorios automáticos", df: true, dentalink: true, kommo: true, excel: false },
    { feature: "Estadísticas avanzadas", df: true, dentalink: true, kommo: true, excel: false },
    { feature: "Campañas WhatsApp", df: true, dentalink: false, kommo: true, excel: false },
    { feature: "Google Calendar sync", df: true, dentalink: false, kommo: false, excel: false },
  ];

  const Tick = () => <Check className="h-4 w-4 text-emerald-500 mx-auto" />;
  const Cross = () => <X className="h-4 w-4 text-gray-300 mx-auto" />;

  return (
    <section className="py-20 sm:py-28 bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center mb-12">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Comparación</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Comparativa: Dentiqa vs Otros Sistemas Dentales</h2>
        </ScrollAnimate>

        <ScrollAnimate>
          <div className="bg-white rounded-2xl shadow-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Funcionalidad</th>
                  <th className="px-3 py-3 text-xs font-semibold text-primary-600 bg-primary-50/50">Dentiqa</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500">Dentalink</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500">Kommo CRM</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Sin sistema</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.feature} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900 text-xs">{r.feature}</td>
                    <td className="px-3 py-3 bg-primary-50/20">{r.df ? <Tick /> : <Cross />}</td>
                    <td className="px-3 py-3">{r.dentalink ? <Tick /> : <Cross />}</td>
                    <td className="px-3 py-3">{r.kommo ? <Tick /> : <Cross />}</td>
                    <td className="px-3 py-3 hidden sm:table-cell">{r.excel ? <Tick /> : <Cross />}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-bold text-gray-900 text-xs">Precio</td>
                  <td className="px-3 py-3 font-bold text-primary-700 text-xs text-center bg-primary-50/50">Desde USD 89/mes</td>
                  <td className="px-3 py-3 text-gray-500 text-xs text-center">~USD 150/mes</td>
                  <td className="px-3 py-3 text-gray-500 text-xs text-center">~USD 100/mes</td>
                  <td className="px-3 py-3 text-gray-500 text-xs text-center hidden sm:table-cell">&quot;Gratis&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 text-center">
            * Comparación basada en funcionalidades estándar. Los resultados pueden variar según la implementación.
          </p>
        </ScrollAnimate>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────────────────────── */

function Pricing() {
  const plans = [
    {
      name: "Starter",
      usd: 89,
      localApprox: "125.000",
      ideal: "Clínicas pequeñas",
      popular: false,
      badges: [] as string[],
      features: [
        "5 usuarios",
        "2,000 mensajes WhatsApp/mes",
        "2,000 interacciones IA/mes",
        "Odontograma + Periodontograma",
        "Historial clínico completo",
        "Pipeline CRM",
        "Estadísticas básicas",
      ],
    },
    {
      name: "Professional",
      usd: 149,
      localApprox: "210.000",
      ideal: "Clínicas medianas",
      popular: true,
      badges: ["Funcionalidades Starter +"],
      features: [
        "10 usuarios",
        "5,000 mensajes WhatsApp/mes",
        "5,000 interacciones IA/mes",
        "Google Calendar sync",
        "Campañas de marketing",
        "Estadísticas avanzadas",
        "Firma digital",
        "Soporte prioritario",
      ],
    },
    {
      name: "Enterprise",
      usd: 249,
      localApprox: "350.000",
      ideal: "Clínicas grandes",
      popular: false,
      badges: ["Funcionalidades Starter +", "Funcionalidades Professional +"],
      features: [
        "Usuarios ilimitados",
        "10,000 mensajes WhatsApp/mes",
        "10,000 interacciones IA/mes",
        "Multi-clínica (próximamente)",
        "Acceso temprano a nuevas funcionalidades",
      ],
    },
  ];

  return (
    <section id="precios" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Precios</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Precios del Software Dental</h2>
          <p className="text-gray-500 mt-4">Todos los planes incluyen 14 días gratis. Sin tarjeta de crédito. Cancelá cuando quieras.</p>
        </ScrollAnimate>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <ScrollAnimate key={plan.name} delay={i * 100}>
              <div
                className={`relative rounded-2xl p-6 sm:p-8 h-full flex flex-col ${
                  plan.popular
                    ? "bg-white border-2 border-primary-600 shadow-xl shadow-primary-600/10"
                    : "bg-white border border-gray-200 shadow-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Más popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.ideal}</p>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">USD {plan.usd}</span>
                      <span className="text-sm text-gray-500">/mes</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">≈ $ {plan.localApprox} ARS/mes 🇦🇷</p>
                  </div>
                </div>
                <div className="mb-8 flex-1">
                  {plan.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {plan.badges.map((b) => (
                        <span key={b} className="inline-flex items-center text-[11px] font-medium text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href={APP_URL}
                  className={`block text-center text-sm font-semibold py-3 rounded-lg transition-all ${
                    plan.popular
                      ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/25"
                      : "border border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Empezar prueba gratis
                </a>
              </div>
            </ScrollAnimate>
          ))}
        </div>

        <ScrollAnimate className="mt-12 max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-gray-900">Implementación integral</h3>
              <p className="text-sm text-gray-500 mt-1">Te acompañamos en cada paso para que tu clínica funcione al 100% desde el día uno</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 mb-6">
              {[
                "Configuración completa de la plataforma",
                "Migración de datos desde tu sistema anterior",
                "Configuración de usuarios y permisos",
                "Configuración de WhatsApp Business con IA",
                "Personalización del chatbot para tu clínica",
                "Capacitación del equipo",
                "Configuración de agenda y profesionales",
                "Soporte prioritario durante el primer mes",
                "Integración con Google Calendar",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-primary-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
            <div className="text-center">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                Contactanos para más información
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
            </div>
          </div>
        </ScrollAnimate>

        <ScrollAnimate className="text-center mt-8 space-y-3">
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            14 días gratis. Sin tarjeta de crédito. Cancelá cuando quieras. Pagá con Mercado Pago.
          </p>
          <p className="text-sm text-gray-500">
            ¿Necesitás un plan personalizado?{" "}
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-medium hover:underline">
              Contactanos por WhatsApp
            </a>
          </p>
        </ScrollAnimate>
      </div>
    </section>
  );
}

/* ─── How it works ────────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    { num: "1", title: "Registrate", desc: "Creá tu cuenta en 2 minutos. Sin tarjeta de crédito." },
    { num: "2", title: "Conectá tu WhatsApp", desc: "Vinculá tu número de WhatsApp Business con un click. Tu chatbot IA empieza a trabajar inmediatamente." },
    { num: "3", title: "Gestioná tu clínica", desc: "Agenda, historial clínico, pipeline, estadísticas — todo desde un solo lugar." },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center mb-12">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Cómo funciona</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Empezá en 3 pasos</h2>
        </ScrollAnimate>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <ScrollAnimate key={s.num} delay={i * 100}>
              <div className="text-center">
                <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-600/25">
                  <span className="text-xl font-bold text-white">{s.num}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            </ScrollAnimate>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ────────────────────────────────────────────────────────── */

function Testimonials() {
  const testimonials = [
    {
      name: "Dra. Martina López",
      clinic: "Buenos Aires",
      quote: "Desde que implementamos Dentiqa, redujimos un 40% los turnos perdidos gracias al chatbot que confirma citas automáticamente.",
      initials: "ML",
      color: "bg-blue-500",
    },
    {
      name: "Dr. Sebastián Ruiz",
      clinic: "Mendoza",
      quote: "El historial clínico digital me ahorra 30 minutos por paciente. El odontograma con versionado es increíble.",
      initials: "SR",
      color: "bg-purple-500",
    },
    {
      name: "Dra. Camila Herrera",
      clinic: "Santiago de Chile",
      quote: "Mis pacientes agendan solos por WhatsApp a las 11pm. Antes perdía esos turnos. Ahora la IA trabaja mientras yo duermo.",
      initials: "CH",
      color: "bg-emerald-500",
    },
  ];

  return (
    <section id="testimonios" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Testimonios</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Lo que dicen nuestros clientes</h2>
        </ScrollAnimate>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <ScrollAnimate key={t.name} delay={i * 100}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-sm text-gray-600 leading-relaxed flex-1 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-xs font-bold text-white">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.clinic}</p>
                  </div>
                </div>
              </div>
            </ScrollAnimate>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ──────────────────────────────────────────────────────────────────── */

function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Preguntas Frecuentes sobre Dentiqa</h2>
        </ScrollAnimate>
        <ScrollAnimate>
          <FaqAccordion />
        </ScrollAnimate>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Tu clínica merece un software del siglo XXI
        </h2>
        <p className="mt-4 text-lg text-primary-100 max-w-xl mx-auto">
          Empezá hoy con 14 días gratis. Sin tarjeta de crédito.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={APP_URL}
            className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-semibold px-8 py-3.5 rounded-lg transition-colors shadow-lg text-sm"
          >
            Crear mi cuenta gratis
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Hablar con un asesor
          </a>
        </div>
        <p className="mt-4 text-xs text-primary-200">
          Sin tarjeta de crédito · Setup en 5 minutos · Cancelá cuando quieras
        </p>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">DQ</span>
              </div>
              <div>
                <span className="text-lg font-bold text-white tracking-tight block leading-none">
                  Denti<span className="text-primary-400">qa</span>
                </span>
                <span className="text-[10px] text-gray-500">by Violet Wave IA</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">La plataforma todo-en-uno para clínicas dentales en Latinoamérica.</p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Producto</h4>
            <ul className="space-y-2.5">
              <li><a href="#funcionalidades" className="text-sm hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#precios" className="text-sm hover:text-white transition-colors">Precios</a></li>
              <li><a href="#faq" className="text-sm hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm hover:text-white transition-colors">Sobre nosotros</a></li>
              <li><a href="#" className="text-sm hover:text-white transition-colors">Blog (próximamente)</a></li>
              <li><a href={WA_URL} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><a href="/legal/politica-de-privacidad" className="text-sm hover:text-white transition-colors">Política de privacidad</a></li>
              <li><a href="/legal/terminos-de-servicio" className="text-sm hover:text-white transition-colors">Términos de servicio</a></li>
              <li><a href="/legal/eliminacion-de-datos" className="text-sm hover:text-white transition-colors">Eliminación de datos</a></li>
            </ul>
          </div>
        </div>

        {/* SEO descriptive text */}
        <p className="text-xs text-gray-600 leading-relaxed mb-8 max-w-3xl">
          Dentiqa es un software de gestión para clínicas dentales desarrollado en Argentina por Violet Wave IA.
          Incluye agenda de turnos, historia clínica digital, odontograma, periodontograma, WhatsApp con inteligencia
          artificial, pipeline comercial, campañas de marketing, estadísticas y más. Disponible para clínicas en
          Argentina, Chile, Colombia, México, Perú, Uruguay, Brasil, Ecuador, Paraguay y Bolivia.
        </p>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-500">
            &copy; 2026 Dentiqa by Violet Wave IA. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-600">
            Hecho con 💙 en Argentina para toda Latinoamérica
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── WhatsApp Float ──────────────────────────────────────────────────────── */

function WhatsAppFloat() {
  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all hover:scale-110 group"
      title="¿Tenés dudas? Escribinos"
    >
      <MessageCircle className="h-6 w-6 text-white" />
      <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        ¿Tenés dudas? Escribinos
      </span>
    </a>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <ProblemSolution />
        <Features />
        <ExtraFeatures />
        <Comparison />
        <Pricing />
        <HowItWorks />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
