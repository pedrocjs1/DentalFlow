import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://dentiqa.app"),
  title: "Dentiqa | Software para Clínicas Dentales con IA y WhatsApp",
  description:
    "Plataforma todo-en-uno para clínicas dentales: agenda inteligente, historia clínica digital, odontograma, WhatsApp con IA, pipeline comercial y más. Probá gratis 14 días.",
  keywords: [
    "software dental", "software odontológico", "software para clínicas dentales",
    "software para dentistas", "gestión clínica dental", "historia clínica dental",
    "odontograma digital", "agenda dental", "turnos dentista",
    "WhatsApp para dentistas", "chatbot dental", "CRM dental",
    "software dental Argentina", "software dental Latinoamérica",
    "software dental con inteligencia artificial",
    "periodontograma digital", "ficha dental digital",
    "sistema de turnos odontología", "recordatorio de turnos dental",
    "software dental en la nube", "SaaS dental",
  ],
  authors: [{ name: "Violet Wave IA" }],
  creator: "Violet Wave IA",
  publisher: "Violet Wave IA",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://dentiqa.app",
    siteName: "Dentiqa",
    title: "Dentiqa | Software para Clínicas Dentales con IA y WhatsApp",
    description:
      "Plataforma todo-en-uno para clínicas dentales: agenda inteligente, historia clínica digital, odontograma, WhatsApp con IA, pipeline comercial y más.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Dentiqa - Software Dental con IA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dentiqa | Software para Clínicas Dentales con IA",
    description:
      "Plataforma todo-en-uno para clínicas dentales con WhatsApp IA, agenda inteligente y más.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
  alternates: { canonical: "https://dentiqa.app" },
};

// ─── JSON-LD Structured Data ─────────────────────────────────────────────────

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Dentiqa",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Software todo-en-uno para clínicas dentales con inteligencia artificial, WhatsApp integrado, agenda, historia clínica digital, odontograma y CRM.",
  url: "https://dentiqa.app",
  author: { "@type": "Organization", name: "Violet Wave IA", url: "https://dentiqa.app" },
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "89",
    highPrice: "249",
    priceCurrency: "USD",
    offerCount: "3",
  },
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "47" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "¿Qué necesito para empezar?", acceptedAnswer: { "@type": "Answer", text: "Sólo un email y un número de WhatsApp Business. Te registrás, conectás tu WhatsApp en pocos clics, y empezás a usar Dentiqa. Sin instalaciones, sin hardware especial." } },
    { "@type": "Question", name: "¿Funciona en mi país?", acceptedAnswer: { "@type": "Answer", text: "Sí, Dentiqa funciona en toda Latinoamérica. Soportamos múltiples zonas horarias y formatos locales." } },
    { "@type": "Question", name: "¿Puedo migrar mis datos desde otro software?", acceptedAnswer: { "@type": "Answer", text: "Sí. Podemos importar tus pacientes desde un archivo CSV/Excel. Nuestro equipo te ayuda a migrar desde Kommo, Dentalink, o cualquier herramienta que uses actualmente." } },
    { "@type": "Question", name: "¿Es seguro?", acceptedAnswer: { "@type": "Answer", text: "Muy seguro. Usamos encriptación AES-256-GCM para todos los datos sensibles, tokens encriptados, audit logs de seguridad y base de datos PostgreSQL con respaldos automáticos." } },
    { "@type": "Question", name: "¿Qué pasa después de los 14 días gratis?", acceptedAnswer: { "@type": "Answer", text: "Elegís un plan y pagás con Mercado Pago. Si no te convence, cancelás sin costo. Nunca se bloquea el acceso a tus datos." } },
    { "@type": "Question", name: "¿Necesito instalar algo?", acceptedAnswer: { "@type": "Answer", text: "No. Dentiqa funciona 100% en el navegador, en cualquier dispositivo — computadora, tablet o celular." } },
    { "@type": "Question", name: "¿Puedo usar Dentiqa sin el chatbot de WhatsApp?", acceptedAnswer: { "@type": "Answer", text: "Sí. El chatbot es una funcionalidad que podés activar o desactivar. El resto del sistema funciona independientemente." } },
    { "@type": "Question", name: "¿Ofrecen soporte?", acceptedAnswer: { "@type": "Answer", text: "Sí, por WhatsApp y email. Los planes Professional y Enterprise tienen soporte prioritario." } },
  ],
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
