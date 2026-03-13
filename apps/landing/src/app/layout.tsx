import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DentalFlow — El SaaS todo-en-uno para tu clínica dental",
  description:
    "Reemplaza Kommo CRM + Dentalink con una sola plataforma. Chatbot IA por WhatsApp, agenda, CRM y campañas automáticas.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
