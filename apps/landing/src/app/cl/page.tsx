import type { Metadata } from "next";
import {
  Calendar,
  Users,
  MessageSquare,
  Bot,
  ClipboardList,
  BarChart3,
  Shield,
  Smartphone,
  ArrowRight,
  Check,
} from "lucide-react";

/* ─── Metadata ──────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Software Dental en Chile | Dentiqa - Gestion Integral para Clinicas",
  description:
    "Software odontologico mas completo de Chile. Agenda inteligente, ficha clinica digital, odontograma, WhatsApp con IA. Compatible con Fonasa e Isapre. Prueba gratis 14 dias.",
  keywords: [
    "software dental Chile",
    "software odontologico Chile",
    "turnos dentista Chile",
    "sistema de turnos odontologia Chile",
    "ficha clinica dental Chile",
    "odontograma digital Chile",
    "software para clinicas dentales Chile",
    "WhatsApp dentista Chile",
    "agenda dental Chile",
    "gestion clinica dental Chile",
    "software Fonasa Isapre dental",
  ],
  authors: [{ name: "Violet Wave IA" }],
  creator: "Violet Wave IA",
  publisher: "Violet Wave IA",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "https://dentiqa.app/cl",
    siteName: "Dentiqa",
    title: "Software Dental en Chile | Dentiqa",
    description:
      "El software dental mas completo para clinicas en Chile. WhatsApp con IA, agenda, odontograma y mas. Precios en pesos chilenos.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Dentiqa - Software Dental para Chile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Software Dental en Chile | Dentiqa",
    description:
      "Plataforma todo-en-uno para clinicas dentales en Chile con WhatsApp IA, agenda inteligente y mas.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://dentiqa.app/cl" },
};

/* ─── JSON-LD ───────────────────────────────────────────────────────────── */

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Dentiqa",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Software todo-en-uno para clinicas dentales en Chile con inteligencia artificial, WhatsApp integrado, agenda, ficha clinica digital y odontograma.",
  url: "https://dentiqa.app/cl",
  author: {
    "@type": "Organization",
    name: "Violet Wave IA",
    url: "https://dentiqa.app",
  },
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "79900",
    highPrice: "224900",
    priceCurrency: "CLP",
    offerCount: "3",
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Dentiqa - Software Dental Chile",
  description:
    "Proveedor de software de gestion integral para clinicas dentales en Chile.",
  url: "https://dentiqa.app/cl",
  areaServed: {
    "@type": "Country",
    name: "Chile",
  },
  brand: {
    "@type": "Brand",
    name: "Dentiqa",
  },
};

/* ─── Constants ─────────────────────────────────────────────────────────── */

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/registro`
    : process.env.NODE_ENV === "production"
      ? "https://dashboard.dentiqa.app/registro"
      : "http://localhost:3000/registro";

const features = [
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    description:
      "Gestiona citas con vista semanal y diaria, multi-dentista, drag-and-drop y sincronizacion con Google Calendar. Zona horaria Chile (GMT-4) configurada por defecto.",
  },
  {
    icon: Bot,
    title: "Chatbot WhatsApp con IA",
    description:
      "Tu asistente virtual atiende pacientes 24/7 por WhatsApp. Agenda citas, responde consultas y deriva a recepcion cuando es necesario.",
  },
  {
    icon: ClipboardList,
    title: "Ficha Clinica Digital",
    description:
      "Odontograma dual (frontal y oclusal), periodontograma, planes de tratamiento, evoluciones con firma digital y recetas. Todo en la nube.",
  },
  {
    icon: Users,
    title: "Gestion de Pacientes",
    description:
      "Ficha completa con 8 secciones: resumen, odontograma, periodontograma, planes de tratamiento, evoluciones, historia medica, imagenes y recetas.",
  },
  {
    icon: MessageSquare,
    title: "Inbox de Conversaciones",
    description:
      "Todas las conversaciones de WhatsApp en un solo lugar. Burbujas estilo WhatsApp Web, estado de entrega y toggle para activar o desactivar la IA.",
  },
  {
    icon: BarChart3,
    title: "Estadisticas y Reportes",
    description:
      "Dashboard con metricas de citas, ingresos, pacientes nuevos, tratamientos mas solicitados y rendimiento por profesional. Filtra y compara resultados.",
  },
  {
    icon: Shield,
    title: "Seguridad y Privacidad",
    description:
      "Encriptacion AES-256-GCM, tokens seguros, audit logs, roles y permisos por usuario. Los datos de tus pacientes siempre protegidos.",
  },
  {
    icon: Smartphone,
    title: "100% en la Nube",
    description:
      "Sin instalaciones, sin servidores propios. Accede desde el computador del consultorio, la tablet o tu celular. Funciona en cualquier navegador.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$79.900",
    currency: "CLP",
    period: "/mes",
    description: "Para consultas y clinicas pequenas",
    features: [
      "Hasta 5 usuarios",
      "2.000 mensajes WhatsApp/mes",
      "2.000 interacciones IA/mes",
      "Agenda inteligente",
      "Ficha clinica digital",
      "Soporte por email",
    ],
  },
  {
    name: "Professional",
    price: "$134.900",
    currency: "CLP",
    period: "/mes",
    description: "Para clinicas medianas",
    popular: true,
    features: [
      "Hasta 10 usuarios",
      "5.000 mensajes WhatsApp/mes",
      "5.000 interacciones IA/mes",
      "Todo lo de Starter",
      "Estadisticas avanzadas",
      "Soporte prioritario",
    ],
  },
  {
    name: "Enterprise",
    price: "$224.900",
    currency: "CLP",
    period: "/mes",
    description: "Para clinicas grandes y cadenas",
    features: [
      "Usuarios ilimitados",
      "10.000 mensajes WhatsApp/mes",
      "10.000 interacciones IA/mes",
      "Todo lo de Professional",
      "Campanas de marketing",
      "Soporte dedicado",
    ],
  },
];

/* ─── Page Component ────────────────────────────────────────────────────── */

export default function ChilePage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">DQ</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                Denti<span className="text-blue-600">qa</span>
              </span>
              <span className="text-[9px] text-gray-400 leading-none">
                by Violet Wave IA
              </span>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hidden sm:inline"
            >
              Inicio
            </a>
            <a
              href={APP_URL}
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Prueba gratis 14 dias
            </a>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
            <span className="inline-block bg-white/15 backdrop-blur-sm text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              Disenado para clinicas dentales en Chile
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto">
              El software dental mas completo para clinicas en Chile
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-10">
              Gestiona tu clinica dental con WhatsApp integrado, agenda
              inteligente y ficha clinica digital. Compatible con flujos de
              Fonasa e Isapre. Precios en pesos chilenos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={APP_URL}
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-base"
              >
                Prueba gratis 14 dias
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me/5492612312567?text=Hola%2C%20quiero%20info%20sobre%20Dentiqa%20para%20Chile"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-base"
              >
                Hablar por WhatsApp
              </a>
            </div>
            <p className="mt-6 text-sm text-blue-200">
              Sin tarjeta de credito -- Zona horaria Chile (GMT-4) -- Soporte en espanol
            </p>
          </div>
        </section>

        {/* WhatsApp Section */}
        <section className="bg-white py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                WhatsApp: el canal preferido en Chile
              </h2>
              <p className="text-lg text-gray-600">
                La mayoria de tus pacientes prefieren comunicarse por WhatsApp.
                Con Dentiqa, tu clinica cuenta con un chatbot con inteligencia
                artificial que atiende consultas, agenda citas y envia
                recordatorios automaticos. Todo integrado con tu numero de
                WhatsApp Business.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Chatbot 24/7
                </h3>
                <p className="text-gray-600 text-sm">
                  Tu asistente virtual responde consultas, informa horarios y
                  agenda citas mientras tu equipo descansa.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Recordatorios automaticos
                </h3>
                <p className="text-gray-600 text-sm">
                  Reduce las inasistencias con recordatorios 24 horas antes de
                  la cita, enviados por WhatsApp de forma automatica.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-violet-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Inbox unificado
                </h3>
                <p className="text-gray-600 text-sm">
                  Todas las conversaciones de WhatsApp en un panel tipo inbox.
                  Activa o desactiva la IA por paciente cuando quieras.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Todo lo que tu clinica necesita, en un solo lugar
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Dentiqa reemplaza multiples herramientas: CRM, software dental,
                agenda, WhatsApp Business y mas. Una plataforma, un precio.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-600">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Precios en pesos chilenos
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Sin sorpresas, sin costos ocultos. Todos los planes incluyen 14
                dias de prueba gratis.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-8 border ${
                    plan.popular
                      ? "border-blue-600 ring-2 ring-blue-600 shadow-lg relative"
                      : "border-gray-200 shadow-sm"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Mas elegido
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.description}
                  </p>
                  <div className="mt-6 mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {" "}
                      {plan.currency}
                      {plan.period}
                    </span>
                  </div>
                  <a
                    href={APP_URL}
                    className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                      plan.popular
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    Empezar gratis
                  </a>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-8">
              Precios aproximados en CLP. El monto exacto se calcula al momento
              de la suscripcion segun el tipo de cambio vigente.
            </p>
          </div>
        </section>

        {/* Testimonial Placeholder */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Clinicas en Chile ya confian en Dentiqa
            </h2>
            <blockquote className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <p className="text-lg text-gray-700 italic mb-4">
                &ldquo;Dentiqa nos permitio centralizar todo: agenda, fichas
                clinicas y la comunicacion con pacientes por WhatsApp. El chatbot
                con IA nos ahorra horas de trabajo diarias. Muy recomendable
                para clinicas en Chile.&rdquo;
              </p>
              <footer className="text-sm text-gray-500">
                -- Clinica dental en Santiago
              </footer>
            </blockquote>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-violet-600 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Digitaliza tu clinica dental hoy
            </h2>
            <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
              Unete a las clinicas chilenas que ya gestionan todo desde una sola
              plataforma. 14 dias gratis, sin compromiso.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={APP_URL}
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-base"
              >
                Crear cuenta gratis
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me/5492612312567?text=Hola%2C%20quiero%20info%20sobre%20Dentiqa%20para%20Chile"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-base"
              >
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <a href="/" className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">DQ</span>
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  Denti<span className="text-blue-400">qa</span>
                </span>
              </a>
              <p className="text-sm max-w-md">
                Dentiqa es un software de gestion integral para clinicas dentales
                en Chile. Agenda, ficha clinica, WhatsApp con IA y mas.
                Desarrollado por Violet Wave IA.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-8">
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">
                  Producto
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/" className="hover:text-white transition-colors">
                      Inicio
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#funcionalidades"
                      className="hover:text-white transition-colors"
                    >
                      Funcionalidades
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#precios"
                      className="hover:text-white transition-colors"
                    >
                      Precios
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="/legal/politica-de-privacidad"
                      className="hover:text-white transition-colors"
                    >
                      Politica de Privacidad
                    </a>
                  </li>
                  <li>
                    <a
                      href="/legal/terminos-de-servicio"
                      className="hover:text-white transition-colors"
                    >
                      Terminos de Servicio
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">
                  Paises
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="/ar"
                      className="hover:text-white transition-colors"
                    >
                      Argentina
                    </a>
                  </li>
                  <li>
                    <a
                      href="/co"
                      className="hover:text-white transition-colors"
                    >
                      Colombia
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            <p>
              &copy; {new Date().getFullYear()} Violet Wave IA. Todos los
              derechos reservados. Software dental para clinicas en Chile.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
