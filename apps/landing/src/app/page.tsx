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
} from "lucide-react";
import { ScrollAnimate } from "@/components/scroll-animate";
import { MobileNav } from "@/components/mobile-nav";
import { FaqAccordion } from "@/components/faq-accordion";

/* ─── Navbar ─────────────────────────────────────────────────────────────── */

function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">DF</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            Dental<span className="text-primary-600">Flow</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#funcionalidades" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
            Funcionalidades
          </a>
          <a href="#precios" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
            Precios
          </a>
          <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
            FAQ
          </a>
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="http://localhost:3000/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
          >
            Iniciar sesión
          </a>
          <a
            href="http://localhost:3000/login"
            className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Empezar gratis
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
      {/* Title bar */}
      <div className="bg-gray-50 border-b px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-gray-400 ml-2">app.dentalflow.com</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Citas hoy", value: "12", color: "bg-blue-50 text-blue-600" },
            { label: "Pacientes", value: "847", color: "bg-emerald-50 text-emerald-600" },
            { label: "Mensajes", value: "156", color: "bg-purple-50 text-purple-600" },
          ].map((m) => (
            <div key={m.label} className="bg-white border rounded-lg p-2.5">
              <p className="text-[10px] text-gray-400">{m.label}</p>
              <p className={`text-lg font-bold ${m.color.split(" ")[1]}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Mini agenda */}
        <div className="border rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Próximas citas</p>
          {[
            { time: "09:00", name: "María López", color: "#3b82f6" },
            { time: "10:30", name: "Carlos Ruiz", color: "#10b981" },
            { time: "11:00", name: "Ana García", color: "#8b5cf6" },
          ].map((a) => (
            <div key={a.time} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-[10px] font-mono text-gray-500 w-10">{a.time}</span>
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="text-xs text-gray-700">{a.name}</span>
            </div>
          ))}
        </div>

        {/* Mini pipeline */}
        <div className="flex gap-1.5 overflow-hidden">
          {[
            { name: "Nuevo", count: 5, color: "#3b82f6" },
            { name: "Interesado", count: 8, color: "#f59e0b" },
            { name: "Agendado", count: 3, color: "#10b981" },
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
          {/* Text */}
          <div>
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap className="h-3.5 w-3.5" />
              Plataforma todo-en-uno para clínicas dentales
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-gray-900 leading-[1.1] tracking-tight">
              Tu clínica dental.{" "}
              <span className="text-primary-600">Una sola plataforma.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
              Agenda, CRM, WhatsApp, chatbot IA y campañas de marketing. Todo lo que
              necesitás para gestionar y hacer crecer tu clínica dental, en un solo lugar.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="http://localhost:3000/login"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 text-sm"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#funcionalidades"
                className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors text-sm bg-white"
              >
                Ver demo
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
              <span>🇦🇷 Hecho en Argentina</span>
              <span>🔒 Datos encriptados</span>
              <span>⚡ Setup en 5 minutos</span>
            </div>
          </div>

          {/* Mockup */}
          <div className="flex justify-center lg:justify-end">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Social Proof / Logos ────────────────────────────────────────────────── */

function SocialProof() {
  return (
    <section className="py-12 border-y border-gray-100 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">
          Diseñado para clínicas que quieren crecer
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-40">
          {/* WhatsApp */}
          <div className="flex items-center gap-2">
            <MessageSquare className="h-7 w-7" />
            <span className="text-sm font-semibold hidden sm:inline">WhatsApp</span>
          </div>
          {/* Google Calendar */}
          <div className="flex items-center gap-2">
            <Calendar className="h-7 w-7" />
            <span className="text-sm font-semibold hidden sm:inline">Google Calendar</span>
          </div>
          {/* Anthropic */}
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7" />
            <span className="text-sm font-semibold hidden sm:inline">Claude IA</span>
          </div>
          {/* Meta */}
          <div className="flex items-center gap-2">
            <Users className="h-7 w-7" />
            <span className="text-sm font-semibold hidden sm:inline">Meta Business</span>
          </div>
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
      desc: "No tenés seguimiento de los interesados. Te escriben por WhatsApp, les pasás el precio, y después... nada. Se olvidan.",
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
      desc: "Pagás Kommo + Dentalink + ManyChat + herramientas separadas. $300/mes en tools que ni se comunican entre sí.",
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
            ¿Seguís usando WhatsApp personal, Excel y 5 herramientas diferentes?
          </h2>
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
            Con DentalFlow, todo está conectado en un solo lugar
          </h3>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            Un paciente te escribe por WhatsApp → la IA lo atiende → agenda una cita → entra al CRM → recibe recordatorios automáticos. Todo sin que levantes un dedo.
          </p>
        </ScrollAnimate>
      </div>
    </section>
  );
}

/* ─── Features ────────────────────────────────────────────────────────────── */

function AgendaMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-700">Marzo 2026</span>
        <span className="text-xs text-primary-600 font-medium">Semana</span>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center mb-2">
        {["Lun 16", "Mar 17", "Mié 18", "Jue 19", "Vie 20"].map((d) => (
          <span key={d} className="text-[10px] text-gray-400 font-medium">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {[
          { col: 0, label: "09:00 M. López", color: "#3b82f6" },
          { col: 1, label: "10:00 C. Ruiz", color: "#10b981" },
          { col: 0, label: "11:00 A. García", color: "#8b5cf6" },
          { col: 2, label: "09:30 P. Díaz", color: "#f59e0b" },
          { col: 3, label: "14:00 L. Torres", color: "#3b82f6" },
          { col: 4, label: "10:00 R. Silva", color: "#10b981" },
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
          { name: "Nuevo Contacto", color: "#3b82f6", patients: ["María L.", "Pedro G."] },
          { name: "Interesado", color: "#f59e0b", patients: ["Carlos R.", "Ana M.", "Luis T."] },
          { name: "Agendado", color: "#10b981", patients: ["Roberto S."] },
        ].map((col) => (
          <div key={col.name} className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-[10px] font-semibold text-gray-700 truncate">{col.name}</span>
              <span className="text-[9px] text-gray-400 ml-auto">{col.patients.length}</span>
            </div>
            <div className="space-y-1.5">
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

function WhatsAppMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden w-full max-w-md">
      <div className="bg-primary-600 px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-xs font-bold text-white">ML</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white">María López</p>
          <p className="text-[10px] text-primary-200">En línea</p>
        </div>
      </div>
      <div className="p-3 bg-[#f0f4f8] space-y-2">
        <div className="flex justify-start">
          <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 max-w-[75%] shadow-sm">
            Hola, quisiera agendar un turno para limpieza dental
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-primary-600 rounded-xl rounded-tr-sm px-3 py-2 text-xs text-white max-w-[75%] shadow-sm">
            ¡Hola María! Con gusto te agendo. Tenemos turnos disponibles el martes 17 a las 10:00 o el miércoles 18 a las 14:00. ¿Cuál te queda mejor?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 max-w-[75%] shadow-sm">
            El martes a las 10 me viene perfecto!
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatbotMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden w-full max-w-md">
      <div className="bg-gray-50 border-b px-4 py-2.5 flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary-600" />
        <span className="text-xs font-semibold text-gray-700">Chatbot IA — DentalFlow</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 max-w-[80%]">
            Quiero saber cuánto sale un blanqueamiento
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-primary-600 rounded-xl rounded-tr-sm px-3 py-2 text-xs text-white max-w-[80%]">
            <div className="flex items-center gap-1 mb-1 text-primary-200">
              <Bot className="h-3 w-3" />
              <span className="text-[10px] font-medium">IA</span>
            </div>
            ¡Hola! El blanqueamiento dental tiene un costo de $45.000. Incluye evaluación previa + 2 sesiones. ¿Te gustaría agendar una consulta?
          </div>
        </div>
        <div className="flex justify-end">
          <div className="flex gap-1.5">
            <span className="bg-primary-50 text-primary-700 text-[10px] font-medium px-2.5 py-1 rounded-full border border-primary-200">Sí, agendar</span>
            <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2.5 py-1 rounded-full border border-gray-200">Más info</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignsMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <p className="text-xs font-semibold text-gray-700 mb-3">Campañas activas</p>
      {[
        { name: "Recordatorio 24hs", type: "Automática", status: "Activa", statusColor: "bg-emerald-100 text-emerald-700" },
        { name: "Feliz Cumpleaños", type: "Automática", status: "Activa", statusColor: "bg-emerald-100 text-emerald-700" },
        { name: "Reactivación 6 meses", type: "Programada", status: "Borrador", statusColor: "bg-gray-100 text-gray-600" },
      ].map((c) => (
        <div key={c.name} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
          <Megaphone className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
            <p className="text-[10px] text-gray-400">{c.type}</p>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.statusColor}`}>
            {c.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function FichaMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="flex items-center gap-3 mb-3 pb-3 border-b">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-sm font-bold text-primary-700">ML</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">María López</p>
          <p className="text-xs text-gray-400">+54 9 11 5555-1234 · 32 años</p>
        </div>
      </div>
      <div className="flex gap-1.5 mb-3">
        {["Odontograma", "Historia", "Tratamiento", "Notas"].map((tab, i) => (
          <span
            key={tab}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
              i === 0 ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      {/* Simple tooth grid */}
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={`w-full aspect-square rounded border text-center flex items-center justify-center text-[8px] font-mono ${
              [2, 5, 11].includes(i) ? "bg-red-100 border-red-300 text-red-600" : "bg-gray-50 border-gray-200 text-gray-400"
            }`}
          >
            {i + 11}
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: <Calendar className="h-5 w-5 text-primary-600" />,
    title: "Agenda Inteligente",
    desc: "Calendario multi-dentista sincronizado con Google Calendar. Tus pacientes nunca más pierden un turno. Validación de conflictos, horarios laborales y drag-and-drop.",
    mockup: <AgendaMockup />,
  },
  {
    icon: <Users className="h-5 w-5 text-primary-600" />,
    title: "CRM Pipeline",
    desc: "Seguí a cada paciente desde el primer contacto hasta la fidelización. Visualizá en qué etapa está cada uno con un tablero Kanban de 8 etapas automatizadas.",
    mockup: <PipelineMockup />,
  },
  {
    icon: <MessageSquare className="h-5 w-5 text-primary-600" />,
    title: "WhatsApp Integrado",
    desc: "Conectá el WhatsApp de tu clínica con la API oficial de Meta. Respondé desde DentalFlow, sin cambiar de app. Delivery status, burbujas, todo el estilo.",
    mockup: <WhatsAppMockup />,
  },
  {
    icon: <Bot className="h-5 w-5 text-primary-600" />,
    title: "Chatbot IA",
    desc: "Un asistente que agenda citas, responde preguntas frecuentes y atiende pacientes 24/7. Powered by Claude de Anthropic. Vos descansás, la IA trabaja.",
    mockup: <ChatbotMockup />,
  },
  {
    icon: <Megaphone className="h-5 w-5 text-primary-600" />,
    title: "Campañas de Marketing",
    desc: "Recordatorios de citas, reactivación de inactivos, cumpleaños con descuentos. Todo automático por WhatsApp. 15 templates listos para usar.",
    mockup: <CampaignsMockup />,
  },
  {
    icon: <ClipboardList className="h-5 w-5 text-primary-600" />,
    title: "Ficha del Paciente",
    desc: "Odontograma SVG interactivo, historia médica, plan de tratamiento, notas clínicas y periodontograma. Todo digitalizado en la ficha del paciente.",
    mockup: <FichaMockup />,
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
            Todo lo que tu clínica necesita
          </h2>
          <p className="text-gray-500 mt-4">
            6 herramientas integradas que trabajan juntas. Sin apps externas, sin copiar datos, sin perder tiempo.
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{feat.title}</h3>
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

/* ─── Comparison ──────────────────────────────────────────────────────────── */

function Comparison() {
  const rows = [
    { feature: "Agenda", separate: "Google Calendar (gratis)", df: "Integrada" },
    { feature: "CRM", separate: "Kommo ($30-150/mes)", df: "Integrado" },
    { feature: "Ficha clínica", separate: "Dentalink ($50-100/mes)", df: "Integrada" },
    { feature: "WhatsApp", separate: "WhatsApp Business (manual)", df: "Automatizado + IA" },
    { feature: "Chatbot", separate: "ManyChat ($15-50/mes)", df: "IA incluida" },
    { feature: "Campañas", separate: "Mailchimp ($20-50/mes)", df: "Incluidas" },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center mb-12">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">
            Comparación
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            ¿Por qué DentalFlow?
          </h2>
        </ScrollAnimate>

        <ScrollAnimate>
          <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 border-b">
              <div className="px-4 sm:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Funcionalidad
              </div>
              <div className="px-4 sm:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Herramientas separadas
              </div>
              <div className="px-4 sm:px-6 py-4 text-xs font-semibold text-primary-600 uppercase tracking-wider text-center bg-primary-50/50">
                DentalFlow
              </div>
            </div>
            {rows.map((row) => (
              <div key={row.feature} className="grid grid-cols-3 border-b border-gray-100 last:border-0">
                <div className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                  {row.feature}
                </div>
                <div className="px-4 sm:px-6 py-4 text-sm text-gray-500 text-center flex items-center justify-center gap-1.5">
                  <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0 hidden sm:inline" />
                  <span className="text-xs sm:text-sm">{row.separate}</span>
                </div>
                <div className="px-4 sm:px-6 py-4 text-sm text-primary-700 font-medium text-center bg-primary-50/30 flex items-center justify-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{row.df}</span>
                </div>
              </div>
            ))}
            {/* Total row */}
            <div className="grid grid-cols-3 bg-gray-50 border-t-2 border-gray-200">
              <div className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900">Total</div>
              <div className="px-4 sm:px-6 py-4 text-sm font-bold text-red-600 text-center">
                $115-350/mes + tiempo
              </div>
              <div className="px-4 sm:px-6 py-4 text-sm font-bold text-primary-700 text-center bg-primary-50/50">
                Desde $150/mes todo incluido
              </div>
            </div>
          </div>
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
      price: "150",
      popular: false,
      features: [
        "1 dentista",
        "500 mensajes WhatsApp/mes",
        "250 interacciones IA/mes",
        "CRM básico",
        "Ficha del paciente",
        "Soporte por WhatsApp",
      ],
      cta: "Empezar con Starter",
    },
    {
      name: "Pro",
      price: "300",
      popular: true,
      features: [
        "Dentistas ilimitados",
        "Agenda + Google Calendar",
        "2.000 mensajes WhatsApp/mes",
        "1.000 interacciones IA/mes",
        "CRM completo + Pipeline",
        "Campañas de marketing",
        "Soporte prioritario",
      ],
      cta: "Empezar con Pro",
    },
    {
      name: "Enterprise",
      price: "500",
      popular: false,
      features: [
        "Todo ilimitado",
        "Analytics avanzados",
        "API personalizada",
        "Soporte dedicado",
        "Onboarding personalizado",
        "Múltiples sucursales",
        "SLA garantizado",
      ],
      cta: "Contactar ventas",
    },
  ];

  return (
    <section id="precios" className="py-20 sm:py-28 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">
            Precios
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Simple, transparente, sin sorpresas
          </h2>
          <p className="text-gray-500 mt-4">
            Elegí el plan que se adapte a tu clínica. Actualizá o cancelá en cualquier momento.
          </p>
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
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                    <span className="text-sm text-gray-500">/mes</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="http://localhost:3000/login"
                  className={`block text-center text-sm font-semibold py-3 rounded-lg transition-all ${
                    plan.popular
                      ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/25"
                      : "border border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            </ScrollAnimate>
          ))}
        </div>

        <ScrollAnimate className="text-center mt-10">
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            Todos los planes incluyen: encriptación AES-256, soporte por WhatsApp, actualizaciones gratis, sin contratos de permanencia.
          </p>
        </ScrollAnimate>
      </div>
    </section>
  );
}

/* ─── Testimonials ────────────────────────────────────────────────────────── */

function Testimonials() {
  const testimonials = [
    {
      name: "Dr. Carlos Fernández",
      clinic: "Clínica Dental Sonrisa, Buenos Aires",
      quote: "Antes perdía 2 horas por día agendando turnos y mandando recordatorios. Con DentalFlow, todo es automático. Recuperé mi tiempo para atender pacientes.",
      initials: "CF",
      color: "bg-blue-500",
    },
    {
      name: "Dra. María González",
      clinic: "Centro Odontológico Mendoza",
      quote: "El chatbot IA es increíble. Atiende consultas a las 2 AM, agenda turnos solo, y los pacientes ni se dan cuenta que es un bot. Imprescindible.",
      initials: "MG",
      color: "bg-purple-500",
    },
    {
      name: "Dr. Roberto Silva",
      clinic: "Dental Care, Santiago de Chile",
      quote: "El pipeline CRM cambió todo. Ahora sé exactamente quién está interesado, quién agendó y quién necesita seguimiento. Aumenté mi tasa de conversión un 40%.",
      initials: "RS",
      color: "bg-emerald-500",
    },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimate className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">
            Testimonios
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Lo que dicen nuestros clientes
          </h2>
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
                  <div
                    className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center flex-shrink-0`}
                  >
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
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Preguntas frecuentes
          </h2>
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
    <section className="py-20 sm:py-28 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Llevá tu clínica al siguiente nivel
        </h2>
        <p className="mt-4 text-lg text-primary-100 max-w-xl mx-auto">
          Empezá hoy y descubrí por qué cientos de clínicas ya confían en DentalFlow para gestionar su día a día.
        </p>
        <div className="mt-8">
          <a
            href="http://localhost:3000/login"
            className="inline-flex items-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-semibold px-8 py-3.5 rounded-lg transition-colors shadow-lg text-sm"
          >
            Empezar gratis
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-xs text-primary-200">
            Sin tarjeta de crédito · Setup en 5 minutos · Cancelá cuando quieras
          </p>
        </div>
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
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">DF</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Dental<span className="text-primary-400">Flow</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              La plataforma todo-en-uno para clínicas dentales en Latinoamérica.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Producto</h4>
            <ul className="space-y-2.5">
              <li><a href="#funcionalidades" className="text-sm hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#precios" className="text-sm hover:text-white transition-colors">Precios</a></li>
              <li><a href="#faq" className="text-sm hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm hover:text-white transition-colors">Sobre nosotros</a></li>
              <li><a href="#" className="text-sm hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm hover:text-white transition-colors">Contacto</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><a href="https://www.violetwaveai.com/dentalflow/politica-de-privacidad" className="text-sm hover:text-white transition-colors">Política de privacidad</a></li>
              <li><a href="#" className="text-sm hover:text-white transition-colors">Términos de servicio</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-xs text-gray-500">
            &copy; 2026 DentalFlow by Violet Wave IA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
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
        <Comparison />
        <Pricing />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
