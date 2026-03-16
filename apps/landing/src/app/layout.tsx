import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DentalFlow — Tu clínica dental, una sola plataforma",
  description:
    "Agenda, CRM, WhatsApp, chatbot IA y campañas de marketing para clínicas dentales en Latinoamérica. Reemplazá Kommo + Dentalink con DentalFlow.",
  keywords: [
    "software dental",
    "gestión clínica dental",
    "CRM odontológico",
    "WhatsApp clínica dental",
    "chatbot dental",
    "agenda dental",
    "SaaS dental",
  ],
  openGraph: {
    title: "DentalFlow — Tu clínica dental, una sola plataforma",
    description:
      "Agenda, CRM, WhatsApp, chatbot IA y campañas. Todo lo que necesitás para gestionar y hacer crecer tu clínica dental.",
    type: "website",
    locale: "es_AR",
    siteName: "DentalFlow",
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
