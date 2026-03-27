import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dentiqa — El software dental con IA para tu clínica",
  description:
    "Agenda, historial clínico, WhatsApp con chatbot IA, pipeline CRM, estadísticas y más. Todo en una sola plataforma. Probá gratis 14 días.",
  keywords: [
    "software dental",
    "gestión clínica dental",
    "CRM odontológico",
    "WhatsApp clínica dental",
    "chatbot dental",
    "agenda dental",
    "SaaS dental",
    "Dentiqa",
  ],
  openGraph: {
    title: "Dentiqa — El software dental con IA para tu clínica",
    description:
      "Agenda, historial clínico, WhatsApp con chatbot IA, pipeline CRM, estadísticas y más. Todo en una sola plataforma. Probá gratis 14 días.",
    type: "website",
    locale: "es_AR",
    url: "https://dentiqa.app",
    siteName: "Dentiqa",
  },
  robots: { index: true, follow: true },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
