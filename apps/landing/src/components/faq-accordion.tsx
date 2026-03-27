"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "¿Qué necesito para empezar?",
    a: "Sólo un email y un número de WhatsApp Business. Te registrás, conectás tu WhatsApp en pocos clics, y empezás a usar Dentiqa. Sin instalaciones, sin hardware especial.",
  },
  {
    q: "¿Funciona en mi país?",
    a: "Sí, Dentiqa funciona en toda Latinoamérica. Los precios están en ARS pero aceptamos pagos de cualquier país vía Mercado Pago. Soportamos múltiples zonas horarias y formatos locales.",
  },
  {
    q: "¿Puedo migrar mis datos desde otro software?",
    a: "Sí. Podemos importar tus pacientes desde un archivo CSV/Excel. Nuestro equipo te ayuda a migrar desde Kommo, Dentalink, o cualquier herramienta que uses actualmente. La migración está incluida.",
  },
  {
    q: "¿Es seguro?",
    a: "Muy seguro. Usamos encriptación AES-256-GCM para todos los datos sensibles, tokens encriptados, audit logs de seguridad, protección anti prompt-injection en la IA, y validación de archivos. Base de datos PostgreSQL con respaldos automáticos.",
  },
  {
    q: "¿Qué pasa después de los 14 días gratis?",
    a: "Elegís un plan y pagás con Mercado Pago. Si no te convence, cancelás sin costo. Nunca se bloquea el acceso a tus datos — te avisamos antes de que venza el período.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Dentiqa funciona 100% en el navegador, en cualquier dispositivo — computadora, tablet o celular. No hay apps que instalar ni software que actualizar.",
  },
  {
    q: "¿Puedo usar Dentiqa sin el chatbot de WhatsApp?",
    a: "Sí. El chatbot es una funcionalidad que podés activar o desactivar desde la configuración. El resto del sistema (agenda, historial clínico, pipeline, estadísticas) funciona independientemente.",
  },
  {
    q: "¿Ofrecen soporte?",
    a: "Sí, por WhatsApp y email. Los planes Professional y Enterprise tienen soporte prioritario. Además, tenés documentación completa y un equipo que te acompaña en el onboarding.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQS.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-sm transition-shadow"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? "max-h-96 pb-4" : "max-h-0"
              }`}
            >
              <p className="px-6 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
