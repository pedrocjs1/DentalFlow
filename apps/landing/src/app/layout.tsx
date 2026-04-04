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

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Dentiqa",
  url: "https://dentiqa.app",
  logo: "https://dentiqa.app/favicon.svg",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    email: "hola@dentiqa.app",
    contactType: "sales",
    availableLanguage: "Spanish",
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="privacy-policy" href="https://dentiqa.app/legal/politica-de-privacidad" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
