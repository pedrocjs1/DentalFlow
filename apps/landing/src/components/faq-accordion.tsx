"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "¿Necesito conocimientos técnicos para usar DentalFlow?",
    a: "No. DentalFlow está diseñado para que cualquier odontólogo o recepcionista pueda usarlo sin capacitación técnica. La interfaz es intuitiva y ofrecemos soporte por WhatsApp para ayudarte en cada paso.",
  },
  {
    q: "¿Cómo conecto mi WhatsApp?",
    a: "Usamos la API oficial de WhatsApp Business de Meta. En pocos clics conectás el número de tu clínica desde el panel de configuración. No necesitás un teléfono dedicado ni compartir tu WhatsApp personal.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Absolutamente. Usamos encriptación AES-256-GCM para todos los datos sensibles, base de datos PostgreSQL con backups automáticos y cumplimos con las mejores prácticas de seguridad de la industria.",
  },
  {
    q: "¿Puedo migrar desde otra herramienta?",
    a: "Sí. Nuestro equipo te ayuda a migrar tus pacientes, historial y datos desde Kommo, Dentalink, Excel o cualquier otra herramienta que uses actualmente. La migración está incluida en todos los planes.",
  },
  {
    q: "¿Hay período de prueba?",
    a: "Sí, ofrecemos 14 días de prueba gratuita con todas las funcionalidades del plan Pro. No necesitás tarjeta de crédito para empezar.",
  },
  {
    q: "¿Funciona en mi país?",
    a: "DentalFlow funciona en toda Latinoamérica. Soportamos múltiples zonas horarias, monedas locales y el formato de WhatsApp de cada país. Ya tenemos clínicas en Argentina, Chile, Colombia, México y Perú.",
  },
  {
    q: "¿Qué pasa si supero los límites del plan?",
    a: "Te avisamos cuando estés cerca del límite. Podés actualizar tu plan en cualquier momento desde la configuración. Nunca se corta el servicio sin previo aviso.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí. No hay contratos de permanencia ni penalidades por cancelación. Podés cancelar tu suscripción en cualquier momento y seguirás teniendo acceso hasta el final del período facturado.",
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
